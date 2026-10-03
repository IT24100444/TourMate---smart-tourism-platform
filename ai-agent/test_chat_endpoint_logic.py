import asyncio
import re
import uuid
from app.agent import app as adk_app
from app.app_utils import services
from google.adk.runners import Runner
from google.genai import types

async def test_chat():
    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    user_id = "test_user_chat"
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    
    msg = types.Content(role="user", parts=[types.Part.from_text(text="i want go nine arch, 6 days and around 90,000 budget")])
    tools_called = []
    text_parts = []
    
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=msg,
    ):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "function_call", None):
                    tools_called.append(p.function_call.name)
                if getattr(p, "text", None):
                    text_parts.append(p.text)
                    
    reply = "\n\n".join(text_parts)
    print("SESSION ID:", session_id)
    print("TOOLS CALLED:", tools_called)
    print("REPLY LENGTH:", len(reply))
    print("REPLY PREVIEW:", reply[:300].encode('ascii', errors='ignore').decode('ascii'))

if __name__ == "__main__":
    asyncio.run(test_chat())
