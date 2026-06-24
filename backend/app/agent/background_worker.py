import traceback
from pydantic import BaseModel, Field
from langchain_postgres.vectorstores import PGVector
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage, RemoveMessage
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from sqlalchemy import text
import json
from .dependencies import engine, embeddings

# 1. Define a strict Pydantic structure for reliable memory extraction
class ExtractedMemories(BaseModel):
    has_new_facts: bool = Field(
        description="True if new permanent user facts, preferences, or relationships were explicitly found."
    )
    facts: list[str] = Field(
        default=[],
        description="A list of standalone, crisp declarative facts about the user. Empty list if none."
    )

class ExtractedEpisode(BaseModel):
    summary: str = Field(description="A concise narrative summary of the entire interaction episode.")
    outcome: str = Field(description="The outcome of the session. Must be one of: 'purchased', 'cart_abandoned', 'inquiry_resolved', 'browsed_only', 'other'.")
    intent: str = Field(description="What the user was trying to achieve.")
    actions_taken: str = Field(description="Key actions the user took during the session.")

async def post_response_memory_worker(
        config: dict,
        messages: list[AnyMessage],
        existing_summary: str,
        v_store: PGVector,
        agent_app: any
        ):
    """
    Handles Tier 3 (Semantic Facts) as an asynchronous background worker.
    Filters tool traffic, uses structured outputs, and handles basic deduplication.
    """
    user_id = config["configurable"].get("user_id")
    thread_id = config["configurable"].get("thread_id")
    
    print("\n" + "="*50)
    print(f"[DEBUG: MEMORY WORKER START] User: {user_id} | Thread: {thread_id}")
    print("="*50 + "\n")

    if not user_id or not messages:
        print("[DEBUG: EXIT] Missing user_id or messages array is empty.")
        return
        
    try:
        # 2. Filter out internal multiagent overhead (ToolMessages and intermediate AI steps)
        # We only keep HumanMessages and final conversational AIMessages (no tool calls attached)
        conversational_messages = [
            msg for msg in messages 
            if isinstance(msg, HumanMessage) or 
            (isinstance(msg, AIMessage) and not msg.tool_calls)
        ]

        if len(conversational_messages) < 2:
            print("[DEBUG: TIER 3] Not enough clean conversational context to evaluate facts.")
            return

        # 3. Capture the last human request and the agent's ultimate response to it
        last_ai_response = conversational_messages[-1]
        last_human_request = conversational_messages[-2]

        clean_context = f"User: {last_human_request.content}\nAI: {last_ai_response.content}"
        
        # 4. Setup LLM with strict structural outputs
        base_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        structured_llm = base_llm.with_structured_output(ExtractedMemories)

        fact_prompt = f"""
        You are a long-term semantic memory extraction worker for an AI system.
        Analyze the clean interaction transcript below and extract any new, permanent facts, 
        user preferences, personal background, constraints, or relationship traits about the USER.

        Guidelines:
        - Extract facts as standalone, permanent, declarative statements (e.g., "User's girlfriend loves red roses").
        - Disregard transient state data (e.g., specific item prices, session IDs, temporary checkout steps).
        - Use the context of the AI's response to understand the user's brief affirmations if necessary.

        Interaction:
        {clean_context}
        """
        
        # --- TEMPORARILY DISABLED TIER 3 SEMANTIC MEMORY FOR COMPETITION ---
        # print(f"[DEBUG: TIER 3] Analyzing cleaned context window for new facts...")
        # extracted_data: ExtractedMemories = await structured_llm.ainvoke(fact_prompt)
        # 
        # if not extracted_data.has_new_facts or not extracted_data.facts:
        #     print("[DEBUG: TIER 3] No new long-term facts extracted. Skipping DB processes.")
        #     pass
        # else:
        #     # 5. Deduplication & Contradiction Check Layer
        #     for fact in extracted_data.facts:
        #         print(f"[DEBUG: DEDUPLICATION CHECK] Checking vector space for similarity to: '{fact}'")
        #         
        #         # Query the database for existing similar facts for this specific tenant
        #         similar_docs = await v_store.asimilarity_search(
        #             fact,
        #             k=1,
        #             filter={"user_id": user_id}
        #         )
        #         
        #         # Simple threshold check: if a matching fact is highly similar, skip to avoid duplicates
        #         is_duplicate = False
        #         if similar_docs:
        #             existing_fact = similar_docs[0].page_content
        #             
        #             eval_prompt = f"""
        #             Compare the new fact with the existing fact stored in the user profile.
        #             Existing Fact: "{existing_fact}"
        #             New Fact: "{fact}"
        #             
        #             Is the new fact completely identical in meaning or already fully covered by the existing fact? 
        #             Reply with exactly 'YES' or 'NO'.
        #             """
        #             eval_res = await base_llm.ainvoke(eval_prompt)
        #             if eval_res.content.strip().upper() == "YES":
        #                 is_duplicate = True
        #                 print(f"[DEBUG: SKIPPED DUPLICATE] Fact already exists in memory slot: '{existing_fact}'")
        # 
        #         if not is_duplicate:
        #             doc = Document(
        #                 page_content=fact,
        #                 metadata={"user_id": user_id}
        #             )
        #             print(f"[DEBUG: WRITE DB] Writing new fact to PGVector...")
        #             await v_store.aadd_documents([doc])
        #             print(f"[DEBUG: TIER 3 SUCCESS] Successfully saved semantic memory: {fact}")
        # -------------------------------------------------------------------

        # ==========================================
        # TIER 2: SHORT-TERM MEMORY (Summarize & Prune)
        # ==========================================
        print("\n--- [DEBUG: TIER 2] Checking short-term memory limit ---")
        keep_messages = 10
        
        if len(messages) > keep_messages:
            cutoff_index = len(messages) - keep_messages
            print(f"[DEBUG] Threshold exceeded. Initial cutoff index set to: {cutoff_index} (keeping last {keep_messages})")
            
            # SAFE PRUNING CHECK
            loop_guard = 0
            while cutoff_index < len(messages) and cutoff_index > 0:
                loop_guard += 1
                if loop_guard > 10:
                    print("[DEBUG: WARNING] Pruning loop stuck! Breaking to avoid infinite lockup.")
                    break

                msg = messages[cutoff_index]
                print(f"[DEBUG] Inspecting message at index {cutoff_index}: Type='{msg.type}', ID='{msg.id}'")
                
                if msg.type == "tool":
                    print("[DEBUG] Cutoff landed on a 'tool' message. Shifting back (-1).")
                    cutoff_index -= 1 
                else:
                    print(f"[DEBUG] Safe to cut at index {cutoff_index}.")
                    break

            messages_to_prune = messages[:cutoff_index]
            
            if messages_to_prune:
                print(f"\n[DEBUG: TIER 2] Summarizing {len(messages_to_prune)} older messages...")
                summary_prompt = f"Extend summary: '{existing_summary}' with these messages: {messages_to_prune}"
                new_summary = await base_llm.ainvoke(summary_prompt)
                
                print(f"[DEBUG] New Summary Generated:\n{new_summary.content[:100]}...\n") # Truncated for clean logs
                
                delete_commands = [RemoveMessage(id=m.id) for m in messages_to_prune]
                print(f"[DEBUG] Sending {len(delete_commands)} RemoveMessage commands to LangGraph Checkpointer...")
                
                await agent_app.aupdate_state(
                    config,
                    {"messages": delete_commands, "summary": new_summary.content}
                )
                print("[DEBUG: TIER 2 SUCCESS] Pruned messages and updated rolling summary in Supabase.")
            else:
                print("[DEBUG: TIER 2] No messages determined safe to prune after shifting indices.")
        else:
            print(f"[DEBUG: TIER 2] Message count ({len(messages)}) under threshold ({keep_messages}). Skipping prune.")

    except Exception as e:
        print(f"[ERROR: MEMORY WORKER FAILURE] Detailed Exception tracing follows:")
        traceback.print_exc()

