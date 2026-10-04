import requests
import json

base_url = "http://127.0.0.1:8000"

# 1. Create a session
create_session_url = f"{base_url}/apps/app/users/test_user/sessions"
print("Creating session...")
res = requests.post(create_session_url)
print(f"Create session status: {res.status_code}")
print(f"Session response: {res.text}")
session_data = res.json()
session_id = session_data.get("id") or session_data.get("session_id") or "test_session_1"

# 2. Call /run with a user message
run_url = f"{base_url}/run"
payload = {
    "app_name": "app",
    "user_id": "test_user",
    "session_id": session_id,
    "new_message": {
        "role": "user",
        "parts": [
            {"text": "i want go nine arch, 6 days and around 90,000 budget"}
        ]
    }
}
print(f"\nSending message to /run with session {session_id}...")
run_res = requests.post(run_url, json=payload, timeout=60)
print(f"Run status: {run_res.status_code}")
events = run_res.json()
print(f"Number of events: {len(events)}")
for i, ev in enumerate(events):
    print(f"\n--- Event {i} ---")
    print(json.dumps(ev, indent=2)[:500])
