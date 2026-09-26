import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

try:
    for m in client.models.list():
        if "flash" in m.name:
            print(m.name)
except Exception as e:
    print("Error listing:", e)
