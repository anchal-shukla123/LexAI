# LexAI Architecture Overview

LexAI is a full-stack TypeScript MVP with a Next.js frontend, Express API, Prisma data layer, and PostgreSQL database. It supports both authenticated workspace mode and demo fallback mode.

## System Overview

```text
Next.js Frontend
-> API Client with optional JWT
-> Express API
-> Request Context Resolver
-> Prisma Services
-> PostgreSQL
```

The frontend is designed to stay usable if auth is missing or the backend is temporarily unavailable. The backend resolves each optional-auth request into either an authenticated workspace context or the seeded demo workspace context.

## Frontend Architecture

- Next.js App Router application under `frontend/`.
- TypeScript models in `frontend/types/api.ts`.
- API helpers in `frontend/lib/api-client.ts`.
- Auth helpers in `frontend/lib/auth-client.ts`.
- Auth storage events in `frontend/lib/auth-storage.ts`.
- Shared shell components under `frontend/components/layout/`.
- Page-level fallback states preserve a working demo experience.

The API client:

- Reads `NEXT_PUBLIC_API_URL`.
- Sends `Authorization: Bearer <token>` when `lexai_token` exists.
- Clears `lexai_token` and `lexai_auth` on 401 responses.
- Keeps frontend pages from going blank by allowing page-level fallbacks to render.

## Backend Architecture

- Express API under `backend/src/`.
- Route composition in `backend/src/routes/api.routes.ts`.
- Feature modules for auth, demo, documents, uploads, analysis, reports, and chat.
- Shared async error handling and response envelopes.
- Prisma client access through backend services.

Primary API groups:

- `/auth`
- `/demo`
- `/documents`
- `/reports`
- `/chat`

## Database Architecture

PostgreSQL is accessed through Prisma. The schema models the MVP workflow around:

- Users
- Workspaces
- Workspace memberships
- Documents
- File metadata
- Analysis jobs
- Clause findings
- Risk findings
- Recommendations
- Reports
- Export jobs
- Chat sessions and messages
- Audit logs

The seeded demo workspace is important because optional-auth routes need demo data when no token is present.

## Auth Model

LexAI uses local email/password auth for the MVP:

- Passwords are hashed with `bcryptjs`.
- JWTs are issued on signup/login.
- The frontend stores the token in local storage as `lexai_token`.
- Auth metadata is stored as `lexai_auth`.
- Logout clears local auth state and redirects to login.
- Refresh tokens are not implemented.

## Demo Fallback Model

Optional-auth routes support two modes:

- `auth`: valid JWT resolves to the user's workspace.
- `demo`: no JWT resolves to the seeded demo workspace.

This model keeps dashboard, documents, reports, analysis, and chat explorable without strict route protection. The frontend shell reflects this with `Signed in` and `Demo Mode` states.

## Upload and Analyze Flow

```text
Upload Page
-> POST /documents
-> POST /documents/:id/upload
-> POST /documents/:id/analyze
-> Prisma transaction
-> Analysis page
```

The upload page creates a document, attaches a file, requests analysis, and redirects to the analysis page with the created document ID.

## AI Mock Provider Model

The current AI layer is a mock provider. It generates realistic MVP analysis records but does not perform real OCR, extraction, semantic retrieval, or LLM reasoning.

Current mock outputs include:

- Risk score.
- Clause findings.
- Risk findings.
- Recommendations.
- Summary/report content.
- Chat/report context data.

Future production work should replace this with OCR, extraction, embeddings/retrieval, and LLM-backed analysis.

## Report Model

Reports are linked to documents and preserve analysis snapshots. The frontend can list reports and open report detail views. Export job structures exist in the API types, but production-grade export storage and background job handling are future work.

## Error Handling

The API returns consistent success and error envelopes. Frontend pages use API failures to show fallback content rather than blank states. The API client clears local auth state on 401 so the app can return to demo fallback behavior after reload or navigation.

## Security Notes

- JWT secret must be configured outside source control.
- `.env` files must not be committed.
- Passwords are hashed with `bcryptjs`.
- Demo Mode is not a security boundary.
- Local storage token handling is acceptable for MVP demonstration but should be revisited for production.
- Real production deployments should add stronger CORS, rate limiting, audit logging, secure cookies or hardened token storage, and environment-specific secrets management.

## Future Production Architecture

Potential production additions:

- Managed PostgreSQL.
- Object storage for uploads and report exports.
- Background workers for OCR and AI jobs.
- OCR service and document parsing pipeline.
- LLM provider abstraction with evaluation and guardrails.
- Vector storage for retrieval-augmented chat.
- Team roles and workspace invitations.
- Refresh-token rotation or secure cookie session strategy.
- Observability, tracing, and structured audit logs.
