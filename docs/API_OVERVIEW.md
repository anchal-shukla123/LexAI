# LexAI API Overview

Base URL:

```text
http://localhost:8000/api/v1
```

LexAI uses an Express + TypeScript API with Prisma-backed services. Several product routes use optional authentication: they use the authenticated workspace when a JWT is provided and fall back to the seeded demo workspace when no token is provided.

## Response Envelopes

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Paginated

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "hasNext": false
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []
  }
}
```

## Auth

Purpose: create and manage local MVP sessions.

Endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Auth behavior:

- Signup and login return a JWT and workspace summary.
- The frontend stores the JWT as `lexai_token`.
- `GET /auth/me` and logout expect a valid bearer token.
- No refresh-token flow is implemented in this MVP.

## Dashboard

Purpose: provide workspace-level dashboard counts, recent documents, recent reports, audit activity, and current user/workspace context.

Endpoint:

- `GET /demo/dashboard`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- The response includes `contextMode: "auth" | "demo"` so the frontend can show `Signed in` or `Demo Mode` accurately.

## Documents

Purpose: create, list, inspect, update, delete, upload files for, and analyze documents.

Endpoints:

- `GET /documents`
- `POST /documents`
- `GET /documents/:documentId`
- `PATCH /documents/:documentId`
- `DELETE /documents/:documentId`
- `POST /documents/:documentId/upload`
- `POST /documents/:documentId/analyze`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- Upload uses multipart form data.
- Analysis currently calls the mock provider and persists generated findings.
- Document detail can include files, analysis job data, clause findings, risk findings, recommendations, reports, and chat sessions.

## Upload

Purpose: support file attachment to an existing document.

Endpoint:

- `POST /documents/:documentId/upload`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- Implemented through `multer`.
- The frontend upload page creates a document first, uploads the file, then starts analysis.

## Analysis

Purpose: generate and persist MVP analysis outputs for a document.

Endpoint:

- `POST /documents/:documentId/analyze`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- Current analysis is mock AI, not real OCR or LLM output.
- The analysis flow creates structured risk findings, clause findings, recommendations, and related report/chat data used by the UI.

## Reports

Purpose: list reports and retrieve report details.

Endpoints:

- `GET /reports`
- `GET /reports/:reportId`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- Reports are tied to documents.
- Export job modeling exists in the data shape, but production export storage is not implemented yet.

## Chat

Purpose: retrieve document-aware chat session detail for the MVP chat view.

Endpoint:

- `GET /chat/sessions/:sessionId`

Auth behavior:

Uses authenticated workspace when JWT is provided; falls back to seeded demo workspace when no token is provided.

Notes:

- Chat content is mock/demo grounded.
- Real LLM chat and retrieval are planned future work.

## Settings Future

Purpose: future workspace and profile administration.

Current state:

- The frontend includes a settings/profile experience.
- Dedicated backend settings endpoints are not implemented yet.

Potential future endpoints:

- `GET /settings/profile`
- `PATCH /settings/profile`
- `GET /settings/workspace`
- `PATCH /settings/workspace`
