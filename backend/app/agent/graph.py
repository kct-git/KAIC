from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage, ToolMessage
from langgraph.graph.message import add_messages

from langgraph.graph import StateGraph, START, END
from langchain.messages import HumanMessage

from prompts import CONCIERGE_PROMPT, SHOPPER_PROMPT
from dotenv import load_dotenv
import asyncio

load_dotenv()

from pydantic import BaseModel, Field
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_openai import ChatOpenAI

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools


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


def route_after_concierge(state: ShoppingGraphState) -> str:
    """Evaluates the state flag to decide the next graph edge to transverse."""
    next_step = state.get("next_agent", "__end__")
    
    if next_step == "shopper":
        return "shopper_node"
    elif next_step == "logistics":
        return "logistics_node"
    
    return "__end__"


if __name__ == "__main__":
    agent_builder = StateGraph(ShoppingGraphState)

    # Add nodes
    agent_builder.add_node("concierge_node", concierge_node)
    agent_builder.add_node("shopper_node", shopper_node)

    # Add edges to connect nodes
    agent_builder.add_edge(START, "concierge_node")
    agent_builder.add_conditional_edges(
        "concierge_node",
        route_after_concierge,
        ["shopper_node", END]
    )
    agent_builder.add_edge("shopper_node", "concierge_node")

    # Compile the agent
    agent = agent_builder.compile()

    async def main():
        # Invoke
        messages = [HumanMessage(content="what are the products categories does kapruka have")]
        messages = await agent.ainvoke({"messages": messages})
        for m in messages["messages"]:
            m.pretty_print()   

    # Execute the async main function
    asyncio.run(main())     

