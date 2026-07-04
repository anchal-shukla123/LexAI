# LexAI Case Study

## 1. Project Summary

LexAI is a full-stack legal document intelligence MVP for uploading contracts, running deterministic mock analysis, reviewing risk findings, generating report records, and exploring document-aware chat flows. The project is built as a production-shaped SaaS foundation with a Next.js frontend, Express + TypeScript backend, Prisma data model, PostgreSQL persistence, JWT authentication, and a demo workspace fallback.

The goal of the MVP is to demonstrate the full product journey and engineering architecture for an AI-assisted contract review platform without overstating the current AI capabilities.

## 2. Problem

Legal, operations, and startup teams often need to review contracts quickly, identify risky clauses, and share summaries with stakeholders. Existing workflows can be slow, fragmented, and difficult to explain to non-legal teammates.

LexAI explores how a focused SaaS workspace could make legal document review easier to understand by organizing uploaded documents, analysis output, reports, and chat context in one place.

## 3. Solution

LexAI provides a polished workspace where a user can sign up, upload or create a document record, run a mock analysis flow, review structured findings, open generated report details, and continue in a chat-style document context.

The current analysis engine is deterministic and mocked, but it is wired through real application flows and persistence. This makes the MVP useful for product demos, architecture review, and future AI integration planning.

## 4. Target Users

- Startup founders reviewing commercial agreements.
- Operations teams tracking vendor and service contracts.
- Legal teams triaging routine documents.
- Product and engineering reviewers evaluating a legaltech SaaS concept.
- Recruiters and interviewers assessing full-stack product engineering ability.

## 5. Core User Journey

1. A visitor opens the LexAI landing page.
2. The user signs up or logs in.
3. The dashboard loads authenticated workspace data when a token is present.
4. The user creates or uploads a legal document.
5. LexAI stores upload metadata and document records.
6. The user starts analysis.
7. The backend persists deterministic mock analysis, findings, recommendations, chat records, and reports.
8. The frontend shows the analysis report with risk and clause context.
9. The user opens AI chat or report detail views.
10. The user can log out and still browse demo fallback mode.

## 6. System Architecture

```text
Next.js App Router frontend
  -> Auth-aware API client
  -> Express + TypeScript API
  -> Optional-auth request context
  -> Document, analysis, report, chat, and auth services
  -> Prisma ORM
  -> PostgreSQL
```

The frontend can operate in authenticated mode or demo mode. Backend routes that support optional authentication resolve the current workspace from a valid JWT when available, then fall back to seeded demo data when no valid token is present.

## 7. Key Features Built

- Premium SaaS landing page and dashboard.
- Signup, login, logout, and current-user session retrieval.
- JWT-authenticated API requests.
- Optional-auth demo fallback mode.
- Workspace-aware dashboard data.
- Documents library and document detail routes.
- Document create and upload metadata flow.
- Deterministic mock analysis persistence.
- Clause findings, risk findings, recommendations, and summary output.
- Report listing and report detail retrieval.
- Chat session records and document-aware chat detail views.
- Settings/profile presentation.
- API overview, architecture overview, demo guide, and project documentation.

## 8. Backend Engineering Highlights

- Express API organized around typed modules and services.
- Prisma schema modeling users, workspaces, memberships, documents, analysis artifacts, reports, chat sessions, and audit logs.
- JWT authentication with hashed passwords.
- Optional authentication middleware for routes that should support both authenticated and demo contexts.
- Standard response envelopes for success, pagination, and errors.
- File upload handling through multer for local development storage.
- Deterministic mock analysis service that persists realistic downstream records.
- Seeded demo workspace for reliable product walkthroughs.

## 9. Frontend Engineering Highlights

