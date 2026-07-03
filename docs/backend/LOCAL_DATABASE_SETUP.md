# LexAI Local Database Setup

LexAI uses PostgreSQL through Prisma. Docker Postgres is the simplest local path when Docker Desktop is installed, but local PostgreSQL works just as well when Docker is unavailable.

## Expected Local Database

```text
database: lexai
username: postgres
password: postgres for Docker, or your local postgres password
host port: 5432
```

Docker/default backend connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lexai?schema=public"
```

Local PostgreSQL connection string format:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/lexai?schema=public"
```

Replace `YOUR_PASSWORD` with the real password for your local `postgres` user.

Inside Docker Compose, the backend container uses the internal service hostname:

```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/lexai?schema=public"
```

## Option A: Docker Postgres

This option requires Docker Desktop for Windows to be installed and available in `PATH`.

From the repository root:

```powershell
docker --version
docker compose up -d postgres
docker compose ps postgres
```

If PowerShell says `docker` is not recognized, Docker Desktop is missing, Docker has not updated your `PATH`, or the terminal was opened before Docker was installed. Install Docker Desktop, restart PowerShell or the laptop, and try `docker --version` again.

If Docker is not available on this machine, use Option B.

## Option B: Local PostgreSQL Without Docker

Use this path when Docker Desktop is not installed or cannot run on the machine.

1. Install PostgreSQL for Windows from the official PostgreSQL installer.
2. During installation, set a password for the `postgres` user.
3. Open SQL Shell (`psql`) or pgAdmin.
4. Create the LexAI database:

```sql
CREATE DATABASE lexai;
```

5. Copy `backend/.env.example` to `backend/.env` if needed:

```powershell
Copy-Item backend\.env.example backend\.env
```

6. Update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/lexai?schema=public"
```

Replace `YOUR_PASSWORD` with the actual local `postgres` password. Do not commit `backend/.env`; it is ignored by Git.

## Recommended Node Version

Use Node 22 LTS for this repo. Node 24 can expose Prisma engine compatibility issues on Windows ARM64, including native query engine load failures.

After switching Node versions, reinstall dependencies if the generated Prisma engine still does not load:

```powershell
npm.cmd install
```

## Prisma Workflow

Use `npm.cmd` in Windows PowerShell because the `npm.ps1` shim can be blocked by execution policy.

After Docker Postgres or local PostgreSQL is running and `backend/.env` is correct:

```powershell
npm.cmd run prisma:generate --workspace backend
npm.cmd run db:validate --workspace backend
npm.cmd run prisma:migrate --workspace backend -- --name init
npm.cmd run db:seed --workspace backend
npm.cmd run typecheck --workspace backend
npm.cmd run prisma:studio --workspace backend
```

The initial migration file is already present under `backend/prisma/migrations`. If Prisma reports the migration already exists or the database is already in sync, do not create a second init migration. Inspect `backend/prisma/migrations` and continue with seed.

The seed is intended to be idempotent for the demo workspace and document records.

## Reset Local Database

This is destructive for the local development database.

```powershell
npm.cmd run db:reset --workspace backend
```

## Troubleshooting

### Docker Command Not Recognized

Cause: Docker Desktop is not installed, or Docker is not available in the current `PATH`.

Fix:

- Install Docker Desktop for Windows.
- Restart PowerShell or restart the laptop.
- Run `docker --version`.
- Or use Option B: Local PostgreSQL Without Docker.

### Prisma P1000 Authentication Failed

Prisma `P1000` means Prisma reached a PostgreSQL server, but the username, password, or database in `DATABASE_URL` did not match what that server accepts.

Fix:

- Confirm the `lexai` database exists.
- Confirm the PostgreSQL username and password.
- Update `backend/.env` with the correct `DATABASE_URL`.
- If using Docker, the expected password is `postgres`.
- If using local PostgreSQL, use the password you set during installation.

### Prisma Query Engine DLL Not Valid Win32 Application

Cause: Prisma Client generated or loaded a native query engine that is incompatible with the current operating system, CPU architecture, OpenSSL version, or Node runtime. This can happen with Node 24 on Windows ARM64.

This may appear as:

```text
query_engine-windows.dll.node is not a valid Win32 application
```

Fix:

1. Switch to Node 22 LTS.
2. Delete `node_modules`.
3. Reinstall packages.
4. Regenerate Prisma Client.

```powershell
Remove-Item -Recurse -Force node_modules
npm.cmd install
npm.cmd run prisma:generate --workspace backend
```

Then rerun:

```powershell
npm.cmd run prisma:migrate --workspace backend -- --name init
npm.cmd run db:seed --workspace backend
```
