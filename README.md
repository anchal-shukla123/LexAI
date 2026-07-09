# LexAI

AI-powered contract and legal document intelligence SaaS.

[![Full-stack MVP](https://img.shields.io/badge/Full--stack-MVP-2563eb)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](#)
[![Express](https://img.shields.io/badge/Express-TypeScript-111827)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-316192)](#)
[![JWT Auth](https://img.shields.io/badge/JWT-Auth-7c3aed)](#)
[![Live Demo](https://img.shields.io/badge/Live-Demo-16a34a)](https://lex-ai-frontend-opal.vercel.app/)

LexAI is a full-stack MVP in the ApexGroup product ecosystem. It gives legal, operations, and startup teams a premium workspace for uploading contracts, running rule-based analysis, reviewing clause and risk findings, generating reports, rewriting clauses, preparing negotiation packs, and exploring document-aware chat flows.

Built by Anchal Shukla.

## Live Demo

Frontend:
https://lex-ai-frontend-opal.vercel.app/

The live demo uses hosted backend APIs and demo/test data. The current intelligence layer is deterministic and rule-based for MVP demonstration; it does not call paid LLM APIs.

## Overview

LexAI demonstrates the product and engineering foundation for a legal document intelligence platform. The current app includes a polished Next.js frontend, an Express + TypeScript API, PostgreSQL persistence through Prisma, JWT-based authentication, document upload, rule-based extraction and risk persistence, reports, chat detail views, rewrite persistence, negotiation packs, exports, and an auth-aware workspace shell.

The current AI layer is deterministic and rule-based. It persists realistic analysis outputs so the full product flow can be demonstrated without claiming production legal reasoning. Paid LLM integrations are not required for the MVP.

## Project Documentation

- [Case Study](docs/CASE_STUDY.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Demo Guide](docs/DEMO_GUIDE.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Local Development](docs/LOCAL_DEVELOPMENT.md)
- [API Overview](docs/API_OVERVIEW.md)
- [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)
- [MVP Checklist](docs/MVP_CHECKLIST.md)
- [Screenshot Guide](docs/SCREENSHOTS.md)

## Key Features

- Premium SaaS dashboard with workspace-aware data.
- Auth signup, login, logout, and authenticated workspace mode.
- Demo Auth Mode fallback when no token is present, with real document routes kept separate from demo fallback content.
- Document create and upload flow for legal files.
- Rule-based extraction, clause, risk, and recommendation persistence in PostgreSQL.
- Clause findings, risk findings, and recommendations.
- Report generation and report detail views.
- Persisted clause rewrites with accepted/rejected/draft status.
- Negotiation pack and deterministic counterparty email generator.
- AI chat mock grounding against seeded or uploaded document context.
- Documents library with backend-backed data and fallback content.
- Settings/profile page for workspace presentation.
- Auth-aware shell with `Signed in` and `Demo Mode` states.

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-compatible UI primitives
- Framer Motion
- lucide-react icons

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- bcryptjs
- multer

### Development

- npm workspaces
- Prisma Studio
- ESLint
- TypeScript
- Docker Compose support for local infrastructure

## Architecture

```text
Next.js Frontend
-> API client with optional JWT
-> Express API
-> Request context resolver
-> Prisma services
-> PostgreSQL
```

The frontend sends an `Authorization: Bearer <token>` header when `lexai_token` exists. Backend routes that support optional authentication use the authenticated workspace when a valid JWT is provided and fall back to the seeded demo workspace when no token is provided.

## Screens

- Landing page
- Login and signup
- Dashboard
- Documents
- Upload
- Contract analysis
- AI chat
- Reports
- Settings

## Screenshots

All screenshots use demo/test data. No real legal documents or secrets are shown.

### Landing Page
![Landing Page](assets/screenshots/landing.png)

### Dashboard
![Dashboard](assets/screenshots/dashboard-auth.png)

### Upload Flow
![Upload Flow](assets/screenshots/Screenshot%202026-07-04%20123820.png)

### Contract Analysis
![Contract Analysis](assets/screenshots/Screenshot%202026-07-04%20123901.png)

### AI Chat
![AI Chat](assets/screenshots/ai-chat.png)

### Reports
![Reports](assets/screenshots/report.png)

### Report Analysis
![Report Analysis](assets/screenshots/report-analysis.png)

### Settings
![Settings](assets/screenshots/settings.png)

### Documents
![Documents](assets/screenshots/documents.png)

### Login
![Login](assets/screenshots/login.png)

### Signup
![Signup](assets/screenshots/signup.png)

### Dashboard Demo Mode
![Dashboard Demo Mode](assets/screenshots/dashboard-demo.png)

See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for the recommended capture list, file names, and safety notes.

## Backend Capabilities

- Auth session creation with hashed passwords and JWTs.
- Auth-aware request context resolution.
- Demo workspace fallback for optional-auth routes.
- Document CRUD.
- File upload metadata through multer.
- Mock analysis generation and persistence.
- Report listing and report detail retrieval.
- Chat session detail retrieval.
- Standard success, paginated, and error response envelopes.

## Local Setup

### Prerequisites

- Node.js 22 LTS recommended.
- npm 10+.
- PostgreSQL running locally.
- Optional: Docker Desktop if using the Docker Compose workflow.

### Install Dependencies

Windows:

```bash
npm.cmd install
```

Cross-platform:

```bash
npm install
```

### Environment Files

Create backend and frontend environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Do not commit `.env` files.

## Environment Variables

### Backend

```bash
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/lexai?schema=public"
JWT_SECRET="replace-with-a-long-development-secret"
JWT_EXPIRES_IN="7d"
PORT=8000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000
```

### Frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

Generate Prisma client:

```bash
npm.cmd run prisma:generate --workspace backend
```

If Prisma fails on Windows with an `EPERM` rename error for `query_engine-windows.dll.node`, see [Local Development](docs/LOCAL_DEVELOPMENT.md).

Run migrations:

```bash
npm.cmd run prisma:migrate --workspace backend
```

Seed demo data:

```bash
npm.cmd run db:seed --workspace backend
```

Open Prisma Studio:

```bash
npm.cmd run prisma:studio --workspace backend
```

## Running the App

Start the backend:

```bash
npm.cmd run dev --workspace backend
```

Start the frontend:

```bash
npm.cmd run dev --workspace frontend
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Backend readiness: `http://localhost:8000/ready`
- API root: `http://localhost:8000/api/v1`

## Demo Flow

1. Open the landing page.
2. Sign up or log in.
3. Confirm the shell shows `Signed in`.
4. Open the dashboard.
5. Upload a PDF, DOCX, PNG, JPG, or JPEG.
6. Let the create/upload/analyze flow complete.
7. Open the analysis page.
8. Review risk score, clause findings, risk findings, and recommendations.
9. Open a generated report.
10. Review clauses.
11. Generate and accept a clause rewrite.
12. Open the negotiation pack.
13. Generate and copy a professional counterparty email.
14. Export the PDF report.
15. Open AI chat from the analysis flow.
16. Visit settings.
17. Log out.
18. Confirm unauthenticated pages clearly show `Demo Auth Mode` rather than fake data on real document routes.

## API Highlights

Base URL:

```text
http://localhost:8000/api/v1
```

Key endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /demo/dashboard`
- `GET /documents`
- `POST /documents`
- `GET /documents/:documentId`
- `PATCH /documents/:documentId`
- `DELETE /documents/:documentId`
- `POST /documents/:documentId/upload`
- `POST /documents/:documentId/analyze`
- `GET /reports`
- `GET /reports/:reportId`
- `GET /chat/sessions/:sessionId`

See [docs/API_OVERVIEW.md](docs/API_OVERVIEW.md) for more detail.

## Deployment

LexAI can be deployed with:

- Frontend on Vercel
- Backend on Render/Railway
- PostgreSQL on Neon/Supabase/Render/Railway

The frontend is currently deployed at:

```text
https://lex-ai-frontend-opal.vercel.app/
```

The deployed frontend reads the backend API base URL from `NEXT_PUBLIC_API_URL`. The backend must allow the Vercel frontend origin in CORS configuration, for example through `CORS_ORIGIN=https://lex-ai-frontend-opal.vercel.app`.

See [docs/DEPLOYMENT_PLAN.md](docs/DEPLOYMENT_PLAN.md) and [docs/PRODUCTION_ENV.md](docs/PRODUCTION_ENV.md) for the deployment architecture, environment variables, migration strategy, CORS notes, and smoke tests.

Current MVP uses local file storage for uploads. Production upload persistence should use S3-compatible storage.

## Current Limitations

- AI analysis is mocked and deterministic enough for MVP demonstration.
- OCR and real LLM reasoning are not implemented yet.
- Uploaded file storage is local/development-oriented.
- No refresh-token rotation.
- No production billing, teams, permissions matrix, or deployment hardening yet.
- Legal outputs are demo intelligence and should not be treated as legal advice.

## Roadmap

- Real OCR and document extraction pipeline.
- LLM-backed clause analysis and chat grounding.
- Production object storage for uploaded files and exports.
- Team roles, invitations, and workspace administration.
- Report export jobs with durable storage.
- Audit-ready activity history and admin reporting.
- Deployment hardening for production environments.

## Suggested GitHub Topics

`nextjs`, `typescript`, `express`, `prisma`, `postgresql`, `saas`, `ai`, `legaltech`, `contract-analysis`, `jwt-auth`, `full-stack`

## Author

Built by Anchal Shukla as part of the ApexGroup product ecosystem.
