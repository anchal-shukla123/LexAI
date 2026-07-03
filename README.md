# LexAI

LexAI is an AI-powered SaaS platform for legal document analysis. This repository contains the initial production-oriented monorepo foundation for the frontend, backend, database, and local Docker environment.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui-compatible components
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma
- DevOps: Docker Compose for frontend, backend, and Postgres

## Repository Structure

```text
frontend/   Next.js App Router application
backend/    Express API and Prisma setup
docs/       Product, engineering, and decision documentation
design/     Design assets and references
scripts/    Project automation scripts
```

## Prerequisites

- Node.js 20.11+ or 22 LTS
- npm 10+
- Docker Desktop

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Start the apps in development:

```bash
npm run dev --workspace frontend
npm run dev --workspace backend
```

Frontend runs at `http://localhost:3000`.
Backend runs at `http://localhost:8000`.

## Docker Setup

Start all services:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- API v1 root: `http://localhost:8000/api/v1`
- Postgres: `localhost:5432`

## Validation

```bash
npm run typecheck
npm run build
```

## Current Scope

This setup intentionally does not include AI features, authentication, document upload, OCR, or legal analysis workflows yet. Those features should be added after the product and data model are specified.
