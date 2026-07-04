# LexAI Production Environment

LexAI uses environment variables for runtime configuration. Never commit `.env` files, production secrets, hosted database URLs, JWT secrets, or provider tokens to the repository.

## Backend Environment Variables

| Variable | Purpose | Example local value | Production note | Secret |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. | `postgresql://postgres:postgres@localhost:5432/lexai?schema=public` | Use the connection string from Neon, Supabase, Railway Postgres, Render Postgres, or another hosted PostgreSQL provider. | Yes |
| `JWT_SECRET` | Secret used to sign and verify JWT auth tokens. | `replace-with-a-long-development-secret` | Must be strong, unique, high-entropy, and environment-specific in production. Rotate if exposed. | Yes |
| `JWT_EXPIRES_IN` | JWT lifetime passed to the backend auth layer. | `7d` | Choose a lifetime that matches the deployment's security posture. Shorter lifetimes are safer. | No |
| `PORT` | Port the Express server listens on. | `8000` | Hosting platforms often inject this automatically. Use the platform-provided value when available. | No |
| `CORS_ORIGIN` | Frontend origin allowed to call the backend with CORS credentials enabled. | `http://localhost:3000` | Set to the deployed frontend origin, such as `https://lexai.example.com`. Do not include `/api/v1`. | No |

## Frontend Environment Variables

| Variable | Purpose | Example local value | Production note | Secret |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Public backend API base URL used by the Next.js frontend. | `http://localhost:8000/api/v1` | Set to the deployed backend API base URL, such as `https://lexai-api.example.com/api/v1`. Values prefixed with `NEXT_PUBLIC_` are bundled into the frontend and are safe to expose. | No |

## Production Notes

- Never commit `.env`, `.env.local`, `.env.production`, or copied hosting secrets.
- `DATABASE_URL` should come directly from the hosted database provider.
- `JWT_SECRET` must be strong in production. Do not reuse the local development value.
- `NEXT_PUBLIC_API_URL` is public by design and safe to expose.
- `CORS_ORIGIN` should match the frontend origin exactly.
- Demo seeds should be used only in demo environments, not in customer production data environments.
