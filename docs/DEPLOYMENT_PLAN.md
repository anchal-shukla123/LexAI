# LexAI Deployment Plan

## 1. Deployment Goal

Deploy the LexAI MVP as a public portfolio-ready full-stack application without changing current product behavior. The deployment should preserve demo mode, authenticated workspace flows, upload/analyze demo behavior, reports, and chat views while moving runtime configuration into managed hosting environments.

This plan does not deploy LexAI automatically. It defines a safe MVP deployment path and the production gaps to resolve before handling real legal documents.

## 2. Recommended MVP Deployment Architecture

Recommended MVP architecture:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon, Supabase, Railway Postgres, or Render Postgres
- Storage: local upload storage for local development only; S3-compatible object storage for production persistence

Vercel is a natural fit for the Next.js frontend. Render or Railway can run the Express backend as a long-running Node service. A hosted PostgreSQL provider should supply `DATABASE_URL` for Prisma.

## 3. Frontend Deployment

Deploy the `frontend` workspace to Vercel.

Recommended settings:

- Root directory: `frontend`
- Node version: 22 LTS
- Install command: `npm install`
- Build command: `npm run build`
- Start command: managed by Vercel
- Environment variable: `NEXT_PUBLIC_API_URL`

`NEXT_PUBLIC_API_URL` must point to the deployed backend API base URL, including the API prefix. Example:

```text
https://lexai-api.example.com/api/v1
```

## 4. Backend Deployment

Deploy the `backend` workspace to Render or Railway.

Recommended settings:

- Root directory: `backend`
- Node version: 22 LTS
- Build command: `npm install && npm run build && npm run prisma:generate`
- Start command: `npm run start`
- Health check path: `/health`

Required runtime environment variables are listed in [PRODUCTION_ENV.md](PRODUCTION_ENV.md).

## 5. Database Deployment

Use a managed PostgreSQL database from Neon, Supabase, Railway Postgres, or Render Postgres.

The database provider should supply the production `DATABASE_URL`. Do not copy local credentials into production, and do not commit database URLs to the repository.

## 6. Environment Variables

Backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `CORS_ORIGIN`

Frontend:

- `NEXT_PUBLIC_API_URL`

See [PRODUCTION_ENV.md](PRODUCTION_ENV.md) for purpose, examples, secrecy, and production notes.

## 7. Prisma Migration Strategy

Use reviewed Prisma migrations for production.

Recommended production flow:

1. Confirm `DATABASE_URL` points to the hosted PostgreSQL database.
2. Generate Prisma Client during backend build with `npm run prisma:generate`.
3. Run production migrations with Prisma's deploy workflow before or during release.
4. Run seed data only for demo environments, never against a real customer production database.

Current backend scripts include `prisma:migrate` for local development and `db:seed` for demo data. For production deployment, prefer a platform command or one-off job that runs Prisma migrations intentionally and logs the result.

## 8. File Upload Storage Limitation

The current MVP upload flow uses local/development file storage. That is acceptable for local demos and short-lived MVP testing, but it is not suitable for permanent production document retention.

Render and Railway file systems may be ephemeral or unreliable for permanent uploads depending on the service type and configuration. Deployed upload files may disappear after restarts, redeploys, scaling events, or container replacement.

For real production document retention, move uploads to S3-compatible storage such as:

- AWS S3
- Cloudflare R2
- Supabase Storage
- Backblaze B2 or another S3-compatible provider

Until object storage is implemented, treat deployed uploads as temporary demo artifacts only.

## 9. CORS Configuration

The backend already reads `CORS_ORIGIN` from environment configuration and passes it to Express CORS middleware.

For local development:

```text
CORS_ORIGIN=http://localhost:3000
```

For production, set `CORS_ORIGIN` to the deployed frontend origin, for example:

```text
CORS_ORIGIN=https://lexai.example.com
```

Do not include the API path in `CORS_ORIGIN`; use only the origin.

## 10. Deployment Steps

1. Create a hosted PostgreSQL database.
2. Set backend environment variables on Render or Railway.
3. Deploy the backend service.
4. Run Prisma migrations against the hosted database.
5. Run the seed only for a demo environment.
6. Deploy the frontend to Vercel.
7. Set `NEXT_PUBLIC_API_URL` to the deployed backend API URL.
8. Smoke test auth, dashboard, upload, analysis, reports, and AI chat.

## 11. Post-Deployment Smoke Tests

Run these checks after deployment:

- Open the frontend URL and confirm the landing page renders.
- Confirm signup works with a test account.
- Confirm login returns an authenticated workspace state.
- Confirm dashboard data loads.
- Confirm demo mode still works when logged out.
- Upload a safe test file only.
- Run the analyze flow.
- Open the analysis page and review findings.
- Open reports and a report detail page.
- Open AI chat and confirm a mock response is shown.
- Confirm backend `/health` returns a healthy response.
- Confirm browser console has no CORS errors.

## 12. Known MVP Deployment Limitations

- AI analysis is mocked and should not be presented as real legal reasoning.
- OCR and real LLM extraction are not implemented yet.
- Upload storage is local/development-oriented and may be ephemeral on deployed hosts.
- No production object storage integration exists yet.
- No refresh-token rotation exists yet.
- No production billing, workspace roles, permissions matrix, or audit trail exists yet.
- The app is suitable for portfolio demonstration and MVP testing, not production legal document retention.

## 13. Future Production Deployment Plan

Before production use with real legal documents:

- Add S3-compatible object storage for uploads and generated exports.
- Add malware scanning and file validation hardening.
- Add production-grade observability, structured logs, and alerting.
- Add refresh-token rotation or a hardened auth session model.
- Add team/workspace roles and permission checks.
- Add backup and restore procedures for PostgreSQL.
- Add environment-specific migration approvals.
- Add rate limiting and abuse protection.
- Add legal disclaimers reviewed by counsel.
- Add production OCR and LLM providers behind auditable service boundaries.
