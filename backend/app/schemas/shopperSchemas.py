from pydantic import BaseModel

class ListCat(BaseModel):
    name: list[str]
    url: list[str]

class SearchProduct(BaseModel):
    product_id : list[str]
    names : list[str]
    stock_indicator : list[str]
    image_url : list[str]
    # next_cursor : str i don't know what is this 

class GetProduct(BaseModel):
    id: str
    name : str
    desc : str
    price : float
    stock : bool
    summary: str
    images: list[str]
    url: str