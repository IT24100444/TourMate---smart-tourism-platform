import asyncio
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.runners import Runner
from google.genai import types
from app.config import config
from app.app_utils import services
from app.tools_catalog import (
    search_attractions,
    search_accommodations_and_dining,
    calculate_budget_feasibility,
    check_weather_and_seasonality,
    get_destination_insights,
)
from app.agent import security_checkpoint_tool

gemini_model = Gemini(
    model=config.model,
    retry_options=types.HttpRetryOptions(attempts=3),
)

direct_agent = Agent(
    name="tourmate_direct",
    model=gemini_model,
    instruction=(
        "You are TourMate AI — the leading Agentic AI Tourism Concierge for Sri Lanka.\n"
        "You help tourists plan verified, realistic, culturally respectful, and budget-conscious travel itineraries.\n\n"
        "Instructions:\n"
        "1. Always check security using security_checkpoint_tool.\n"
        "2. Use search_attractions and search_accommodations_and_dining to find real Sri Lankan sights, hotels, and restaurants with transparent LKR pricing.\n"
        "3. Use calculate_budget_feasibility to check costs against the user's mind budget.\n"
        "4. If the user's budget in mind is less than the actual estimated costs (e.g. 90,000 budget vs 145,000 actual), DO NOT approve silently! Instead, discuss with the tourist, ask back questions, suggest cheaper homestays, reducing days, or ask if they are okay with the higher cost.\n"
        "5. Be helpful, engaging, and conversational like a real human travel guide."
    ),
    tools=[
        security_checkpoint_tool,
        search_attractions,
        search_accommodations_and_dining,
        calculate_budget_feasibility,
        check_weather_and_seasonality,
        get_destination_insights,
    ],
)

test_app = App(root_agent=direct_agent, name="test_direct_app")

async def main():
    runner = Runner(
        app=test_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    user_id = "test_user_direct"
    session_id = "sess_direct_test_1"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text="i want go nine arch, 6 days and around 90,000 budget")]
    )
    
    print("=== Sending Message to Direct Agent ===")
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message,
    ):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "text", None):
                    print(f"\n[AGENT RESPONSE]:\n{p.text}")
                elif getattr(p, "function_call", None):
                    print(f"\n[TOOL CALL]: {p.function_call.name}")
                elif getattr(p, "function_response", None):
                    print(f"\n[TOOL DONE]: {p.function_response.name}")

if __name__ == "__main__":
    asyncio.run(main())
