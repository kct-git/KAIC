import traceback
from langchain_postgres.vectorstores import PGVector
from langchain_core.messages import AnyMessage, RemoveMessage
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI

async def post_response_memory_worker(
        config: dict,
        messages: list[AnyMessage],
        existing_summary: str,
        v_store: PGVector,
        agent_app: any
        ):
    """
    Handles both Tier 2 (Rolling Summary & Pruning) and Tier 3 (Semantic Facts).
    Runs asynchronously to avoid blocking the user's chat response.
    """
    user_id = config["configurable"].get("user_id")
    thread_id = config["configurable"].get("thread_id")
    
    print("\n" + "="*50)
    print(f"[DEBUG: MEMORY WORKER START] User: {user_id} | Thread: {thread_id}")
    print(f"[DEBUG] Total messages currently in state: {len(messages)}")
    print("="*50 + "\n")

    if not user_id or not messages:
        print("[DEBUG: EXIT] Missing user_id or messages array is empty.")
        return
        
    try:
        cheap_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

        # ==========================================
        # TIER 3: SEMANTIC MEMORY (Long-Term Facts)
        # ==========================================
        print("\n--- [DEBUG: TIER 3] Checking for new long-term facts ---")
        fact_prompt = f"Extract any new, permanent user preferences or facts from the last message. If none, reply 'NONE'. Messages: {messages[-2:]}"
        
        print(f"[DEBUG] Invoking LLM for Tier 3 extraction...")
        fact_response = await cheap_llm.ainvoke(fact_prompt)
        print(f"[DEBUG] Raw LLM Fact Response: '{fact_response.content}'")
        
        # Robust check to prevent false positives like "None." or "none"
        if "none" not in fact_response.content.strip().lower():
            doc = Document(
                page_content=fact_response.content,
                metadata={"user_id": user_id}
            )
            print(f"[DEBUG] Writing to PGVector database for user: {user_id}...")
            await v_store.aadd_documents([doc])
            print(f"[DEBUG: TIER 3 SUCCESS] Saved to Supabase: {fact_response.content}")
        else:
            print("[DEBUG: TIER 3] No new facts detected. Skipping DB write.")

        # ==========================================
        # TIER 2: EPISODIC MEMORY (Summarize & Prune)
        # ==========================================
        print("\n--- [DEBUG: TIER 2] Checking episodic memory limit ---")
        keep_messages = 4
        
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
                elif msg.type == "ai" and hasattr(msg, "tool_calls") and msg.tool_calls:
                    print("[DEBUG] Cutoff landed on an AI 'tool_call'. Shifting forward (+1).")
                    cutoff_index += 1
                else:
                    print(f"[DEBUG] Safe to cut at index {cutoff_index}.")
                    break 

            messages_to_prune = messages[:cutoff_index]
            
            if messages_to_prune:
                print(f"\n[DEBUG: TIER 2] Summarizing {len(messages_to_prune)} older messages...")
                summary_prompt = f"Extend summary: '{existing_summary}' with these messages: {messages_to_prune}"
                new_summary = await cheap_llm.ainvoke(summary_prompt)
                
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
        # Full stack trace printing is critical for catching async failures
        print("\n" + "!"*50)
        print(f"[CRITICAL ERROR] Background Memory Worker failed!")
        print(traceback.format_exc())
        print("!"*50 + "\n")