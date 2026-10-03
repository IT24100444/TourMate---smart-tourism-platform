import asyncio
import sys
import io

# Ensure utf-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.agent import app as adk_app
from app.app_utils import services
from google.adk.runners import Runner
from google.genai import types

async def main():
    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    user_id = "test_user_tourist"
    session_id = "session_tourist_100"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text="i want go nine arch, 6 days and around 90,000 budget")]
    )
    
    print("=== Sending User Message ===")
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message,
    ):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "text", None):
                    print(f"\n[AGENT SAYS]:\n{p.text}")
                elif getattr(p, "function_call", None):
                    print(f"\n[CALL TOOL]: {p.function_call.name}({p.function_call.args})")
                elif getattr(p, "function_response", None):
                    print(f"\n[TOOL RESPONSE]: {p.function_response.name}")

if __name__ == "__main__":
    asyncio.run(main())
