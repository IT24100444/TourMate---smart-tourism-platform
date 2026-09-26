import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

models_to_test = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-3.7-flash",
]

for m in models_to_test:
    try:
        resp = client.models.generate_content(
            model=m,
            contents="Say hello in one word."
        )
        print(f"SUCCESS {m}: {resp.text.strip()}")
    except Exception as e:
        print(f"FAILED {m}: {e}")
