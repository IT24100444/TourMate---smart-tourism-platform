@echo off
echo Starting TourMate AI (Google ADK 2.0 + Gemini 3.5 Flash-Lite) on http://localhost:8000...
cd "%~dp0tourmate-ai"
uv run python -m app.fast_api_app