async def process_episodic_memory(thread_id: str, user_id: str, messages: list[AnyMessage]):
    """Summarizes a closed session and inserts it into the episodic_memory table."""
    try:
        print(f"\n[DEBUG: EPISODIC] Processing inactive thread {thread_id} for user {user_id}")
        
        if not messages or len(messages) < 2:
            print("[DEBUG: EPISODIC] Not enough messages to form an episode. Skipping.")
            return

        # Prepare context
        history_context = "\n".join([
            f"{'User' if isinstance(m, HumanMessage) else 'AI'}: {m.content}"
            for m in messages if isinstance(m, HumanMessage) or (isinstance(m, AIMessage) and not getattr(m, 'tool_calls', []))
        ])

        # Setup LLM
        base_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        structured_llm = base_llm.with_structured_output(ExtractedEpisode)

        prompt = f"""
        You are an episodic memory extractor. Analyze the following conversation which has now ended or gone idle.
        Extract a comprehensive summary, the user's intent, the key actions they took, and the final outcome.
        
        Conversation:
        {history_context}
        """

        print("[DEBUG: EPISODIC] Extracting episode details using LLM...")
        episode: ExtractedEpisode = await structured_llm.ainvoke(prompt)
        
        # Generate embedding for the summary
        print("[DEBUG: EPISODIC] Generating vector embedding for summary...")
        vector = await embeddings.aembed_query(episode.summary)
        
        # Insert into DB
        metadata_json = json.dumps({
            "intent": episode.intent,
            "actions_taken": episode.actions_taken
        })
        
        sql_query = text("""
            INSERT INTO episodic_memory (user_id, thread_id, summary, embedding, outcome, metadata)
            VALUES (:user_id, :thread_id, :summary, :embedding, :outcome, CAST(:metadata AS JSONB))
        """)
        
        print("[DEBUG: EPISODIC] Writing episode to custom Supabase table...")
        async with engine.begin() as conn:
            await conn.execute(sql_query, {
                "user_id": user_id,
                "thread_id": thread_id,
                "summary": episode.summary,
                "embedding": str(vector),
                "outcome": episode.outcome,
                "metadata": metadata_json
            })
            
        print("[DEBUG: EPISODIC] Successfully saved episodic memory!")

    except Exception as e:
        print(f"[ERROR: EPISODIC MEMORY FAILURE]")
        traceback.print_exc()
