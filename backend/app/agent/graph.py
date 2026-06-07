from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from ..schemas.graphSchemas import ShoppingGraphState
from .concierge_node import concierge_node
from .shopper_node import shopper_node
from .logistics_node import logistics_node

from dotenv import load_dotenv
load_dotenv()


def route_after_concierge(state: ShoppingGraphState) -> str:
    """Evaluates the state flag to decide the next graph edge to transverse."""
    next_step = state.get("next_agent", "__end__")
    
    if next_step == "shopper":
        return "shopper_node"
    elif next_step == "logistics":
        return "logistics_node"
    
    return "__end__"


# 1. Initialize the Graph with the State structure
agent_builder = StateGraph(ShoppingGraphState)

# 2. Register all specialized nodes
agent_builder.add_node("concierge_node", concierge_node)
agent_builder.add_node("shopper_node", shopper_node)
agent_builder.add_node("logistics_node", logistics_node)

# 3. Define the structural edges
agent_builder.add_edge(START, "concierge_node")

# Maps the router string directly to the registered nodes
agent_builder.add_conditional_edges(
    "concierge_node",
    route_after_concierge,
    {
        "shopper_node": "shopper_node",
        "logistics_node": "logistics_node",
        "__end__": END
    }
)

# Loopback edges returning control back to the entry face
agent_builder.add_edge("shopper_node", "concierge_node")
agent_builder.add_edge("logistics_node", "concierge_node")

memory = MemorySaver()

# 4. Compile the graph topology into an executable runnable
agent = agent_builder.compile(checkpointer=memory)



png_bytes = agent.get_graph().draw_mermaid_png()

with open("graph.png", "wb") as f:
    f.write(png_bytes)



if __name__ == "__main__":
    pass
    
    # # 5. Execution block
    # async def main():

    #     config = {"configurable": {"thread_id": "session_user_kapruka_005"}}

    #     print("=== Turn 1: Adding to Cart ===")
    #     initial_messages = [HumanMessage(content="what are the best cakes do you have for my mom")]
        
    #     # Safe Initialization: Initialize empty structures for fields defined in your TypedDict 
    #     # to prevent nodes from hitting unexpected KeyErrors down the line.
    #     initial_state = {
    #         "messages": initial_messages,
    #         "cart": [],
    #         "delivery_info": {},
    #         "order_details": {},
    #         "next_agent": ""
    #     }
        
    #     response1 = await agent.ainvoke(initial_state, config=config)
    #     print("Agent:", response1["messages"][-1].content)

    #     # print("\n=== Turn 2: Testing Contextual Memory ===")
    #     # follow_up_message = HumanMessage(content="sure here is my address, no 07, dambulla. and phone number is 0727117")


    #     # response2 = await agent.ainvoke({"messages": [follow_up_message]}, config=config)
    #     # print("Agent:", response2["messages"][-1].content)

    #     # print("\n=== Full Execution Conversation History ===")
    #     # for message in final_state["messages"]:
    #     #     message.pretty_print()   

    # # Execute the async engine loop
    # asyncio.run(main())   
     

