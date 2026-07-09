# Local Development

This page collects the local fixes that make LexAI easier to demo on Windows.

## Health Checks

Backend process health:

```powershell
Invoke-WebRequest http://localhost:8000/health
```

Backend readiness, including database reachability and latency:

```powershell
Invoke-WebRequest http://localhost:8000/ready
```

`/health` should stay available while the API process is running. `/ready` returns `503` when the database is temporarily unavailable instead of crashing local development.

## Google OAuth

Create or update these local environment files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Backend OAuth variables:

```powershell
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<google-web-client-id>
GOOGLE_CLIENT_SECRET=<google-web-client-secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

Frontend variable:

```powershell
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

In Google Cloud, configure the OAuth web client with these local values:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`

For deployment, also add:

- Deployed frontend origin, for example `https://lex-ai-frontend-opal.vercel.app`
- Deployed backend callback: `https://<backend-domain>/api/v1/auth/google/callback`

`GOOGLE_OAUTH_REDIRECT_URI` must exactly match the callback URL registered in Google Cloud. Keep `GOOGLE_CLIENT_SECRET` only on the backend.

Local smoke test:

```text
Open http://localhost:3000/login, click Continue with Google, complete Google login, and confirm the app lands on /dashboard. In Prisma Studio or the database, confirm the user has a workspace, workspace member, user settings row, and default workspace.
```

## Prisma EPERM on Windows

On Windows, `prisma generate` can fail with an error like:

```text
EPERM: operation not permitted, rename 'node_modules\.prisma\client\query_engine-windows.dll.node.tmp...' -> 'node_modules\.prisma\client\query_engine-windows.dll.node'
```

This usually means a running Node, Prisma Studio, backend dev server, or editor process is holding Prisma's query engine DLL open.

### Recovery Steps

Stop LexAI dev servers first, then run:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node_repl -ErrorAction SilentlyContinue | Stop-Process -Force
```

Remove Prisma's generated client cache:

```powershell
Remove-Item -Recurse -Force .\node_modules\.prisma
```

Regenerate Prisma Client:

```powershell
npm.cmd run prisma:generate --workspace backend
```

Validate the schema:

```powershell
npm.cmd run db:validate --workspace backend
```

Restart the backend:

```powershell
npm.cmd run dev --workspace backend
```

## Full Local Verification

```powershell
npm.cmd run prisma:generate --workspace backend
npm.cmd run db:validate --workspace backend
npm.cmd run lint --workspace backend
npm.cmd run typecheck --workspace backend
npm.cmd run build --workspace backend
npm.cmd run lint --workspace frontend
npm.cmd run typecheck --workspace frontend
npm.cmd run build --workspace frontend
```

If only `prisma:generate` fails with the EPERM rename error and the rest of the TypeScript/build checks pass, clear the locked process and retry the recovery steps above.
