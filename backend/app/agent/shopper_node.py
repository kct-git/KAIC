from typing import Annotated, List, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, ToolMessage
from langsmith import traceable
import json
import ast
import httpx

from ..schemas.graphSchemas import ShoppingGraphState
from ..schemas.apiSchemas import CartItem
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from .prompts import SHOPPER_PROMPT

@tool
@traceable(run_type="tool", name="agent_add_to_cart")
def agent_add_to_cart(product_id: str, title: str, price: float, image: str = None, quantity: int = 1) -> str:
    """Adds a specific product to the user's shopping cart. Extract the image URL if available from the product details or search results."""
    return json.dumps({
        "product_id": product_id,
        "title": title,
        "price": price,
        "image": image,
        "quantity": quantity
    })

@tool
@traceable(run_type="tool", name="agent_remove_from_cart")
def agent_remove_from_cart(product_id: str) -> str:
    """Removes or decreases the quantity of a specific product from the user's shopping cart."""
    return json.dumps({
        "action": "remove",
        "product_id": product_id
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

@traceable(run_type="chain", name="prepare_agent_prompt")
def prepare_agent_prompt(state: ShoppingGraphState) -> List[AnyMessage]:
    """Traced wrapper to measure prompt assembly time."""
    summary = state.get("summary", "")
    enriched_prompt = SHOPPER_PROMPT
    if summary:
        enriched_prompt += f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{summary}"

    if state.get("cart"):
        cart_str = json.dumps(state["cart"], indent=2)
        enriched_prompt += f"\n\n[CURRENT CART CONTENTS]\n{cart_str}"

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
    return messages_history

@traceable(run_type="chain", name="parse_and_route_tool_output")
async def parse_and_route_tool_output(tool_calls, tool_messages, state_updates, state, messages, session_id):
    """Traced wrapper to measure the time taken to parse JSON and route state."""
    for tool_call, tool_msg in zip(tool_calls, tool_messages):
        try:
            content = tool_msg.content
            json_str = ""

            if isinstance(content, list) and len(content) > 0 and "text" in content[0]:
                json_str = content[0]["text"]
            elif isinstance(content, str) and content.strip().startswith("[{"):
                parsed_list = ast.literal_eval(content)
                json_str = parsed_list[0]["text"]
            elif isinstance(content, str):
                json_str = content

            parsed_data = json.loads(json_str)
            
            if tool_call["name"] == "kapruka_search_products":
                state_updates["search_results"] = parsed_data
                state_updates["active_view"] = {
                    "type": "RENDER_PRODUCT_LIST",
                    "data": parsed_data.get("results", [])
                }
            elif tool_call["name"] == "kapruka_get_product":
                state_updates["current_product_details"] = parsed_data
                state_updates["active_view"] = {
                    "type": "RENDER_PRODUCT_DETAIL",
                    "data": parsed_data
                }
            elif tool_call["name"] == "kapruka_list_categories":
                state_updates["categories_cache"] = parsed_data
                state_updates["active_view"] = {
                    "type": "RENDER_CATEGORY_GRID",
                    "data": parsed_data.get("categories", [])
                }
            elif tool_call["name"] == "agent_add_to_cart":
                target_id = str(parsed_data.get("product_id"))
                
                real_image = parsed_data.get("image")
                real_title = parsed_data.get("title")
                real_price = parsed_data.get("price")
                
                # 1. Look in current_product_details
                details = state.get("current_product_details", {})
                if details and str(details.get("id")).upper() == target_id.upper():
                    real_image = details.get("images")[0] if details.get("images") else real_image
                    real_title = details.get("name") or real_title
                    if details.get("price"):
                        real_price = details["price"].get("amount") if isinstance(details["price"], dict) else details.get("price")
                else:
                    # 2. Look in search_results if not found in details
                    search_results = state.get("search_results", {}).get("results", [])
                    matched = next((p for p in search_results if str(p.get("id")).upper() == target_id.upper()), None)
                    if matched:
                        real_image = matched.get("image_url") or (matched.get("images")[0] if matched.get("images") else real_image)
                        real_title = matched.get("name") or real_title
                        if matched.get("price"):
                            real_price = matched["price"].get("amount") if isinstance(matched["price"], dict) else matched.get("price")

                print(f"product_id : {target_id}")
                print(f"image : {real_image}")
                print(f"title : f{real_title}")
                print(f"price : {real_price}")
                
                parsed_data["product_id"] = target_id
                parsed_data["image"] = real_image
                parsed_data["title"] = real_title
                parsed_data["price"] = float(real_price) if real_price else 0.0
                
                # Execute real DB API Call
                async with httpx.AsyncClient() as client:
                    await client.post(f"http://127.0.0.1:8000/api/cart/{session_id}/add", json=parsed_data)
                
            elif tool_call["name"] == "agent_remove_from_cart":
                # Execute real DB API Call
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"http://127.0.0.1:8000/api/cart/{session_id}/decrease", 
                        json={"product_id": parsed_data["product_id"]}
                    )
            
            censored_msg = ToolMessage(
                content=f"[System Note: Successfully executed {tool_call['name']}. The raw JSON data has been hidden from conversation history to preserve context and enforce routing. The structural UI state has been updated.]",
                tool_call_id=tool_call["id"]
            )
            
            msg_idx = messages.index(tool_msg)
            messages[msg_idx] = censored_msg
        
        except Exception as e:
            print(f"Warning: Could not parse or process {tool_call['name']}. Error: {str(e)}")
            continue

@traceable(run_type="chain", name="load_mcp_tools_network")
async def load_mcp_tools_traced(session):
    """Wrapper to trace the exact time taken to load MCP tools over the network."""
    return await load_mcp_tools(session)

# --- GLOBAL CACHE FOR MCP CONNECTION ---
_KAPRUKA_MCP_CLIENT = None
_KAPRUKA_SESSION_CM = None
_KAPRUKA_SESSION = None
_KAPRUKA_TOOLS_CACHE = None

@traceable(run_type="chain", name="get_cached_kapruka_tools")
async def get_cached_kapruka_tools():
    """Initializes the MCP session once and caches the tools in memory."""
    global _KAPRUKA_MCP_CLIENT, _KAPRUKA_SESSION_CM, _KAPRUKA_SESSION, _KAPRUKA_TOOLS_CACHE
    
    if _KAPRUKA_TOOLS_CACHE is not None:
        return _KAPRUKA_TOOLS_CACHE
        
    _KAPRUKA_MCP_CLIENT = MultiServerMCPClient(
        {
            "kapruka": {
                "transport": "http",
                "url": "https://mcp.kapruka.com/mcp",
            }
        }
    )
    
    # Manually enter the context manager to keep the connection alive indefinitely
    _KAPRUKA_SESSION_CM = _KAPRUKA_MCP_CLIENT.session("kapruka")
    _KAPRUKA_SESSION = await _KAPRUKA_SESSION_CM.__aenter__()
    _KAPRUKA_TOOLS_CACHE = await load_mcp_tools_traced(_KAPRUKA_SESSION)
    
    return _KAPRUKA_TOOLS_CACHE

async def shopper_node(state: ShoppingGraphState, config: RunnableConfig) -> Dict[str, Any]:
    """The Catalog Expert. Uses Kapruka search/browse tools to update the state with inventory data."""
    
    session_id = config["configurable"]["thread_id"]
    
    # Fetch tools from the globally active session (loads instantly after the first run)
    all_tools = await get_cached_kapruka_tools()
    
    # Filter down to ONLY the catalog tools this agent is authorized to use
    allowed_tool_names = ["kapruka_search_products", "kapruka_list_categories", "kapruka_get_product"]
    shopper_tools = [t for t in all_tools if t.name in allowed_tool_names]
    shopper_tools.append(agent_add_to_cart)
    shopper_tools.append(agent_remove_from_cart)
    
    # Set up the specialized LLM for the Shopper
    # We use a lower temperature (0.0) here to ensure precise tool parameter extraction
    model = ChatOpenAI(model="gpt-4o", temperature=0.0)
    
    # Bind the localized tools to this agent
    model_with_tools = model.bind_tools(shopper_tools)
    
    # Assemble the message history for context
    messages_history = prepare_agent_prompt(state)
    
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
        await parse_and_route_tool_output(response.tool_calls, tool_messages, state_updates, state, messages, session_id)
    
    # Update the state: Append the agent's response and reset next_agent back to concierge
    return state_updates