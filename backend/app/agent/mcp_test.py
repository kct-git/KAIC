import json
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
import asyncio

async def inspect_kapruka_tools():
    client = MultiServerMCPClient({
        "kapruka": {
            "transport": "http", # or "sse" depending on your exact setup
            "url": "https://mcp.kapruka.com/mcp",
        }
    })
    
    async with client.session("kapruka") as session:
        all_tools = await load_mcp_tools(session)
        
        print(f"🔍 Found {len(all_tools)} tools on the Kapruka server:\n")
        
        for tool in all_tools:
            print(f"🛠️ Tool Name: {tool.name}")
            print(f"📖 Description: {tool.description}")
            # tool.args contains the Pydantic schema for the input parameters
            print(f"📥 Input Parameters:\n{json.dumps(tool.args, indent=2)}")
            print("-" * 50)

# Run this function once to inspect the console output
if __name__ == "__main__":
    asyncio.run(inspect_kapruka_tools())

