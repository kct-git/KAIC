from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

from langgraph.graph import StateGraph, START, END
from langchain.messages import HumanMessage

from prompts import CONCIERGE_PROMPT
from dotenv import load_dotenv
import asyncio

load_dotenv()

from pydantic import BaseModel, Field
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_openai import ChatOpenAI


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
            
            # Update the state to indicate the handoff
            return {
                "messages": [response],
                "next_agent": destination
            }
            
    # If no tool call was made, the Concierge is just chatting/responding directly
    return {
        "messages": [response],
        "next_agent": "__end__"
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

    # Add edges to connect nodes
    agent_builder.add_edge(START, "concierge_node")
    agent_builder.add_edge("concierge_node", END)

    # Compile the agent
    agent = agent_builder.compile()

    async def main():
        # Invoke
        messages = [HumanMessage(content="can i know what is the status my order")]
        messages = await agent.ainvoke({"messages": messages})
        for m in messages["messages"]:
            m.pretty_print()   

    # Execute the async main function
    asyncio.run(main())     

