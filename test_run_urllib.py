import sys
import json
import urllib.request

session_id = "0d80a144-0774-4062-8c92-c64981504a67"
url = "http://127.0.0.1:8000/run"
payload = {
    "app_name": "app",
    "user_id": "tourist_1",
    "session_id": session_id,
    "new_message": {
        "role": "user",
        "parts": [{"text": "i want go nine arch, 6 days and around 90,000 budget"}]
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

print("Sending request to /run...")
sys.stdout.flush()
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = resp.read().decode('utf-8')
        print(f"Status: {resp.status}")
        data = json.loads(body)
        print(f"Received {len(data)} events:")
        for idx, item in enumerate(data):
            # Print event summary
            content = item.get("content", {})
            parts = content.get("parts", [])
            for p in parts:
                if "text" in p:
                    print(f"--- Event {idx} Text ---")
                    print(p["text"])
                if "functionCall" in p:
                    print(f"--- Event {idx} Function Call: {p['functionCall']['name']} ---")
                    print(p["functionCall"].get("args"))
                if "functionResponse" in p:
                    print(f"--- Event {idx} Function Response: {p['functionResponse']['name']} ---")
except Exception as e:
    print(f"Error: {e}")
sys.stdout.flush()
