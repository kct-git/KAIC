from typing import Annotated, List, Dict, Any
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langchain_core.messages import AnyMessage, ToolMessage

from ..schemas.graphSchemas import ShoppingGraphState
from .prompts import CONCIERGE_PROMPT

# Force the LLM to output a clean routing decision
class RouteTo(BaseModel):
    """Route the conversation to the appropriate specialized department."""
    department: str = Field(
        description="The department to route to. Must be either 'shopper' or 'logistics'."
    )

async def concierge_node(state: ShoppingGraphState) -> Dict[str, Any]:
    """The entry point router. Parses user intent and updates the next structural step."""

    # print("\n=== State Verification ===")
    
    # # Check if categories were cached
    # categories = state.get("categories_cache")
    # print(f"📦 Categories Cache: {'Loaded' if categories else 'Empty'}")
    
    # # Check search results
    # search_data = state.get("search_results")
    # if search_data:
    #     results_count = len(search_data.get("results", []))
    #     print(f"🔍 Search Results: Found {results_count} items")
    #     print(f"➡️ Next Cursor: {search_data.get('next_cursor')}")
    # else:
    #     print("🔍 Search Results: Empty")
        
    # print("=========================\n")

    # # product details
    # search_data = state.get("current_product_details")
    # if search_data:
    #     print("="*80)
    #     print(f"Searched data {search_data}")
    # else:
    #     print("no search data found")


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