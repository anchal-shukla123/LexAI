# LexAI Backend Architecture

## 1. Purpose

LexAI needs a backend that can safely accept legal documents, persist user and workspace data, coordinate document analysis, expose AI-assisted findings, and produce exportable reports. The first backend version should use mock AI responses with real persistence so the product flow can be validated before OCR, LLM, vector search, billing, and enterprise collaboration are added.

This document defines the backend shape for implementation. It is a planning document only; it does not introduce backend behavior.

## 2. Backend Responsibilities

- Authenticate users and expose the current user context.
- Model workspaces, memberships, roles, and workspace-level settings.
- Store documents, uploaded file metadata, analysis results, chat history, reports, export jobs, and audit logs.
- Validate uploads before accepting files into local MVP storage.
- Create and process analysis jobs using a mock worker in the first version.
- Return document summaries, clause findings, risk findings, and recommendations through versioned API contracts.
- Support AI chat sessions grounded to a specific document and workspace.
- Generate report records and coordinate export jobs.
- Enforce workspace membership checks on every document, chat, report, and settings request.
- Log sensitive actions for auditability.

## 3. High-Level Architecture

```text
Client
  |
  v
Next.js frontend
  |
  v
Express API (/api/v1)
  |
  +--> Route modules
  |      +--> Zod validation
  |      +--> Auth context
  |      +--> Workspace authorization
  |
  +--> Service layer
  |      +--> Prisma repositories
  |      +--> Local file storage adapter
  |      +--> Mock analysis engine
  |      +--> Mock chat engine
  |
  +--> Background job runner
  |      +--> In-memory queue for MVP
  |      +--> BullMQ + Redis later
  |
  v
PostgreSQL
```

The backend should be modular but not over-abstracted. Routes should own HTTP concerns, services should own business logic, repositories should own Prisma access, and adapters should isolate storage, queue, and AI providers.

## 4. Core Backend Modules

### auth

Handles signup, login, logout, password hashing, token creation, and current-user lookup. JWT auth can be introduced after the core backend shape is documented and implemented.

### users

Owns user profile data, user settings, account state, and user-level preferences.

### workspaces

Owns workspace records, slugs, workspace settings, and membership management. Even if the MVP UI feels single-user, backend data should be workspace-ready from the beginning.

### documents

Owns document records, lifecycle status, soft deletion, and document listing/detail queries.

### uploads

Validates file type and size, stores files locally for MVP, creates `DocumentFile` records, and prevents raw local paths from leaking to clients.

### analysis

Creates analysis jobs, transitions job status, calls the mock analysis engine, and persists outputs. The first implementation should perform mock AI analysis against real database records.

### clauses

Stores and returns clause findings by category, confidence, source text, and simplified explanation.

### risks

Stores and returns risk findings, risk levels, evidence, recommendations, and optional source locations.

### recommendations

Stores actionable improvements linked to documents and risk findings.

### chat

Creates document-scoped chat sessions and messages. MVP chat can use mock grounded responses and should still persist conversation history.

### reports

Creates report records from document analysis output and exposes report detail views.

### exports

Creates export jobs for PDF, DOCX, and secure-link formats. MVP can mark exports as mock-generated while preserving the future async job contract.

### settings

Owns profile settings, workspace settings, and AI preference settings.

### auditLogs

Records sensitive actions such as signup, login, document upload, analysis run, export creation, member changes, settings updates, and delete requests. Audit logs should be append-only.

## 5. Request Flow

```text
HTTP request
  -> request id assigned
  -> security middleware
  -> JSON/body parsing
  -> route handler
  -> auth context resolved when required
  -> Zod validation
  -> workspace membership authorization
  -> service method
  -> Prisma transaction or query
  -> audit log when sensitive
  -> normalized success/error response
```

Every route under `/api/v1` should return a consistent envelope:

```json
{
  "success": true,
  "data": {}
}
```

Failures should use structured error codes rather than raw exceptions.

## 6. Document Upload Flow

```text
Create Document
  -> document status = UPLOADED
Upload File
  -> validate workspace membership
  -> validate MIME type and extension
  -> validate file size <= 20MB
  -> store file under private local storage
  -> create DocumentFile metadata
  -> keep raw file path server-only
  -> write audit log
```

Allowed MVP file types:

- PDF
- DOCX
- PNG
- JPG
- JPEG

The API should never trust client-provided MIME type alone. It should validate extension, MIME type, size, and later file signatures where practical.

## 7. Analysis Job Flow