- Next.js App Router application with TypeScript.
- Premium dashboard shell with auth-aware state.
- API client that attaches JWTs when available.
- Backend-backed pages with frontend fallback states preserved.
- Polished upload, analysis, reports, documents, AI chat, and settings screens.
- Responsive layout and interaction states using Tailwind CSS, shadcn-compatible primitives, Framer Motion, and lucide-react icons.
- Route links that preserve backend document, report, and chat identifiers.

## 10. AI Strategy

The current AI behavior is a deterministic mock analysis layer. It generates realistic summaries, risk scores, clause findings, recommendations, report records, and chat context without calling an OCR engine or LLM.

This was an intentional MVP strategy: build the end-to-end product, storage, and API surface first, then leave clear integration points for production AI later.

Future production AI can add:

- OCR and text extraction.
- Embeddings for semantic retrieval.
- LLM-based clause analysis.
- Citation-backed answers.
- Confidence scoring and human review workflows.
- Evaluation datasets and regression tests for AI output quality.

## 11. Auth & Workspace Model

LexAI supports real signup and login flows. Users authenticate with JWTs, and authenticated requests resolve a user and workspace context.

The project also keeps a demo fallback mode. When optional-auth routes are called without a valid token, the backend serves seeded demo workspace data. This makes the project easier to review without requiring every visitor to create an account.

## 12. Data Model

The Prisma-backed data model includes core SaaS and legal-document entities:

- Users.
- Workspaces.
- Workspace memberships.
- Documents.
- Analysis records.
- Clause findings.
- Risk findings.
- Recommendations.
- Reports and export jobs.
- Chat sessions and messages.
- Audit logs.

This model supports the current MVP while leaving room for production features such as team roles, durable exports, billing, and richer audit history.

## 13. Security Considerations

- Passwords are hashed before storage.
- JWTs are used for authenticated API access.
- Environment variables are kept out of source control.
- Optional-auth behavior is explicit and limited to routes designed for demo fallback.
- Uploaded files are handled through local development storage in the MVP.
- Legal outputs are positioned as demo intelligence, not legal advice.

Production hardening would need refresh-token rotation, stricter file scanning, object storage policies, role-based permissions, audit controls, rate limiting, deployment secrets management, and legal disclaimers reviewed by counsel.

## 14. Technical Challenges Solved

- Preserved a premium frontend experience while wiring pages to backend data.
- Kept demo fallback mode available without blocking authenticated flows.
- Modeled a full legal document review journey before integrating external AI services.
- Built deterministic analysis persistence so reports, chat records, and dashboard data can be reviewed repeatedly.
- Linked dashboard, document, report, and chat pages through backend IDs.
- Documented the project clearly enough for GitHub review and technical interviews.

## 15. What Is Real vs Mocked

Real:

- Next.js frontend application.
- Express + TypeScript backend.
- PostgreSQL persistence through Prisma.
- Signup, login, JWT auth, and current-user retrieval.
- Auth-aware API client.
- Document records and upload endpoint.
- Mock analysis persistence.
- Reports, chat records, dashboard data, and API integration.
- Demo workspace fallback mode.

Mocked or future work:

- Real OCR extraction.
- Real LLM reasoning.
- Embeddings and retrieval-augmented generation.
- Citation validation against extracted document text.
- Production billing.
- Enterprise permissions and compliance hardening.

## 16. Future Roadmap

- Add OCR and structured document text extraction.
- Integrate an LLM analysis pipeline with citations.
- Add embeddings for semantic clause retrieval.
- Move uploads and exports to production object storage.
- Add team invitations, role permissions, and workspace administration.
- Add billing and subscription management.
- Add production deployment hardening and monitoring.
- Add AI evaluation tests and human review workflows.

## 17. What This Project Demonstrates

LexAI demonstrates full-stack product engineering across frontend UX, backend API design, database modeling, authentication, persistence, documentation, and product communication.

It also demonstrates mature product judgment: the MVP is honest about what is mocked, preserves a reliable demo path, and creates a clear technical foundation for future OCR, LLM, retrieval, and billing integrations.
