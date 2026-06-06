from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage, ToolMessage
from langgraph.graph.message import add_messages

from langgraph.graph import StateGraph, START, END
from langchain.messages import HumanMessage

from prompts import CONCIERGE_PROMPT, SHOPPER_PROMPT, LOGISTICS_PROMPT
from dotenv import load_dotenv
import asyncio

load_dotenv()

from pydantic import BaseModel, Field
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_openai import ChatOpenAI

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
PNG_PATH = ROOT / "artifacts" / "graph.png"


class ShoppingGraphState(TypedDict):
    # Tracks the full chat conversation
    messages: Annotated[List[AnyMessage], add_messages]
    
    # E-commerce state shared across agents
    cart: List[Dict[str, Any]]
    delivery_info: Dict[str, Any]
    order_details: Dict[str, Any]
    
    # Routing state to know which agent currently holds control
    next_agent: str


# Force the LLM to output a clean routing decision
class RouteTo(BaseModel):
    """Route the conversation to the appropriate specialized department."""
    department: str = Field(
        description="The department to route to. Must be either 'shopper' or 'logistics'."
    )


async def concierge_node(state: ShoppingGraphState) -> Dict[str, Any]:
    """The entry point router. Parses user intent and updates the next structural step."""
    
    # Initialize the model (using gpt-4o as planned)
    model = ChatOpenAI(model="gpt-4o", temperature=0.2)
    
    # Bind the routing tool so the model can signal a handoff
    model_with_tools = model.bind_tools([RouteTo])
    
    # Formulate messages context including our system rules
    system_message = {"role": "system", "content": CONCIERGE_PROMPT}
    messages_history = [system_message] + state["messages"]
    
    # Invoke the model
    response = model_with_tools.invoke(messages_history)
    
    # Check if the model decided to route to another department
    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call["name"] == "RouteTo":
            destination = tool_call["args"]["department"]

            # Create a mock tool response to satisfy OpenAI's history requirements
            routing_ack_message = ToolMessage(
                content=f"Successfully routed to {destination} department.",
                tool_call_id=tool_call["id"]
            )
            
            # Update the state to indicate the handoff
            return {
                "messages": [response, routing_ack_message],
                "next_agent": destination
            }
            
    # If no tool call was made, the Concierge is just chatting/responding directly
    return {
        "messages": [response],
        "next_agent": "__end__"
    }


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


def route_after_concierge(state: ShoppingGraphState) -> str:
    """Evaluates the state flag to decide the next graph edge to transverse."""
    next_step = state.get("next_agent", "__end__")
    
    if next_step == "shopper":
        return "shopper_node"
    elif next_step == "logistics":
        return "logistics_node"
    
    return "__end__"


if __name__ == "__main__":
    # 1. Initialize the Graph with the State structure
    agent_builder = StateGraph(ShoppingGraphState)

    # 2. Register all specialized nodes
    agent_builder.add_node("concierge_node", concierge_node)
    agent_builder.add_node("shopper_node", shopper_node)
    agent_builder.add_node("logistics_node", logistics_node)

    # 3. Define the structural edges
    agent_builder.add_edge(START, "concierge_node")
    
    # Maps the router string directly to the registered nodes
    agent_builder.add_conditional_edges(
        "concierge_node",
        route_after_concierge,
        {
            "shopper_node": "shopper_node",
            "logistics_node": "logistics_node",
            "__end__": END
        }
    )
    
    # Loopback edges returning control back to the entry face
    agent_builder.add_edge("shopper_node", "concierge_node")
    agent_builder.add_edge("logistics_node", "concierge_node")

    # 4. Compile the graph topology into an executable runnable
    agent = agent_builder.compile()

    png_bytes = agent.get_graph().draw_mermaid_png()

    with open("graph.png", "wb") as f:
        f.write(png_bytes)


    # 5. Execution block
    async def main():
        initial_messages = [HumanMessage(content="do you deliver items to dambulla")]
        
        # Safe Initialization: Initialize empty structures for fields defined in your TypedDict 
        # to prevent nodes from hitting unexpected KeyErrors down the line.
        initial_state = {
            "messages": initial_messages,
            "cart": [],
            "delivery_info": {},
            "order_details": {},
            "next_agent": ""
        }
        
        print("Invoking multi-agent graph loop...")
        final_state = await agent.ainvoke(initial_state)
        
        print("\n=== Full Execution Conversation History ===")
        for message in final_state["messages"]:
            message.pretty_print()   

    # Execute the async engine loop
    asyncio.run(main())    

