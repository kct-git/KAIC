from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from .apiSchemas import CartItem, DeliveryDestination, OrderConfirmation

class ChatRequest(BaseModel):
    """Payload received from the front-end interface."""
    message: str = Field(..., description="The textual message typed by the user")

class ChatResponse(BaseModel):
    """Payload sent back to the front-end client interface."""
    agent_response: str = Field(..., description="The textual message produced by the assistant")
    cart: List[CartItem] = Field(..., description="The current updated state of the shopping cart")
    delivery_info: DeliveryDestination = Field(..., description="Current validated shipping info")
    order_details: OrderConfirmation = Field(..., description="Final transactional order links and status")