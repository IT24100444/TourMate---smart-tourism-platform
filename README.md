# TourMate - Unified Sri Lanka Tourism & Multi-Agent AI Platform

[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![React 18](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-teal.svg)](https://tailwindcss.com/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev/)
[![LangGraph AI](https://img.shields.io/badge/AI-LangGraph_Multi--Agent-orange.svg)](https://python.langchain.com/)
[![PostgreSQL Neon](https://img.shields.io/badge/Database-PostgreSQL_Neon_Cloud-green.svg)](https://neon.tech/)

TourMate is an enterprise-grade tourism platform focused on Sri Lanka that seamlessly integrates destination discovery, hotel/restaurant management, bookings, reviews, interactive maps, and an auditable LangGraph-powered Agentic AI trip planner.

---

## 1. Monorepo Folder Structure

```text
Tour Mate/
├── backend/                       # ASP.NET Core 8 Clean Architecture Web API
│   ├── TourMate.sln
│   ├── TourMate.Domain/          # Core Domain Entities, Enums & Rules across Components A-D
│   ├── TourMate.Application/     # DTOs, Services, Repository & Security Interfaces
│   ├── TourMate.Infrastructure/  # EF Core, PostgreSQL (Neon Cloud) DbContext, JWT Auth, AI Client
│   ├── TourMate.Api/             # REST Controllers, Swagger OpenAPI, Global Error Handling
│   └── TourMate.UnitTests/       # Business Rule & Component Validation Tests
├── web/                          # React + Tailwind CSS Web Application
│   ├── src/features/tourism-places/  # Component A: Place Catalogue & Moderation Queue
│   ├── src/features/businesses/      # Component B: Hotel/Dining Profiles, Offers & Inventory
│   ├── src/features/bookings/        # Component C: Booking Queue & Status Transitions
│   ├── src/features/ai-workflows/    # Component D: LangGraph Execution Monitor & Approval Gate
│   └── src/auth/                     # Role Switcher (Administrator / BusinessOwner)
├── mobile/                       # Flutter Tourist Mobile Application
│   ├── lib/features/explore/     # Component A: Places Discovery & GPS Map Preview
│   ├── lib/features/businesses/  # Component B: Hotel & Restaurant Listings
│   ├── lib/features/bookings/    # Component C: Booking Checkout & Review Submission
│   └── lib/features/trips/       # Component D: AI Trip Planner & Human Approval Gate
├── ai-service/                   # Python Multi-Agent AI Subsystem
│   ├── app/agents/               # Planner, Discovery, Accommodation, & Feasibility Agents
│   ├── app/tools/                # Allow-listed least-privilege tools
│   ├── app/validators/           # Deterministic Budget & Feasibility Validator
│   └── app/graph.py              # LangGraph-compatible stateful graph with Approval Pause
└── docs/                         # Architecture, API Contracts, Database Schema & ADRs
```

---

## 2. Four Academic Component Ownership Model

| Component | Business Capability | Academic Lead | Distinct Agentic AI Contribution |
|---|---|---|---|
| **A** | Tourism Place Discovery & Destination Management | **Member 1** (Full) | **Tourism Discovery Agent**: Queries approved attractions with duration, distance, and reasons. |
| **B** | Accommodation & Restaurant Management | **Member 2** (Full) | **Accommodation & Dining Agent**: Matches verified hotels/restaurants to budget & dates. |
| **C** | Booking, Reservation & Traveller Engagement | **Member 3** (Full) | **Booking Feasibility Agent**: Assesses slot availability, timing conflicts, and cancellation rules. |
| **D** | Intelligent Trip Planning & Recommendation | **Member 4** (Full) | **Planner / Coordinator Agent**: Graph orchestration, deterministic validation, and human approval pause. |

---

## 3. Getting Started & Running Locally

### Step 1: ASP.NET Core 8 Web API (`backend/`)
```bash
cd backend
dotnet restore
dotnet test                                     # Runs business rule unit tests
dotnet run --project TourMate.Api               # Starts API on http://localhost:5000
```
- **Swagger Documentation**: Available at `http://localhost:5000` (or `http://localhost:5000/swagger`)
- **Health Check**: `http://localhost:5000/api/v1/health`

### Step 2: React Web Application (`web/`)
```bash
cd web
npm install
npm run dev                                     # Starts React Vite dev server on http://localhost:5173
```
- Includes quick-switch between **Admin Portal** and **Business Owner Dashboard** at the top bar.

### Step 3: Multi-Agent AI Service (`ai-service/`)
```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
- Test multi-agent evaluation: `python tests/test_agents.py`

### Step 4: Flutter Mobile Tourist App (`mobile/`)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 4. Database Setup (PostgreSQL with Neon Cloud)

1. Sign up or log into [Neon Cloud](https://neon.tech/) and create a PostgreSQL project named `tourmate_db`.
2. Copy your pooled connection string:
   ```text
   Host=ep-xxxxxx.us-east-2.aws.neon.tech;Database=tourmate_db;Username=tourmate_user;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
   ```
3. Update `ConnectionStrings:DefaultConnection` in `backend/TourMate.Api/appsettings.json`.
4. Run EF Core migrations:
   ```bash
   dotnet ef database update --project backend/TourMate.Infrastructure --startup-project backend/TourMate.Api
   ```
> **Note**: TourMate includes an automatic in-memory fallback so the API runs and self-seeds rich Sri Lanka tourism data out of the box even before configuring Neon credentials!

---

## 5. Flagship 2-Day Ella Assessed Workflow

1. **Tourist Objective**: In Flutter Mobile or React, submit: *"Plan a 2-day Ella trip for LKR 40,000. I like nature, hiking and local food."*
2. **Backend Gateway**: ASP.NET Core validates DTOs, JWT, and initializes `AIWorkflowRun` in PostgreSQL.
3. **Multi-Agent Orchestration**:
   - **Planner Agent**: Builds DAG for 2-day Ella trip.
   - **Tourism Discovery Agent**: Queries approved attractions (Nine Arch Bridge, Little Adam's Peak, Ella Rock).
   - **Accommodation Agent**: Selects Ella Gap Eco Resort & Cafe Chill.
   - **Booking Feasibility Agent**: Verifies slots and ensures total LKR 35,500 <= LKR 40,000 budget.
   - **Deterministic Validator**: Enforces strict mathematical limits.
4. **Human-In-The-Loop Approval**: Workflow enters `WAITING_APPROVAL`.
5. **Decision**: Tourist or Admin taps **"Approve & Execute"** -> Reservations are committed to PostgreSQL with zero hallucinations.
