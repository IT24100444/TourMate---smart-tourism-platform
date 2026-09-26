import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

resp = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents="What is 25 + 17?",
    config={"tools": [add]}
)
print("gemini-3.5-flash-lite tool call test:", resp)
