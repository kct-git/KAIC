import os
from langchain_postgres.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from sqlalchemy.ext.asyncio import create_async_engine

# 1. Prepare connection strings
supabase_db_url = os.getenv("SUPABASE_DB_URL") 
if supabase_db_url:
    pgvector_url = supabase_db_url.replace("postgresql://", "postgresql+psycopg://")
else:
    pgvector_url = ""

# 2. Initialize Embeddings
embeddings = OpenAIEmbeddings()

# CREATE THE ASYNC ENGINE EXPLICITLY
# This tells SQLAlchemy to use the async psycopg3 driver
engine = create_async_engine(pgvector_url)

# 3. Initialize Vector Store
vector_store = PGVector(
    embeddings=embeddings,
    collection_name="semantic_memory",
    connection=engine, 
    use_jsonb=True,
)