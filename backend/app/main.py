import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from contextlib import asynccontextmanager
import os
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langchain_postgres.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from fastapi import BackgroundTasks
from dotenv import load_dotenv

load_dotenv()


# Import your Phase 1 schemas
from .schemas.apiSchemas import DeliveryDestination, OrderConfirmation
from .schemas.requestSchemas import ChatRequest, ChatResponse
from .agent.graph import agent_builder
from .agent.dependencies import vector_store
from .agent.background_worker import post_response_memory_worker, process_episodic_memory
import asyncio

# Global references
agent_app = None
active_sessions = {}

async def delayed_episodic_extraction(session_id: str, user_id: str, app_instance, config: dict):
    try:
        # Wait for 15 minutes of inactivity (15 * 60 seconds)
        await asyncio.sleep(15*60)
        
        print(f"\n[DEBUG: SWEEPER] Session {session_id} inactive for 15 mins. Triggering Episodic Memory.")
        
        # Get the latest state
        final_state = await app_instance.aget_state(config)
        messages = final_state.values.get("messages", [])
        
        await process_episodic_memory(session_id, user_id, messages)
        
        # Cleanup
        if session_id in active_sessions:
            del active_sessions[session_id]
            
    except asyncio.CancelledError:
        print(f"\n[DEBUG: SWEEPER] Session {session_id} became active again. Episodic timer reset.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent_app

    supabase_db_url = os.getenv("SUPABASE_DB_URL") 

    # Connection arguments specific to psycopg3 and cloud poolers
    connection_kwargs = {
        "autocommit": True,
        "prepare_threshold": 0, # CRITICAL for Supabase Poolers
    }

    # Use AsyncConnectionPool as an async context manager
    async with AsyncConnectionPool(
        conninfo=supabase_db_url,
        max_size=20,
        kwargs=connection_kwargs,
        check=AsyncConnectionPool.check_connection,
        max_idle=120
    ) as pool:
    
        # Initialize LangGraph Checkpointer
        checkpointer = AsyncPostgresSaver(pool)
    
        # Bootstrap the Database Schema
        await checkpointer.setup()
    
        # Compile the graph
        agent_app = agent_builder.compile(checkpointer=checkpointer)

        # Optional but recommended: Attach to app state for clean dependency injection
        app.state.agent_app = agent_app
        app.state.vector_store = vector_store
    
        yield  # FastAPI starts accepting requests here


app = FastAPI(title="Kapruka AI Agent API", version="1.0", lifespan=lifespan)


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
async def chat_endpoint(session_id: str, request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Accepts a user message, processes it through the multi-agent graph,
    and returns the AI's text alongside the updated e-commerce state.
    """
    try:
        # Map the URL session_id to the LangGraph thread_id
        config = {
            "configurable": {
                "thread_id": session_id,
                "user_id": request.user_id # in production environment we need to pass user id JWT authentication FastAPI's dependency injection
                },
            "metadata": {"conversation_id": session_id}}
        
        # Clear existing timer for this session if it exists
        if session_id in active_sessions:
            active_sessions[session_id].cancel()

        # Format the user's input
        input_message = HumanMessage(content=request.message)
        print(f"input message : {input_message}")
        
        # Invoke the graph (LangGraph automatically loads past state using the config)
        # We explicitly clear 'active_view' so old UI states don't persist into new conversational turns
        final_state = await agent_app.ainvoke({
            "messages": [input_message],
            "active_view": None
        }, config=config)

        # Queue memory maintenance (Tier 2 & 3)
        # We pass everything the worker needs so it doesn't cause circular imports
        background_tasks.add_task(
            post_response_memory_worker, 
            config=config,
            messages=final_state.get("messages", []), 
            existing_summary=final_state.get("summary", ""), 
            v_store=app.state.vector_store, # Or vector_store if imported globally
            agent_app=agent_app 
        )
        
        # Schedule the new episodic extraction timer for 15 minutes of inactivity
        # timer_task = asyncio.create_task(
        #     delayed_episodic_extraction(session_id, request.user_id, agent_app, config)
        # )
        # active_sessions[session_id] = timer_task
        
        # Extract the AI's final text response
        # The last message in the list is the final output from the Concierge node
        ai_text = final_state["messages"][-1].content
        print(f"result : {ai_text}")
        
        # Extract the e-commerce state arrays/objects
        # We use .get() with empty defaults to ensure it never crashes on a fresh session
        current_cart = final_state.get("cart", [])
        
        delivery_dict = final_state.get("delivery_info", {})
        delivery_info = DeliveryDestination(**delivery_dict) if delivery_dict else DeliveryDestination()
        
        order_dict = final_state.get("order_details", {})
        order_details = OrderConfirmation(**order_dict) if order_dict else OrderConfirmation()

        # Extract the UI instruction
        ui_view = final_state.get("active_view")

        # Return the strictly typed response back to the frontend
        return ChatResponse(
            agent_response=ai_text,
            cart=current_cart,
            delivery_info=delivery_info,
            order_details=order_details,
            left_panel_view=ui_view
        )

    except Exception as e:
        # Log the actual error internally and return a clean 500 to the client
        print(f"Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail="The Kapruka agent encountered an error processing your request.")



if __name__ == "__main__":
    # Run the server locally. When you eventually package this for cloud deployment, 
    # you can swap this to run via a production ASGI server like Gunicorn.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)