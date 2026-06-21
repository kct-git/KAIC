import asyncio
from sqlalchemy import text
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from ..schemas.graphSchemas import ShoppingGraphState
from .dependencies import vector_store, engine, embeddings

# The Unified Read Node
async def fetch_memory_node(state: ShoppingGraphState, config: RunnableConfig):
    # 1. Extract context variables from the configuration
    user_id = config["configurable"].get("user_id")
    messages = state.get("messages", [])
    
    # Guard rail: If there are no messages, return empty context immediately
    if not messages:
        return {"semantic_context": "", "episodic_context": ""}
    
    # 2. Extract a small context window (the last 4 messages) to resolve pronouns
    recent_history = messages[-4:] 
    latest_message_content = recent_history[-1].content
    
    # 3. Format history context for the rewriting LLM
    # Storing conversational history text cleanly without metadata blockages
    history_context = "\n".join([
        f"{'User' if m.type == 'human' else 'AI'}: {m.content}"
        for m in recent_history[:-1]
    ])
    
    # 4. Construct the query formulation & intent routing prompt
    rewrite_prompt = f"""
    You are an advanced query reformulation assistant for a long-term memory database.
    Your task is to analyze the recent conversation history and rewrite the latest user message into a specific, standalone search query.
    
    Instructions:
    - Resolve all pronouns or contextual gaps using the conversation history (e.g., change "it" to "the black laptop").
    - Focus only on core concepts, preferences, relationships, or user facts.
    - If the user's latest message is purely conversational filler (e.g., greetings like "hi", confirmations like "yes", or appreciation like "thanks") and does not require fetching long-term facts or preferences, output exactly: SKIP_SEARCH.
    
    Recent History:
    {history_context}
    
    Latest User Message: 
    "{latest_message_content}"
    
    Standalone Search Query or SKIP_SEARCH:
    """
    
    # 5. Invoke a fast, cost-effective LLM with deterministic settings
    cheap_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    llm_response = await cheap_llm.ainvoke(rewrite_prompt)
    search_query = llm_response.content.strip()
    
    # 6. Intent Routing Check (Bypass Vector DB search if it's filler text)
    if search_query == "SKIP_SEARCH":
        print(f"[DEBUG: MEMORY READ] Conversational filler detected ('{latest_message_content}'). Skipping vector search.")
        return {"semantic_context": "", "episodic_context": ""}
        
    print(f"[DEBUG: MEMORY READ] Original: '{latest_message_content}' -> Formulated Query: '{search_query}'")
    
    # 7. Generate embedding for episodic search
    query_vector = await embeddings.aembed_query(search_query)

    # 8. Define concurrent search tasks
    async def fetch_semantic():
        try:
            retrieved_docs = await vector_store.asimilarity_search(
                search_query, 
                k=3,  
                filter={"user_id": user_id}
            )
            return "\n".join([doc.page_content for doc in retrieved_docs])
        except Exception as e:
            print(f"[ERROR: SEMANTIC READ] {e}")
            return ""
            
    async def fetch_episodic():
        try:
            sql_query = text("""
                SELECT summary, created_at, outcome
                FROM episodic_memory
                WHERE user_id = :user_id
                ORDER BY embedding <=> :vector
                LIMIT 3
            """)
            
            async with engine.connect() as conn:
                result = await conn.execute(sql_query, {
                    "user_id": user_id,
                    "vector": str(query_vector)
                })
                rows = result.fetchall()
                
            episodes = []
            for row in rows:
                date_str = str(row.created_at).split(" ")[0] # extract date portion
                episodes.append(f"- On {date_str}, outcome was '{row.outcome}': {row.summary}")
            return "\n".join(episodes)
        except Exception as e:
            print(f"[ERROR: EPISODIC READ] {e}")
            return ""

    # 9. Execute both searches simultaneously
    semantic_result, episodic_result = await asyncio.gather(fetch_semantic(), fetch_episodic())
    
    return {
        "semantic_context": semantic_result,
        "episodic_context": episodic_result
    }