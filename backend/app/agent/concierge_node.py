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

    # Initialize the model (using gpt-4o as planned)
    model = ChatOpenAI(model="gpt-4o", temperature=0.2)
    
    # Bind the routing tool so the model can signal a handoff
    model_with_tools = model.bind_tools([RouteTo])

    # Safely extract the semantic and episodic context fetched by your read node
    semantic_context = state.get("semantic_context", "")
    episodic_context = state.get("episodic_context", "")
    summary = state.get("summary", "")

    # Construct the enriched system prompt
    enriched_prompt = CONCIERGE_PROMPT
    if summary:
        enriched_prompt += f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{summary}"
    if semantic_context:
        enriched_prompt += f"\n\n[IMPORTANT: LONG-TERM USER FACTS & HISTORY]\n{semantic_context}"
    if episodic_context:
        enriched_prompt += f"\n\n[IMPORTANT: PAST USER EPISODES]\n{episodic_context}"
        
    if state.get("active_view"):
        enriched_prompt += "\n\n[CRITICAL UI INSTRUCTION]\nThe user is CURRENTLY looking at a rich visual UI displaying the products or data that was just fetched. DO NOT output a markdown list of the items. Just say a brief, friendly conversational summary (e.g., 'Here are some options I found for you! Feel free to click on any of them to learn more.') and stop."
    
    # Formulate messages context including our system rules
    system_message = {"role": "system", "content": enriched_prompt}
    messages_history = [system_message] + state["messages"]
    
    # Invoke the model
    response = await model_with_tools.ainvoke(messages_history)
    
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