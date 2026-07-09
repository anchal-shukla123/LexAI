# LexAI Portfolio Case Study

## Problem Statement

Contract review is slow for founders, operators, and small teams that need to understand risk before sending an agreement to counsel. They often need a quick first-pass view of what matters: risky clauses, negotiation priorities, missing protections, and plain-English next steps.

LexAI solves this as a full-stack legal document intelligence workspace. It is not positioned as legal advice. It is a demo-ready MVP that shows how a legaltech product can turn contract files into structured, actionable review workflows.

## Solution

LexAI lets a user upload a contract, run deterministic rule-based analysis, review clauses and risks, generate report views, rewrite risky clauses, accept or reject rewrite versions, prepare a negotiation pack, export a PDF, and ask document-aware chat questions.

The MVP intentionally avoids paid LLM APIs. The rule-based pipeline produces predictable, explainable outputs for portfolio review while preserving a clean path to future LLM and background-job upgrades.

## Key Features

- Authenticated workspace with signup, login, JWT session, and demo auth fallback.
- Document upload and analysis workflow for PDF, DOCX, PNG, JPG, and JPEG files.
- Persisted clause findings, risk findings, recommendations, reports, chat sessions, and export jobs.
- Clause rewrite workspace with saved rewrite history, status badges, accepted/rejected/draft states, and before/after comparison.
- Negotiation pack that combines top risks, accepted rewrites, pending drafts, checklist items, priorities, and a counterparty email.
- Rule-based counterparty email generator with professional, firm, friendly, and concise tones.
- Health and readiness endpoints for deployed API monitoring.
- Portfolio documentation, demo script, and route QA checklist.

## Architecture

```text
Vercel Next.js frontend
-> API client with optional JWT
-> Render Express API
-> route handlers and services
-> Prisma ORM
-> PostgreSQL
```

The frontend uses Next.js App Router, TypeScript, Tailwind CSS, shadcn-compatible primitives, Framer Motion, and lucide-react icons. The backend uses Express, TypeScript, Prisma, PostgreSQL, JWT, bcryptjs, and multer.

## Database Models

The core data model is built around workspace-scoped legal review:

- `Workspace` and `User` support authenticated workspaces.
- `Document` and `DocumentFile` persist contract metadata and uploaded file records.
- `AnalysisJob` tracks analysis execution and status.
- `ClauseFinding`, `RiskFinding`, and `Recommendation` persist structured review outputs.
- `Report` stores report summaries and connects findings into report views.
- `ClauseRewrite` stores rewrite versions, goals, instructions, original/revised language, structured change notes, and status.
- `ChatSession` and related messages preserve document-aware chat history.
- `ExportJob` tracks generated PDF exports.

## AI and Rule-Based Pipeline

LexAI uses deterministic logic for the MVP:

1. Extract text from uploaded documents when backend extraction is available.
2. Detect clause categories using known legal patterns and keywords.
3. Score risks by severity, clause type, missing protections, and business impact.
4. Generate recommendations from risk categories and contract context.
5. Produce clause rewrites with original clause, rewritten clause, key changes, negotiation points, and risk reduction notes.
6. Build negotiation packs and counterparty emails from persisted risks, recommendations, and accepted rewrites.

This approach keeps the demo stable and transparent while allowing future LLM support for deeper semantic reasoning.

## Challenges Solved

- Kept real document routes separate from demo/sample fallback content.
- Added rewrite persistence so clause rewrites become actionable review artifacts.
- Connected report, clause review, chat, and negotiation surfaces around the same document IDs.
- Improved dashboard and document list performance by reducing heavy includes on list routes.
- Added readiness checks that report database availability without crashing local development.
- Documented Prisma Windows `EPERM` recovery steps for locked query engine files.

## Performance Improvements

- Dashboard queries avoid unnecessary heavy analysis payloads.
- Document list responses are trimmed for cards and tables rather than full detail pages.
- Backend timing logs make slow dashboard and document-list requests easier to spot.
- Health and readiness endpoints distinguish process uptime from database readiness.

## What Makes This Project Impressive

LexAI demonstrates an end-to-end product, not just a UI mockup. The demo includes authentication, persistence, document workflows, analysis records, reports, rewrite versioning, negotiation packaging, PDF export behavior, operational health endpoints, and documentation aimed at both engineers and recruiters.

The rule-based MVP is also honest: it shows the complete product loop without pretending to be a production legal AI system. That makes the architecture easier to evaluate and safer to demo.

## Future Scope

- Add optional LLM-backed clause analysis, rewrite refinement, and chat grounding with explicit usage limits.
- Move long-running analysis, OCR, export, and email generation into background workers.
- Add durable S3-compatible storage for uploads and generated PDFs.
- Add richer OCR support for scanned agreements and image-heavy contracts.
- Add team roles, shared workspaces, invitations, and audit history.
- Add production-grade monitoring, queue dashboards, and alerting.
- Add counsel-review handoff workflows and redline export to DOCX.
