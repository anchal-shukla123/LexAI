# LexAI Demo Guide

This guide explains how to run LexAI locally and demonstrate the MVP flow from landing page to authenticated workspace, document upload, mock analysis, report, chat, settings, logout, and Demo Mode fallback.

## Prerequisites

- Node.js 22 LTS recommended.
- npm 10+.
- PostgreSQL running locally on `localhost:5432`.
- A local database named `lexai`.
- Windows PowerShell or a terminal that can run `npm.cmd`.
- Optional: Docker Desktop if using the Docker Compose database workflow.

## Start PostgreSQL

Use your local PostgreSQL installation or Docker. The default development connection expects:

```text
postgresql://postgres:<password>@localhost:5432/lexai?schema=public
```

If the `lexai` database does not exist, create it in your preferred PostgreSQL tool before running Prisma migrations.

## Use Node 22

The repository targets Node 22:

```bash
node -v
```

If you use a version manager, switch to Node 22 before installing dependencies.

## Install Dependencies

From the repository root:

```bash
npm.cmd install
```

Cross-platform equivalent:

```bash
npm install
```

## Set Up Backend Environment

Create `backend/.env` from the example:

```bash
copy backend\.env.example backend\.env
```

Minimum backend values:

```bash
NODE_ENV=development
PORT=8000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/lexai?schema=public"
JWT_SECRET="replace-with-a-long-development-secret"
JWT_EXPIRES_IN="7d"
```

Do not commit `.env` files.

## Set Up Frontend Environment

Create `frontend/.env.local` from the example:

```bash
copy frontend\.env.example frontend\.env.local
```

Minimum frontend values:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Prisma Migrate

Generate the Prisma client:

```bash
npm.cmd run prisma:generate --workspace backend
```

Run the development migration:

```bash
npm.cmd run prisma:migrate --workspace backend
```

## Prisma Seed

Seed the demo workspace:

```bash
npm.cmd run db:seed --workspace backend
```

The seed is important because optional-auth routes fall back to seeded demo data when no JWT is provided.

## Start Backend

```bash
npm.cmd run dev --workspace backend
```

Check:

- `http://localhost:8000/health`
- `http://localhost:8000/api/v1`

## Start Frontend

In a second terminal:

```bash
npm.cmd run dev --workspace frontend
```

Open:

```text
http://localhost:3000
```

## Live Demo Flow

1. Open the live URL: https://lex-ai-frontend-opal.vercel.app/
2. Sign up with a test email.
3. Upload a safe test file.
4. Review the analysis output.
5. Open chat, report, and settings views.
6. Logout and see `Demo Mode`.

## Demo Script

1. Open the landing page at `http://localhost:3000`.
2. Sign up or log in.
3. Show the `Signed in` state in the app shell.
4. Open the dashboard.
5. Upload a PDF, DOCX, PNG, JPG, or JPEG from the upload page.
6. Watch the create/upload/analyze flow complete.
7. Open the analysis page.
8. Show risk score, clause findings, risk findings, and recommendations.
9. Open AI chat from the document context.
10. Open a report from the report page or analysis page.
11. Show the settings/profile page.
12. Log out.
13. Reopen dashboard or documents and show `Demo Mode` fallback.

## Expected Demo Behavior

- With a valid JWT, the frontend sends `Authorization: Bearer <token>`.
- Auth-aware backend routes resolve the user's workspace.
- Without a token, optional-auth routes fall back to seeded demo data.
- If the backend is unavailable, frontend pages should keep rendering fallback content instead of going blank.
- If a 401 occurs, the API client clears `lexai_token` and `lexai_auth`.

## Troubleshooting

### Docker not recognized

Docker is optional for the app if PostgreSQL is already running locally. Install Docker Desktop only if you want the Docker Compose workflow.

### PostgreSQL P1000

Prisma `P1000` usually means invalid database credentials. Check `DATABASE_URL`, especially the username, password, host, port, and encoded special characters.

### Prisma query_engine Windows ARM64 issue

If Prisma cannot find or execute the query engine on Windows ARM64, regenerate the client:

```bash
npm.cmd run prisma:generate --workspace backend
```

If the issue persists, remove generated Prisma artifacts and reinstall dependencies, then regenerate. Avoid committing generated local engine artifacts.

### Turbopack cache issue

If Next.js shows stale compilation behavior, stop the dev server and clear the local `.next` cache:

```bash
rmdir /s /q frontend\.next
npm.cmd run dev --workspace frontend
```

### npm.cmd not found

Confirm Node.js and npm are installed and available in the Windows PATH:

```bash
node -v
npm -v
where npm.cmd
```

Restart the terminal after installing Node.js.

### Backend unavailable badge or fallback content

Confirm:

- Backend is running on `http://localhost:8000`.
- `NEXT_PUBLIC_API_URL` is `http://localhost:8000/api/v1`.
- Backend `CORS_ORIGIN` includes `http://localhost:3000`.
- PostgreSQL is running and seeded.
