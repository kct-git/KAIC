from typing import Annotated, List, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, ToolMessage

from ..schemas.graphSchemas import ShoppingGraphState
from .prompts import LOGISTICS_PROMPT





async def logistics_node(state: ShoppingGraphState) -> Dict[str, Any]:
    """The Checkout Closer. Manages shipping quotes, address confirmation, and checkout actions."""
    
    # 1. Initialize the connection wrapper
    client = MultiServerMCPClient(
        {
            "kapruka": {
                "transport": "http",
                "url": "https://mcp.kapruka.com/mcp",
            }
        }
    )
    
    async with client.session("kapruka") as session:
        # 2. Extract tools bound to the active network session
        all_tools = await load_mcp_tools(session)
        
        # 3. Filter down to ONLY logistics & transactional tools
        allowed_tool_names = ["kapruka_list_delivery_cities", "kapruka_create_order", "kapruka_track_order", "kapruka_check_delivery"]
        logistics_tools = [t for t in all_tools if t.name in allowed_tool_names]
        
        # 4. Set up the deterministic model instance
        model = ChatOpenAI(model="gpt-4o", temperature=0.0)
        model_with_tools = model.bind_tools(logistics_tools)
        
        # 5. Clean up history to prevent lingering tool conflicts from prior routing stages
        cleaned_messages = []
        for msg in state["messages"]:
            if hasattr(msg, "tool_calls") and msg.tool_calls and any(tc["name"] == "RouteTo" for tc in msg.tool_calls):
                continue
            if isinstance(msg, ToolMessage) and msg.content.startswith("Successfully routed"):
                continue
            cleaned_messages.append(msg)
            
        messages_history = [{"role": "system", "content": LOGISTICS_PROMPT}] + cleaned_messages
        
        # 6. Invoke model
        response = model_with_tools.invoke(messages_history)
        messages = [response]
        
        # 7. Execute logistics tools sequentially if requested by the LLM
        if response.tool_calls:
            tool_map = {tool.name: tool for tool in logistics_tools}
            
            for tool_call in response.tool_calls:
                tool = tool_map[tool_call["name"]]
                
                # Execute tool over live session
                result = await tool.ainvoke(tool_call["args"])
                
                messages.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"]
                    )
                )
        
        # 8. Return control back to the Concierge face node
        return {
            "messages": messages,
            "next_agent": "concierge"
        }