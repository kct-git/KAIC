import uvicorn
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
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
from .agent.shopper_node import get_cached_kapruka_tools
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
        # Temporary test
        # agent_app = agent_builder.compile() # No checkpointer


        # Optional but recommended: Attach to app state for clean dependency injection
        app.state.agent_app = agent_app
        app.state.vector_store = vector_store
        app.state.db_pool = pool

    
        # Eagerly initialize the MCP connection to avoid a 4-second cold start
        print("Initializing Kapruka MCP Server connection...")
        await get_cached_kapruka_tools()
        print("Kapruka MCP Server connection established successfully.")
    
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

from pydantic import BaseModel
from typing import Optional

class AddToCartRequest(BaseModel):
    product_id: str
    title: str
    price: float
    image: Optional[str] = None
    quantity: int = 1

class DecreaseCartRequest(BaseModel):
    product_id: str

@app.post("/api/cart/{session_id}/add")
async def add_to_cart(session_id: str, request: AddToCartRequest):
    pool = app.state.db_pool
    async with pool.connection() as conn:
        # Ensure session exists
        await conn.execute(
            """
            INSERT INTO public.carts (session_id)
            VALUES (%s)
            ON CONFLICT (session_id) DO NOTHING
            """,
            (session_id,)
        )
        
        # Get cart_id
        res = await conn.execute("SELECT id FROM public.carts WHERE session_id = %s", (session_id,))
        cart_row = await res.fetchone()
        if not cart_row:
            raise HTTPException(status_code=500, detail="Failed to retrieve cart")
        cart_id = cart_row[0]
        
        # Upsert cart_items
        await conn.execute(
            """
            INSERT INTO public.cart_items (cart_id, product_id, title, price, image, quantity)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (cart_id, product_id) 
            DO UPDATE SET 
                quantity = public.cart_items.quantity + EXCLUDED.quantity,
                updated_at = NOW()
            """,
            (cart_id, request.product_id, request.title, request.price, request.image, request.quantity)
        )
    return {"status": "success"}

@app.post("/api/cart/{session_id}/decrease")
async def decrease_cart_item(session_id: str, request: DecreaseCartRequest):
    pool = app.state.db_pool
    async with pool.connection() as conn:
        res = await conn.execute("SELECT id FROM public.carts WHERE session_id = %s", (session_id,))
        cart_row = await res.fetchone()
        if not cart_row:
            raise HTTPException(status_code=404, detail="Cart not found")
        cart_id = cart_row[0]
        
        # Get current quantity
        res = await conn.execute(
            "SELECT quantity FROM public.cart_items WHERE cart_id = %s AND product_id = %s",
            (cart_id, request.product_id)
        )
        item_row = await res.fetchone()
        
        if not item_row:
            raise HTTPException(status_code=404, detail="Item not found in cart")
            
        current_quantity = item_row[0]
        
        if current_quantity > 1:
            await conn.execute(
                """
                UPDATE public.cart_items
                SET quantity = quantity - 1, updated_at = NOW()
                WHERE cart_id = %s AND product_id = %s
                """,
                (cart_id, request.product_id)
            )
        else:
            await conn.execute(
                "DELETE FROM public.cart_items WHERE cart_id = %s AND product_id = %s",
                (cart_id, request.product_id)
            )
            
    return {"status": "success"}

@app.get("/api/cart/{session_id}")
async def get_cart(session_id: str):
    pool = app.state.db_pool
    async with pool.connection() as conn:
        res = await conn.execute(
            """
            SELECT ci.product_id, ci.title, ci.price, ci.image, ci.quantity 
            FROM public.cart_items ci
            JOIN public.carts c ON ci.cart_id = c.id
            WHERE c.session_id = %s
            ORDER BY ci.created_at ASC
            """,
            (session_id,)
        )
        items = await res.fetchall()
        cart = []
        for item in items:
            cart.append({
                "product_id": item[0],
                "title": item[1],
                "price": float(item[2]),
                "image": item[3],
                "quantity": item[4]
            })
    return cart

@app.post("/api/chat/{session_id}")
async def chat_endpoint(session_id: str, request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Accepts a user message, processes it through the multi-agent graph,
    and streams the AI's text alongside the updated e-commerce state.
    """
    try:
        config = {
            "configurable": {
                "thread_id": session_id,
                "user_id": request.user_id 
                },
            "metadata": {"conversation_id": session_id}}
        
        if session_id in active_sessions:
            active_sessions[session_id].cancel()

        input_message = HumanMessage(content=request.message)
        print(f"input message : {input_message}")
        
        async def stream_generator():
            try:
                # Stream the chunks from LangGraph
                async for msg, metadata in agent_app.astream(
                    {"messages": [input_message], "active_view": None}, 
                    config=config, 
                    stream_mode="messages"
                ):
                    if metadata.get("langgraph_node") == "concierge_node":
                        # Only stream actual AI tokens, ignore manual ToolMessages (e.g. routing ack)
                        if type(msg).__name__ != "AIMessageChunk":
                            continue
                            
                        if hasattr(msg, "tool_call_chunks") and msg.tool_call_chunks:
                            continue # Skip tool calls
                        if msg.content and isinstance(msg.content, str):
                            yield msg.content
                
                # After streaming text completes, fetch final state
                final_state = await agent_app.aget_state(config)
                state_values = final_state.values

                # Output the structural states at the end
                ui_view = state_values.get("active_view")
                if ui_view:
                    yield f"\n\n__VIEW_STATE__{json.dumps(ui_view)}__VIEW_STATE__"
                
                cart = state_values.get("cart", [])
                if cart:
                    yield f"\n\n__CART_STATE__{json.dumps(cart)}__CART_STATE__"
                
                # Schedule memory background tasks
                asyncio.create_task(
                    post_response_memory_worker(
                        config=config,
                        messages=state_values.get("messages", []), 
                        existing_summary=state_values.get("summary", ""), 
                        v_store=app.state.vector_store,
                        agent_app=agent_app 
                    )
                )
            except Exception as e:
                print(f"Stream Generator Error: {str(e)}")
                yield f"\n\n[Error processing request]"

        return StreamingResponse(stream_generator(), media_type="text/plain")

    except Exception as e:
        print(f"Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail="The Kapruka agent encountered an error processing your request.")



if __name__ == "__main__":
    # Run the server locally. When you eventually package this for cloud deployment, 
    # you can swap this to run via a production ASGI server like Gunicorn.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)