# JobTrackr

ASP.NET Core 9 + React job-search workspace. Pipeline tracking, AI fit-analysis and cover letters, AI interview prep with answer grading, pipeline analytics, public profiles, and resume management. Backed by Postgres (Supabase) and Google Gemini.

## Table of contents

1. [Live demo](#live-demo)
2. [Feature tour](#feature-tour)
3. [Architecture](#architecture)
4. [Stack](#stack)
5. [Run it locally](#run-it-locally)
6. [Environment variables](#environment-variables)
7. [API reference](#api-reference)
8. [How JWT auth works here](#how-jwt-auth-works-here)
9. [How the AI features work](#how-the-ai-features-work)
10. [Project layout](#project-layout)
11. [Testing](#testing)
12. [Deploying](#deploying)

## Live demo

| | URL |
|---|---|
| Web app | <http://localhost:4173> (after `docker compose up`) |
| Swagger | <http://localhost:8080/swagger> |
| Health | <http://localhost:8080/health> |

If you've deployed it, replace those with your hosted URLs.

## Feature tour

| Page | What it does |
|---|---|
| **`/` Landing** | Marketing page with hero, live dashboard preview, AI capabilities showcase (fit analysis, cover letters, interview questions, answer grading), feature grid, and tech-stack pills. |
| **`/login`, `/register`** | Email + password auth. Returns a JWT, stored in `localStorage` with expiry checking on page load. |
| **`/dashboard`** | The pipeline. Search, filter by status, sort, pagination, KPI cards by status, **inline create + edit forms**, delete. Per-user isolated; every query filters on `userId`. |
| **`/analytics`** | Pipeline insights. Total / interview rate / offer rate KPIs, hand-rolled SVG funnel chart, status breakdown, weekly velocity time-series. |
| **`/assistant`** (AI) | Paste a JD + your resume → fit score (0–100), strengths, gaps, suggested keywords, summary. One click drafts a 250–350 word cover letter. |
| **`/prep`** (AI) | Paste a JD → Gemini generates 3–15 likely interview questions categorized by Behavioral / Technical / System Design / Role-specific / Culture fit. Type your answer → AI grades it 0–100, lists strengths and improvements, and shows a model answer. |
| **`/settings`** | Toggle public profile + slug. Upload / list / download / delete resumes (PDF / DOC / DOCX / TXT / MD up to 5 MB). |
| **`/u/:slug`** | Anonymized public stats page (no companies, no notes, no auth required). Shows funnel + KPIs + weekly velocity. |

**Theme system**: light / dark / system, persisted to `localStorage`, instant switch from any page.

## Architecture

Clean Architecture (Onion). Four projects, dependencies flow inward:

```
+---------------------------+
|  JobTrackr.Api            |   ASP.NET host: controllers, middleware, Program.cs
+--------------+------------+
               |
               v
+---------------------------+
|  JobTrackr.Infrastructure |   EF Core, Postgres, JWT issuer, BCrypt, Gemini client, file storage
+--------------+------------+
               |
               v
+---------------------------+
|  JobTrackr.Application    |   Business logic, DTOs, validators, *interfaces (ports)*
+--------------+------------+
               |
               v
+---------------------------+
|  JobTrackr.Domain         |   Entities, enums — POCOs, no dependencies
+---------------------------+
```

**Rule**: arrows only point inward. Domain knows nothing about EF, Gemini, JWT, or HTTP. Application defines interfaces (`IApplicationDbContext`, `IAssistantService`, `IJwtTokenService`, `IFileStorage`); Infrastructure implements them. This means you can swap Postgres for SQL Server, or Gemini for OpenAI, without touching business logic.

## Stack

| Concern | Choice |
|---|---|
| Runtime | .NET 9 |
| Framework | ASP.NET Core 9 Web API |
| ORM | Entity Framework Core 9 (Npgsql) |
| Database | PostgreSQL (Supabase) |
| Auth | JWT bearer (HS256), BCrypt password hashing |
| Validation | FluentValidation |
| Logging | Serilog |
| API docs | Swashbuckle / Swagger UI |
| AI | Google Gemini 2.5 Flash (REST, structured output) |
| File storage | `IFileStorage` abstraction, local disk |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Tests | xUnit, FluentAssertions, Moq, `Microsoft.AspNetCore.Mvc.Testing`, EF InMemory |
| Container | Multi-stage Dockerfiles |
| Reverse proxy | nginx in the web container |
| CI | GitHub Actions |

## Run it locally

### Prerequisites

- **Docker Desktop** (only requirement for the easy path)
- A free **Supabase** account → create a project (any region)
- A free **Google Gemini** API key → <https://aistudio.google.com/apikey>

### Steps

1. **Clone the repo** and `cd` into it.

2. **Create `.env`** from the template and fill in the 5 Supabase fields + your Gemini key:
   ```bash
   cp .env.example .env
   ```
   You need the Supabase **session pooler** connection details (host, port=5432, user=`postgres.<project-ref>`, password). See the comments in `.env.example`.

3. **Bring the stack up**:
   ```bash
   docker compose up -d --build
   ```
   First build pulls the .NET 9 SDK + Node 22 images (~700 MB total). Subsequent runs are seconds.

4. **Open it**:
   - Web app: <http://localhost:4173>
   - API + Swagger: <http://localhost:8080/swagger>

   Migrations apply automatically on first start. Register a fresh account, add a few applications, try the AI assistant and interview prep.

### Common commands

```powershell
# Tail API logs
docker logs -f jobtrackr-api

# Tail nginx logs (web)
docker logs -f jobtrackr-web

# Stop everything (data preserved in Supabase)
docker compose down

# Stop and wipe local volumes (uploaded resumes — Supabase data unaffected)
docker compose down -v

# Rebuild after a code change
docker compose up -d --build

# Run unit + integration tests (needs .NET 9 SDK on the host)
dotnet test
```

## Environment variables

Every secret/port/setting is parameterized through `.env`. See `.env.example` for the documented template.

| Group | Vars |
|---|---|
| Postgres (Supabase) | `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD` |
| API | `ASPNETCORE_ENVIRONMENT`, `API_PORT`, `STORAGE_ROOT` |
| JWT | `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_KEY` (≥32 chars), `JWT_EXPIRES_IN_MINUTES` |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_TEMPERATURE` |
| Web | `WEB_PORT` |

The compose file resolves them; `.env` is gitignored, `.env.example` is committed.

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account; returns JWT |
| `POST` | `/api/auth/login` | — | Log in; returns JWT |
| `GET` | `/api/users/me` | JWT | Current user profile |
| `PUT` | `/api/users/me/public-profile` | JWT | Toggle public + set slug |
| `GET` | `/api/job-applications` | JWT | List with `?search=&status=&sortBy=&sortDescending=&page=&pageSize=` |
| `GET` | `/api/job-applications/{id}` | JWT | One application |
| `POST` | `/api/job-applications` | JWT | Create |
| `PUT` | `/api/job-applications/{id}` | JWT | Update |
| `DELETE` | `/api/job-applications/{id}` | JWT | Delete |
| `GET` | `/api/job-applications/stats` | JWT | Funnel + KPIs + weekly velocity |
| `GET` | `/api/resumes` | JWT | List uploaded resumes |
| `POST` | `/api/resumes` | JWT | Upload (multipart) |
| `GET` | `/api/resumes/{id}` | JWT | Download |
| `DELETE` | `/api/resumes/{id}` | JWT | Delete |
| `GET` | `/api/assistant/status` | JWT | Whether `GEMINI_API_KEY` is set |
| `POST` | `/api/assistant/analyze-jd` | JWT | Fit analysis |
| `POST` | `/api/assistant/cover-letter` | JWT | Tailored draft |
| `POST` | `/api/assistant/interview-questions` | JWT | Generate categorized questions |
| `POST` | `/api/assistant/grade-answer` | JWT | Score + feedback |
| `GET` | `/api/public/{slug}/stats` | — | Anonymous stats page |
| `GET` | `/health` | — | Liveness |

All errors use **RFC 7807 `application/problem+json`**. Validation failures populate the `errors` dictionary keyed by property name.

## How JWT auth works here

1. **Register / login** via `AuthController`. `AuthService`:
   - Validates with FluentValidation.
   - Looks up / creates the `User` row (email is unique, lowercased).
   - Verifies the password using **BCrypt** (`PasswordHasher.Verify`). The stored value is salted, never plaintext.
   - `IJwtTokenService.CreateToken` builds a signed JWT with claims `sub` (user id), `email`, `name`, `jti`.
2. The client stores the JWT and sends it on every request as `Authorization: Bearer <token>`.
3. `AddJwtBearer` middleware (configured in `Infrastructure/DependencyInjection.cs`) validates signature / issuer / audience / lifetime on every request, populates `HttpContext.User`.
4. `CurrentUserService` reads the `sub` claim and exposes `UserId` to the application layer through `ICurrentUserService`. Services never touch `HttpContext`.
5. `[Authorize]` on protected controllers rejects unauthenticated requests with 401.
6. **Tenancy**: every query in `JobApplicationService`, `ResumeService`, `UserProfileService` filters by `_currentUser.UserId`. A valid token doesn't let you read someone else's data; a unit test enforces this.

## How the AI features work

Four endpoints, all routed through your own ASP.NET API, all calling Google Gemini server-side. Your `GEMINI_API_KEY` never reaches the browser.

```
[ React ] → [ ASP.NET API ] → [ Gemini /v1beta/models/{model}:generateContent ]
            (validates input,
             constructs system + user prompts,
             requests structured JSON output,
             parses + maps to typed DTOs)
```

| Endpoint | Prompt strategy | Output shape |
|---|---|---|
| `analyze-jd` | System prompt asks for fit analysis; uses Gemini **`responseSchema`** for guaranteed JSON | `{ fitScore, strengths[], gaps[], suggestedKeywords[], summary }` |
| `cover-letter` | Free-form generation, "ONLY the cover letter body, 250–350 words" | Plain text |
| `interview-questions` | System prompt with category enum + difficulty enum, **`responseSchema`** for typed array | `{ questions: [{ question, category, difficulty, whyAsked }] }` |
| `grade-answer` | "Score 0-100, strengths, improvements, model answer" with **`responseSchema`** | `{ score, strengths[], improvements[], modelAnswer }` |

The `IAssistantService` interface lives in the Application layer with no LLM dependencies; the `GeminiAssistantService` implementation lives in Infrastructure. Swapping providers (Anthropic / OpenAI / local Ollama) is a single class change.

## Project layout

```
JobTrackr/
├── README.md
├── docker-compose.yml          # postgres-less; talks to Supabase. Reads .env.
├── Dockerfile                  # API multi-stage (sdk → aspnet)
├── .env.example  .env
├── .gitignore  .editorconfig  .dockerignore
├── .github/workflows/ci.yml    # GitHub Actions — restore, build, test
│
├── src/
│   ├── JobTrackr.Domain/                 # POCO entities, no deps
│   │   ├── Common/BaseEntity.cs
│   │   ├── Enums/ApplicationStatus.cs
│   │   └── Entities/                     # User, JobApplication, InterviewEvent, Resume
│   │
│   ├── JobTrackr.Application/            # Business logic + ports
│   │   ├── Common/
│   │   │   ├── Interfaces/               # IApplicationDbContext, ICurrentUserService,
│   │   │   │                             # IJwtTokenService, IPasswordHasher, IFileStorage
│   │   │   ├── Exceptions/               # NotFoundException, ValidationException, UnauthorizedException
│   │   │   └── Models/PagedResult.cs
│   │   ├── Auth/                         # DTOs + Validators + AuthService
│   │   ├── JobApplications/              # DTOs + Validators + Service + StatsDtos
│   │   ├── Users/                        # Profile DTOs + Service
│   │   ├── Resumes/                      # DTOs + Service
│   │   ├── Assistant/                    # AI DTOs + IAssistantService
│   │   └── DependencyInjection.cs        # AddApplication() — DI registration
│   │
│   ├── JobTrackr.Infrastructure/         # Adapters: implementations
│   │   ├── Persistence/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── Configurations/           # IEntityTypeConfiguration<T> per entity
│   │   │   └── Migrations/               # EF Core migrations (checked in)
│   │   ├── Identity/                     # JwtTokenService, PasswordHasher, JwtSettings
│   │   ├── Services/CurrentUserService.cs
│   │   ├── Storage/LocalDiskFileStorage.cs
│   │   ├── Assistant/                    # GeminiAssistantService, GeminiSettings
│   │   └── DependencyInjection.cs        # AddInfrastructure(): EF + JWT + Gemini + storage
│   │
│   └── JobTrackr.Api/                    # ASP.NET host
│       ├── Program.cs                    # Pipeline, Serilog, Swagger, CORS, migrate-on-start
│       ├── appsettings.json              # Defaults (overridden by env vars)
│       ├── Controllers/                  # Auth, JobApplications, Users, Resumes, Public, Assistant
│       └── Middleware/ExceptionHandlingMiddleware.cs
│
├── tests/
│   ├── JobTrackr.UnitTests/              # Service-level (EF InMemory + Moq)
│   └── JobTrackr.IntegrationTests/       # Full HTTP via WebApplicationFactory<Program>
│       ├── ApiFactory.cs                 # Supports IAssistantService override for AI tests
│       └── Controllers/
│           ├── JobApplicationsEndpointsTests.cs
│           └── AssistantEndpointsTests.cs    # 10 tests, mocked Gemini
│
└── client/                               # React + Vite + TypeScript + Tailwind
    ├── package.json  vite.config.ts  tailwind.config.js
    ├── Dockerfile  nginx.conf            # node build → nginx serve
    ├── index.html
    └── src/
        ├── main.tsx  App.tsx  index.css  types.ts
        ├── api/                          # Typed clients: client, auth, jobApplications,
        │                                 #                stats, users, resumes, assistant
        ├── auth/                         # AuthContext, ProtectedRoute
        ├── theme/ThemeContext.tsx
        ├── components/                   # Layout, ApplicationForm, StatusBadge, ThemeToggle,
        │                                 #             charts/{FunnelChart, TimeSeriesChart}
        └── pages/                        # Landing, Login, Register, Dashboard, Analytics,
                                          # Assistant, Prep, Settings, PublicProfile
```

## Testing

```bash
dotnet test
```

- **`JobTrackr.UnitTests`**: service-level tests with EF Core's InMemory provider, validating filtering, ownership, and validation rules.
- **`JobTrackr.IntegrationTests`**: `WebApplicationFactory<Program>` spins up the entire ASP.NET pipeline. Postgres is swapped for InMemory, and `IAssistantService` is replaced with a Moq fake so AI tests don't hit Gemini.
- AI controller coverage: the 10 tests in `AssistantEndpointsTests` cover happy-path, missing-key (503), missing-input (400), and unauthenticated (401) cases for all four AI endpoints.

## Deploying

The repo includes a **`render.yaml`** at the root for one-click deploy on Render. To use it:

1. Push the repo to GitHub.
2. Sign in at <https://render.com> → **New → Blueprint** → connect the GitHub repo.
3. Render reads `render.yaml`, provisions the API and Web services.
4. After services are created, set the secrets in each service's **Environment** tab:
   - **API service**: `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `JWT_KEY`, `GEMINI_API_KEY`
   - **Web service**: `VITE_API_URL` (the URL of your API service, e.g. `https://jobtrackr-api.onrender.com`)
5. Deploy. Render builds the Docker images and runs them.

Migrations run automatically on first API start, so the Supabase database is set up without manual steps.

Other options: Fly.io, Railway (autodetects `docker-compose.yml`), or Coolify for self-hosting.
