import asyncio
import sys
import uuid

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from app.agent import app as adk_app
from app.app_utils import services
from google.adk.runners import Runner
from google.genai import types

async def test_multiturn():
    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    user_id = "test_user_multiturn"
    session_id = f"sess_{uuid.uuid4().hex[:12]}"

    # Turn 1: user says "i want to go sigiriya 5 day trip and my budget is 70000"
    print("\n--- TURN 1 ---")
    msg1 = types.Content(role="user", parts=[types.Part.from_text(text="i want to go sigiriya 5 dat trip and my budget is 70000")])
    tools1 = []
    text1 = []
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=msg1):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "function_call", None):
                    tools1.append(p.function_call.name)
                if getattr(p, "text", None):
                    text1.append(p.text)
    print("Turn 1 Tools:", tools1)
    reply1 = "\n\n".join(text1)
    print("Turn 1 Reply:\n", reply1[:400], "...\n")

    # Turn 2: user replies to the agent's question
    print("\n--- TURN 2 ---")
    msg2 = types.Content(role="user", parts=[types.Part.from_text(text="yes please recommend cheaper local guesthouses")])
    tools2 = []
    text2 = []
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=msg2):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "function_call", None):
                    tools2.append(p.function_call.name)
                if getattr(p, "text", None):
                    text2.append(p.text)
    print("Turn 2 Tools:", tools2)
    reply2 = "\n\n".join(text2)
    print("Turn 2 Reply:\n", reply2[:400], "...\n")

if __name__ == "__main__":
    asyncio.run(test_multiturn())
