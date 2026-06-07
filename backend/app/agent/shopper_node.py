from typing import Annotated, List, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, ToolMessage

from ..schemas.graphSchemas import ShoppingGraphState
from .prompts import SHOPPER_PROMPT

async def shopper_node(state: ShoppingGraphState) -> Dict[str, Any]:
    """The Catalog Expert. Uses Kapruka search/browse tools to update the state with inventory data."""
    
    # 1. Initialize the connection to the Kapruka MCP Server
    client = MultiServerMCPClient(
        {
            "kapruka": {
                "transport": "http",
                "url": "https://mcp.kapruka.com/mcp",
            }
        }
    )
    
    async with client.session("kapruka") as session:
        # 2. Fetch all tools from the session
        all_tools = await load_mcp_tools(session)
        
        # 3. Filter down to ONLY the catalog tools this agent is authorized to use
        # (Replace these names with Kapruka's exact tool names from your client.list_tools() output)
        allowed_tool_names = ["kapruka_search_products", "kapruka_list_categories", "kapruka_get_product"]
        shopper_tools = [t for t in all_tools if t.name in allowed_tool_names]
        
        # 4. Set up the specialized LLM for the Shopper
        # We use a lower temperature (0.0) here to ensure precise tool parameter extraction
        model = ChatOpenAI(model="gpt-4o", temperature=0.0)
        
        # Bind the localized tools to this agent
        model_with_tools = model.bind_tools(shopper_tools)
        
        # Assemble the message history for context
        system_message = {"role": "system", "content": SHOPPER_PROMPT}
        messages_history = [system_message] + state["messages"]
        
        # 5. Invoke the model to execute the required tool calls
        response = model_with_tools.invoke(messages_history)

        messages = [response]

        if response.tool_calls:
            tool_map = {tool.name: tool for tool in shopper_tools}

        for tool_call in response.tool_calls:
            tool = tool_map[tool_call["name"]]

            result = await tool.ainvoke(tool_call["args"])

            messages.append(
                ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call["id"]
                )
            )
        
        # 6. Execute the tool if the LLM requests it
        # LangChain handles the mapping under the hood when tools are invoked via the agent framework
        # If the model produced tool calls, execute them here or let a tool node handle it.
        # For simplicity within a standalone node, we let the model output its formatted text response
        
        # Update the state: Append the agent's response and reset next_agent back to concierge
        return {
            "messages": messages,
            "next_agent": "concierge" # Hand control back to the Concierge node
        }