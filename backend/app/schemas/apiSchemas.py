from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CartItem(BaseModel):
    """Represents a product added to the user's shopping cart."""
    product_id: str = Field(description="Unique identifier for the product on Kapruka")
    title: str = Field(description="Name or title of the product")
    quantity: int = Field(default=1, description="Quantity selected by the user")
    price: float = Field(description="Unit price of the item in LKR")
    total_price: Optional[float] = Field(None, description="Computed total price (quantity * price)")

    def model_post_init(self, __context: Any) -> None:
        """Automatically calculate the total price after initialization."""
        if self.total_price is None:
            self.total_price = self.quantity * self.price

class DeliveryDestination(BaseModel):
    """Tracks validated recipient and shipping details."""
    recipient_name: Optional[str] = Field(None, description="Name of the person receiving the order")
    address_line: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="Destination city (e.g., Colombo, Moratuwa)")
    contact_number: Optional[str] = Field(None, description="Validated phone number for delivery updates")
    delivery_fee: Optional[float] = Field(None, description="Shipping cost returned by Kapruka tool")
    quote_id: Optional[str] = Field(None, description="Reference ID for the delivery calculation")

class OrderConfirmation(BaseModel):
    """Tracks the final transactional outcome once an order is registered."""
    order_id: Optional[str] = Field(None, description="Kapruka generated order reference")
    status: Optional[str] = Field(None, description="Current status (e.g., PENDING_PAYMENT, PLACED)")
    checkout_pay_link: Optional[str] = Field(None, description="The payment gateway URL for the guest")