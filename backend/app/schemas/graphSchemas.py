from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

from .apiSchemas import CartItem, DeliveryDestination, OrderConfirmation
from .shopperSchemas import ListCat, SearchProduct, GetProduct

class ShoppingGraphState(TypedDict):
    """The complete centralized session state memory for the LangGraph workflow."""
    
    # Conversational History (Appends automatically via add_messages)
    messages: Annotated[List[AnyMessage], add_messages]
    
    # Structural E-Commerce States
    cart: List[CartItem]
    delivery_info: DeliveryDestination
    order_details: OrderConfirmation
    
    #Tool Execution & Context State
    # Caches the category tree from `kapruka_list_categories` 
    # Schema: {"categories": [{"name": str, "url": str, "children": [...]}]}
    categories_cache: Optional[Dict[str, Any]]
    
    # Stores the latest search results from `kapruka_search_products`
    # Schema: {"results": [...], "next_cursor": str, "applied_filters": {...}}
    search_results: Optional[Dict[str, Any]]
    
    # Stores the detailed view of a specific product from `kapruka_get_product`
    # Schema: {"id": str, "name": str, "price": {...}, "variants": [...], ...}
    current_product_details: Optional[Dict[str, Any]]

    # Routing Mechanism State Flag
    next_agent: str

    # NEW: Tells the frontend exactly what to display on the left side
    active_view: Optional[Dict[str, Any]]