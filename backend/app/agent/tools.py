import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient  
from langchain.agents import create_agent
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain.messages import ToolMessage

from prompts import KAPRUKA_GUARDRAILS

from dotenv import load_dotenv
load_dotenv()

async def main():

    client = MultiServerMCPClient(
        {
            "kapruka": {
                "transport": "http",
                "url": "https://mcp.kapruka.com/mcp",
            }
        }
    )

    async with client.session("kapruka") as session:
        tools = await load_mcp_tools(session)
        print(f"Successfully loaded {len(tools)} tools from Kapruka.\n")

        agent = create_agent(
            "gpt-4o",
            tools,
            system_prompt=KAPRUKA_GUARDRAILS
        )

        agent_response = await agent.ainvoke(
            {"messages": [{"role": "user", "content": "Find chocolates"}]}
        )
        print(agent_response["messages"][-1].content)


if __name__ == "__main__":
    asyncio.run(main())