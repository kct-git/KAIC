from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

from apiSchemas import CartItem, DeliveryDestination, OrderConfirmation

class ShoppingGraphState(TypedDict):
    """The complete centralized session state memory for the LangGraph workflow."""
    
    # 1. Conversational History (Appends automatically via add_messages)
    messages: Annotated[List[AnyMessage], add_messages]
    
    # 2. Structural E-Commerce States
    cart: List[CartItem]
    delivery_info: DeliveryDestination
    order_details: OrderConfirmation
    
    # 3. Routing Mechanism State Flag
    next_agent: str