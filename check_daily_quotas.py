import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
]

for m in models:
    try:
        resp = client.models.generate_content(model=m, contents="Reply OK")
        print(f"AVAILABLE: {m} -> {resp.text.strip()}")
    except Exception as e:
        print(f"FAIL: {m} -> {e}")
