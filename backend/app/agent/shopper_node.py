from typing import Annotated, List, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, ToolMessage
from langsmith import traceable
import json
import ast

from ..schemas.graphSchemas import ShoppingGraphState
from ..schemas.apiSchemas import CartItem
from langchain_core.tools import tool
from .prompts import SHOPPER_PROMPT

@tool
@traceable(run_type="tool", name="agent_add_to_cart")
def agent_add_to_cart(product_id: str, title: str, price: float, quantity: int = 1) -> str:
    """Adds a specific product to the user's shopping cart."""
    return json.dumps({
        "product_id": product_id,
        "title": title,
        "price": price,
        "quantity": quantity
    })


@traceable(run_type="chain", name="execute_kapruka_tools")
async def execute_mcp_tools(tool_calls: List[Dict], tool_map: Dict) -> List[ToolMessage]:
    """Executes requested tools and returns the resulting ToolMessages."""
    executed_messages = []
    
    for tool_call in tool_calls:
        tool = tool_map[tool_call["name"]]
        
        # This individual tool call is auto-traced, but now it will be nested 
        # neatly under the "execute_kapruka_tools" span in LangSmith!
        result = await tool.ainvoke(tool_call["args"])

        executed_messages.append(
            ToolMessage(
                content=str(result),
                tool_call_id=tool_call["id"]
            )
        )
    return executed_messages



async def shopper_node(state: ShoppingGraphState) -> Dict[str, Any]:
    """The Catalog Expert. Uses Kapruka search/browse tools to update the state with inventory data."""
    
    # Initialize the connection to the Kapruka MCP Server
    client = MultiServerMCPClient(
        {
            "kapruka": {
                "transport": "http",
                "url": "https://mcp.kapruka.com/mcp",
            }
        }
    )
    
    async with client.session("kapruka") as session:
        # Fetch all tools from the session
        all_tools = await load_mcp_tools(session)
        
        # Filter down to ONLY the catalog tools this agent is authorized to use
        allowed_tool_names = ["kapruka_search_products", "kapruka_list_categories", "kapruka_get_product"]
        shopper_tools = [t for t in all_tools if t.name in allowed_tool_names]
        shopper_tools.append(agent_add_to_cart)
        
        # Set up the specialized LLM for the Shopper
        # We use a lower temperature (0.0) here to ensure precise tool parameter extraction
        model = ChatOpenAI(model="gpt-4o", temperature=0.0)
        
        # Bind the localized tools to this agent
        model_with_tools = model.bind_tools(shopper_tools)
        
        # Assemble the message history for context
        summary = state.get("summary", "")
        enriched_prompt = SHOPPER_PROMPT
        if summary:
            enriched_prompt += f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{summary}"

        # Inject the structural state so the Shopper knows exactly what is on the user's screen
        if state.get("search_results"):
            results = state["search_results"].get("results", [])
            simplified_results = [{"name": r.get("name"), "id": r.get("id")} for r in results[:10]]
            enriched_prompt += f"\n\n[CURRENT SEARCH RESULTS ON USER SCREEN]\n{simplified_results}"
            
        if state.get("current_product_details"):
            details = state["current_product_details"]
            simplified_details = {"name": details.get("name"), "id": details.get("id")}
            enriched_prompt += f"\n\n[CURRENT PRODUCT DETAILS ON USER SCREEN]\n{simplified_details}"
            
        system_message = {"role": "system", "content": enriched_prompt}
        messages_history = [system_message] + state["messages"]
        
        # Invoke the model to execute the required tool calls
        response = await model_with_tools.ainvoke(messages_history)

        messages = [response]

        # Base updates to return
        state_updates = {
            "messages": messages,
            "next_agent": "concierge" # Hand control back to the Concierge node
        }

        # Call your traceable helper function
        if response.tool_calls:
            tool_map = {tool.name: tool for tool in shopper_tools}
            tool_messages = await execute_mcp_tools(response.tool_calls, tool_map)
            messages.extend(tool_messages)

            # --- NEW: Programmatic State Extraction ---
            # Zip tool_calls and tool_messages to map the output back to the specific tool
            for tool_call, tool_msg in zip(response.tool_calls, tool_messages):
                try:

                    content = tool_msg.content
                    json_str = ""
                    # print("*"*60)
                    # print(f"content {content}")

                    # Case 1: LangChain passed it as a Python list in memory
                    if isinstance(content, list) and len(content) > 0 and "text" in content[0]:
                        json_str = content[0]["text"]
  

                
                    # Case 2: It's a stringified Python list (starts with "[{")
                    elif isinstance(content, str) and content.strip().startswith("[{"):
                        # ast.literal_eval safely converts the string "[{'type': 'text'...}]" back into a Python list
                        parsed_list = ast.literal_eval(content)
                        json_str = parsed_list[0]["text"]
                
                    # Case 3: It's already just the pure JSON string
                    elif isinstance(content, str):
                        json_str = content

                    # print("*"*60)
                    # print(f"json_str {json_str}")

                    # Now parse the unwrapped pure JSON string!
                    parsed_data = json.loads(json_str)
                    
                    # Route the structured data to the correct state variable
                    if tool_call["name"] == "kapruka_search_products":
                        state_updates["search_results"] = parsed_data
                        # Tell frontend to render a list of products
                        state_updates["active_view"] = {
                            "type": "RENDER_PRODUCT_LIST",
                            "data": parsed_data.get("results", [])
                        }
                    
                    elif tool_call["name"] == "kapruka_get_product":
                        state_updates["current_product_details"] = parsed_data
                        # Tell frontend to render a single detailed product view
                        state_updates["active_view"] = {
                            "type": "RENDER_PRODUCT_DETAIL",
                            "data": parsed_data
                        }
                    
                    elif tool_call["name"] == "kapruka_list_categories":
                        state_updates["categories_cache"] = parsed_data
                        # Tell frontend to render the category grid
                        state_updates["active_view"] = {
                            "type": "RENDER_CATEGORY_GRID",
                            "data": parsed_data.get("categories", [])
                        }

                    elif tool_call["name"] == "agent_add_to_cart":
                        current_cart = state.get("cart", [])
                        
                        # Use dicts to prevent serialization errors in LangGraph Checkpointer
                        new_item_dict = CartItem(**parsed_data).model_dump()
                        
                        # Add to a new array to ensure state is cleanly updated
                        updated_cart = current_cart.copy()
                        updated_cart.append(new_item_dict)
                        
                        state_updates["cart"] = updated_cart
                        
                        state_updates["active_view"] = {
                            "type": "RENDER_CART",
                            "data": updated_cart
                        }
                    
                    # NEW: Create a censored version of the tool message to prevent LLM omniscience
                    censored_msg = ToolMessage(
                        content=f"[System Note: Successfully executed {tool_call['name']}. The raw JSON data has been hidden from conversation history to preserve context and enforce routing. The structural UI state has been updated.]",
                        tool_call_id=tool_call["id"]
                    )
                    
                    # Safely replace the original bloated message in the list
                    msg_idx = messages.index(tool_msg)
                    messages[msg_idx] = censored_msg
                
                except Exception as e:
                    # Fallback: If the tool returned an error string or markdown instead of JSON,
                    # we just skip updating the structural state and let the LLM read the text 
                    # from the conversational history.
                    print(f"Warning: Could not parse or process {tool_call['name']}. Error: {str(e)}")
                    continue
        
        # Update the state: Append the agent's response and reset next_agent back to concierge
        return state_updates