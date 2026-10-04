import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"]
for m in models:
    try:
        resp = client.models.generate_content(
            model=m,
            contents="Say 'OK' in one word."
        )
        print(f"{m}: SUCCESS -> {resp.text.strip()}")
    except Exception as e:
        print(f"{m}: ERROR -> {e}")
