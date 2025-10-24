import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Load .env
load_dotenv()

# Get key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

# Init with correct model + explicit key
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",  # Current free-tier Flash (Oct 2025)
    google_api_key=api_key,
    temperature=0
)

# Test
response = llm.invoke("Say 'AI setup success with Gemini 2.5 Flash!'")
print(response.content)