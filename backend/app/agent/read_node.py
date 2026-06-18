from ..schemas.graphSchemas import ShoppingGraphState
from langchain_core.runnables import RunnableConfig
from .dependencies import vector_store



# The Read Node
async def fetch_semantic_memory(state: ShoppingGraphState, config: RunnableConfig):
    # Extract user_id injected via configurable keys
    user_id = config["configurable"].get("user_id")
    
    # Example: Retrieve from Pinecone namespace
    # Query vector store using the last user message for semantic similarity
    last_user_message = state["messages"][-1].content 
    retrieved_docs = await vector_store.asimilarity_search(
        last_user_message, 
        k=3,  
        filter={"user_id": user_id}
    )
    
    facts = "\n".join([doc.page_content for doc in retrieved_docs])
    return {"semantic_context": facts}