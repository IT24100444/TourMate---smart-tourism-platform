import asyncio
import traceback
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
    user_id = "test_user_direct"
    session_id = "session_direct_1"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text="i want go nine arch, 6 days and around 90,000 budget")]
    )
    
    print("Starting runner.run_async...")
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        ):
            print(f"Event: {event}")
    except Exception as e:
        print(f"EXCEPTION CAUGHT: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
