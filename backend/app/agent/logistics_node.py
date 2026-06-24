from typing import Annotated, List, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, ToolMessage
import ast
import json

from ..schemas.graphSchemas import ShoppingGraphState
from .prompts import LOGISTICS_PROMPT
from langsmith import traceable


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
            
        summary = state.get("summary", "")
        enriched_prompt = LOGISTICS_PROMPT
        if summary:
            enriched_prompt += f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{summary}"
            
        if state.get("cart"):
            cart_str = json.dumps(state["cart"], indent=2)
            enriched_prompt += f"\n\n[CURRENT SHOPPING CART]\nThe user currently has these items in their cart:\n{cart_str}\n\nCRITICAL: You MUST use these EXACT items and quantities when calling the `kapruka_create_order` tool. Do not guess or rely on conversation history for cart contents."
            
        messages_history = [{"role": "system", "content": enriched_prompt}] + state["messages"]
        
        # Invoke model
        response = model_with_tools.invoke(messages_history)
        messages = [response]

        # Base updates to return
        state_updates = {
            "messages": messages,
            "next_agent": "concierge" # Hand control back to the Concierge node
        }

        # Call your traceable helper function
        if response.tool_calls:
            tool_map = {tool.name: tool for tool in logistics_tools}
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
                        # print("*"*60)
                        # print(f"json_str {json_str}")

                
                    # Case 2: It's a stringified Python list (starts with "[{")
                    elif isinstance(content, str) and content.strip().startswith("[{"):
                        # ast.literal_eval safely converts the string "[{'type': 'text'...}]" back into a Python list
                        parsed_list = ast.literal_eval(content)
                        json_str = parsed_list[0]["text"]
                
                    # Case 3: It's already just the pure JSON string
                    elif isinstance(content, str):
                        json_str = content

                    print("*"*60)
                    print(f"json_str {json_str}")
                    print("*"*60)

                    # Now parse the unwrapped pure JSON string!
                    parsed_data = json.loads(json_str)

                    print("*"*60)
                    print(f"parse_data {parsed_data}")
                    print("*"*60)
                    
                    # Route the structured data to the correct state variable
                    if tool_call["name"] == "kapruka_list_delivery_cities":
                        state_updates["search_results"] = parsed_data
                        # Tell frontend to render a list of products
                        state_updates["active_view"] = {
                            "type": "RENDER_DELIVERY_CITIES_LIST",
                            "data": parsed_data
                        }
                    
                    elif tool_call["name"] == "kapruka_check_delivery":    # output json
                        state_updates["current_product_details"] = parsed_data
                        # Tell frontend to render a single detailed product view
                        state_updates["active_view"] = {
                            "type": "RENDER_CHECK_DELIVERY",
                            "data": parsed_data 
                        }
                    
                    elif tool_call["name"] == "kapruka_create_order":
                        state_updates["categories_cache"] = parsed_data
                        # Tell frontend to render the category grid
                        state_updates["active_view"] = {
                            "type": "RENDER_CREATE_ORDER",
                            "data": parsed_data
                        }

                    elif tool_call["name"] == "kapruka_track_order":
                        state_updates["categories_cache"] = parsed_data
                        # Tell frontend to render the category grid
                        state_updates["active_view"] = {
                            "type": "RENDER_TRACK_ORDER",
                            "data": parsed_data
                        }
                        
                    # NEW: Create a censored version of the tool message to prevent LLM omniscience
                    censored_msg = ToolMessage(
                        content=f"[System Note: Successfully executed {tool_call['name']}. The raw JSON data has been hidden from conversation history to preserve context and enforce routing. The structural UI state has been updated.]",
                        tool_call_id=tool_call["id"]
                    )
                    
                    # Safely replace the original bloated message in the list
                    msg_idx = messages.index(tool_msg)
                    messages[msg_idx] = censored_msg
                
                except json.JSONDecodeError:
                    # Fallback: If the tool returned an error string or markdown instead of JSON,
                    # we just skip updating the structural state and let the LLM read the text 
                    # from the conversational history.
                    print(f"Warning: Could not parse JSON from {tool_call['name']}")
                    continue
        
        # Update the state: Append the agent's response and reset next_agent back to concierge
        return state_updates