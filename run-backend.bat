@echo off
echo Starting TourMate Backend on http://localhost:5000...
cd "%~dp0backend"
dotnet run --project TourMate.Api
