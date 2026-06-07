import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage

# Import your Phase 1 schemas
from .schemas.apiSchemas import DeliveryDestination, OrderConfirmation
from .schemas.requestSchemas import ChatRequest, ChatResponse

# Import your compiled LangGraph agent from Phase 2
# (Assuming your graph builder file is named graph_engine.py)
from .agent.graph import agent

app = FastAPI(title="Kapruka AI Agent API", version="1.0")

# Define allowed origins
origins = [
    "http://localhost:3000",  # Next.js local development port
]

# Allow frontend applications to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Update this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat/{session_id}", response_model=ChatResponse)
async def chat_endpoint(session_id: str, request: ChatRequest):
    """
    Accepts a user message, processes it through the multi-agent graph,
    and returns the AI's text alongside the updated e-commerce state.
    """
    try:
        # 1. Map the URL session_id to the LangGraph thread_id
        config = {"configurable": {"thread_id": session_id}}
        
        # 2. Format the user's input
        input_message = HumanMessage(content=request.message)
        
        # 3. Invoke the graph (LangGraph automatically loads past state using the config)
        final_state = await agent.ainvoke({"messages": [input_message]}, config=config)
        
        # 4. Extract the AI's final text response
        # The last message in the list is the final output from the Concierge node
        ai_text = final_state["messages"][-1].content
        
        # 5. Extract the e-commerce state arrays/objects
        # We use .get() with empty defaults to ensure it never crashes on a fresh session
        current_cart = final_state.get("cart", [])
        
        delivery_dict = final_state.get("delivery_info", {})
        delivery_info = DeliveryDestination(**delivery_dict) if delivery_dict else DeliveryDestination()
        
        order_dict = final_state.get("order_details", {})
        order_details = OrderConfirmation(**order_dict) if order_dict else OrderConfirmation()

        # 6. Return the strictly typed response back to the frontend
        return ChatResponse(
            agent_response=ai_text,
            cart=current_cart,
            delivery_info=delivery_info,
            order_details=order_details
        )

    except Exception as e:
        # Log the actual error internally and return a clean 500 to the client
        print(f"Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail="The Kapruka agent encountered an error processing your request.")

if __name__ == "__main__":
    # Run the server locally. When you eventually package this for cloud deployment, 
    # you can swap this to run via a production ASGI server like Gunicorn.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)