```text
POST /documents/:documentId/analyze
  -> validate document belongs to workspace
  -> prevent duplicate active analysis job
  -> create AnalysisJob with QUEUED status
  -> enqueue mock analysis job
  -> return job id

Worker
  -> mark job PROCESSING
  -> mark document PROCESSING
  -> run mock analysis engine
  -> persist summary, score, clauses, risks, recommendations
  -> create draft/ready report record
  -> mark job COMPLETED
  -> mark document ANALYZED
  -> write audit log
```

If analysis fails, the job should become `FAILED`, the document should become `FAILED`, and the error should be stored in a safe internal field that does not expose provider secrets.

## 8. AI Chat Flow

```text
Create chat session
  -> validate document/workspace access
  -> create ChatSession

Send message
  -> validate session access
  -> persist user ChatMessage
  -> load document summary and findings
  -> generate mock grounded assistant response
  -> persist assistant ChatMessage
  -> return response
```

MVP chat should make it clear in data contracts that responses are AI-generated and not legal advice. Future chat should use extracted document text, embeddings, vector retrieval, and citations.

## 9. Report Export Flow

```text
Create report
  -> validate analyzed document
  -> snapshot analysis data into Report
  -> status = READY or DRAFT

Export report
  -> create ExportJob
  -> enqueue export
  -> generate mock/local export artifact in MVP
  -> update ExportJob status
  -> return downloadable or shareable result metadata
```

Report exports should be asynchronous from the beginning so PDF/DOCX generation can grow without changing API behavior.

## 10. Error Handling Strategy

Use typed application errors:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `UPLOAD_REJECTED`
- `ANALYSIS_FAILED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Routes should not return raw stack traces. Logs may include internal error metadata, but client responses should contain safe messages.

## 11. Logging & Observability

MVP logging should include:

- request id
- method and route
- status code
- duration
- user id when available
- workspace id when available
- job id for background work
- structured error code

Production observability should add:

- centralized log aggregation
- error tracking
- request tracing
- queue metrics
- database query latency monitoring
- file upload failure metrics
- AI provider latency and failure metrics

## 12. Background Jobs

MVP:

- In-memory mock queue.
- Single-process worker.
- Jobs are persisted in PostgreSQL before being processed.
- Queue loss is acceptable in local development only because jobs can be retried from stored state.

Production:

- BullMQ with Redis.
- Dedicated worker process.
- Retry policy with exponential backoff.
- Dead-letter handling for repeated failures.
- Idempotent processors keyed by job id.

Background job types:

- document analysis
- report export
- future OCR/text extraction
- future embedding generation
- future billing or notification tasks

## 13. Scalability Plan

Phase 1, MVP:

- One Express API process.
- PostgreSQL.
- Local file storage.
- In-memory queue.
- Mock AI.

Phase 2, production beta:

- API and worker separated.
- BullMQ + Redis.
- S3-compatible object storage.
- OCR/text extraction.
- Real LLM provider integration.
- Stronger rate limits.

Phase 3, scale:

- Horizontal API instances.
- Worker autoscaling by queue depth.
- Read replicas for reporting-heavy queries.
- pgvector or managed vector database.
- Tenant-aware analytics.
- Organization billing and usage metering.

## 14. Folder Structure

Recommended backend structure:

```text
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      prisma.ts
      storage.ts
    middleware/
      auth.ts
      errorHandler.ts
      requestLogger.ts
      rateLimit.ts
      validate.ts
    modules/
      auth/
      users/
      workspaces/
      documents/
      uploads/
      analysis/
      clauses/
      risks/
      recommendations/
      chat/
      reports/
      exports/
      settings/
      auditLogs/
    queues/
      queue.ts
      workers/
        analysisWorker.ts
        exportWorker.ts
    providers/
      ai/
        mockAnalysisProvider.ts
        mockChatProvider.ts
      storage/
        localStorageProvider.ts
    utils/
      errors.ts
      pagination.ts
      response.ts
      ids.ts
  prisma/
    schema.prisma
    migrations/
  storage/
    uploads/
    exports/
```

Each module should generally contain:

```text
module.routes.ts
module.controller.ts
module.service.ts
module.repository.ts
module.validation.ts
module.types.ts
```

## 15. Implementation Roadmap

1. Add shared response, error, validation, and request logging middleware.
2. Define Prisma schema and migrations from `docs/database/DATABASE_SCHEMA.md`.
3. Implement auth with password hashing and JWT sessions.
4. Implement workspace bootstrap and membership checks.
5. Implement document CRUD with soft delete.
6. Implement local file upload and `DocumentFile` persistence.
7. Implement analysis jobs with mock AI and real persistence.
8. Implement clause, risk, and recommendation read APIs.
9. Implement document-scoped chat sessions with mock grounded responses.
10. Implement report creation and export job contracts.
11. Implement settings APIs.
12. Add audit logging for sensitive actions.
13. Add integration tests for auth, workspace authorization, uploads, analysis jobs, and reports.
