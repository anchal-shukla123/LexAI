# LexAI API Contracts

Base URL:

```text
/api/v1
```

These contracts define the target backend API. They are planning contracts only and should guide future implementation.

## 1. API Design Principles

- Use resource-oriented REST endpoints.
- Return consistent success and error envelopes.
- Scope document, chat, report, and settings requests to the current workspace.
- Validate request bodies, route params, query params, and file metadata with Zod.
- Never expose raw local file paths.
- Use pagination for list endpoints.
- Prefer async job contracts for long-running analysis and export work.
- Keep MVP AI mocked but persist real records.

## 2. Auth APIs

### POST /auth/signup

Purpose: Create a user and bootstrap a default workspace.

Request body:

```json
{
  "email": "founder@example.com",
  "password": "StrongPassword123!",
  "name": "Aarav Founder",
  "workspaceName": "Aarav Legal"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "founder@example.com",
      "name": "Aarav Founder"
    },
    "workspace": {
      "id": "wsp_123",
      "name": "Aarav Legal",
      "slug": "aarav-legal"
    },
    "token": "jwt-token"
  }
}
```

Notes: Passwords must be hashed with bcrypt or argon2. The first membership should be `OWNER`.

### POST /auth/login

Purpose: Authenticate a user.

Request body:

```json
{
  "email": "founder@example.com",
  "password": "StrongPassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "founder@example.com",
      "name": "Aarav Founder"
    },
    "currentWorkspaceId": "wsp_123",
    "token": "jwt-token"
  }
}
```

Notes: Login should write an audit log entry and update `lastLoginAt`.

### POST /auth/logout

Purpose: End a user session.

Request body:

```json
{}
```

Response:

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

Notes: Stateless JWT logout may be client-side in MVP. Token revocation can be added later.

### GET /auth/me

Purpose: Return current authenticated user and workspace context.

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "founder@example.com",
      "name": "Aarav Founder"
    },
    "workspace": {
      "id": "wsp_123",
      "name": "Aarav Legal",
      "role": "OWNER"
    }
  }
}
```

Notes: Return only safe profile and membership fields.

## 3. Workspace APIs

### GET /workspaces/current

Purpose: Return the current workspace.

Response:

```json
{
  "success": true,
  "data": {
    "id": "wsp_123",
    "name": "Aarav Legal",
    "slug": "aarav-legal",
    "role": "OWNER"
  }
}
```

Notes: The current workspace can be resolved from user settings or a request header in future multi-workspace flows.

### PATCH /workspaces/current

Purpose: Update workspace profile fields.

Request body:

```json
{
  "name": "Aarav Legal Ops"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "wsp_123",
    "name": "Aarav Legal Ops",
    "slug": "aarav-legal"
  }
}
```

Notes: Require `OWNER` or `ADMIN`.

### GET /workspaces/current/members

Purpose: List workspace members.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "mem_123",
      "role": "OWNER",
      "user": {
        "id": "usr_123",
        "email": "founder@example.com",
        "name": "Aarav Founder"
      }
    }
  ]
}
```

Notes: MVP may be read-only until member invites are implemented.

## 4. Document APIs

### GET /documents

Purpose: List documents in the current workspace.

Query params:

```text
page=1&limit=20&status=ANALYZED
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "doc_123",
      "title": "Vendor Agreement",
      "status": "ANALYZED",
      "riskScore": 72,
      "createdAt": "2026-07-03T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNext": false
  }
}
```

Notes: Exclude soft-deleted documents by default.

### POST /documents

Purpose: Create a document record before file upload.

Request body:

```json
{
  "title": "Vendor Agreement",
  "description": "Agreement from ACME vendor review"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "title": "Vendor Agreement",
    "status": "UPLOADED"
  }
}
```

Notes: Creation does not mean a file has been uploaded yet.

### GET /documents/:documentId

Purpose: Return document detail.

Response:

```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "title": "Vendor Agreement",
    "status": "ANALYZED",
    "summary": "This agreement creates payment, termination, and liability obligations.",
    "riskScore": 72,
    "file": {
      "id": "file_123",
      "originalName": "vendor-agreement.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 122048
    }
  }
}
```

Notes: Require workspace membership.

### PATCH /documents/:documentId

Purpose: Update editable document metadata.

Request body:

```json
{
  "title": "ACME Vendor Agreement",
  "description": "Updated title after review"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "title": "ACME Vendor Agreement",
    "description": "Updated title after review"
  }
}
```

Notes: Do not allow clients to directly change analysis status.

### DELETE /documents/:documentId

Purpose: Soft delete a document.

Response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

Notes: Set `deletedAt`; do not hard delete findings or audit logs in MVP.

## 5. Upload APIs

### POST /documents/:documentId/upload

Purpose: Upload a file for a document.

Request body:

```json
{
  "file": "multipart-file"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file_123",
      "originalName": "vendor-agreement.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 122048
    },
    "document": {
      "id": "doc_123",
      "status": "UPLOADED"
    }
  }
}
```

Notes: Accept PDF, DOCX, PNG, JPG, and JPEG up to 20MB. Never expose `storageKey`.

### GET /documents/:documentId/file

Purpose: Download or preview a document file.

Response:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/v1/documents/doc_123/file/content",
    "expiresAt": "2026-07-03T10:15:00.000Z"
  }
}
```

Notes: MVP can stream through the API. Future S3 should return short-lived signed URLs.

## 6. Analysis APIs

### POST /documents/:documentId/analyze

Purpose: Create an analysis job.

Request body:

```json
{
  "mode": "standard"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "job_123",
    "status": "QUEUED"
  }
}
```

Notes: Reject if the document has no uploaded file or already has an active job.

### GET /documents/:documentId/analysis

Purpose: Return the current analysis result for a document.

Response:

```json
{
  "success": true,
  "data": {
    "documentId": "doc_123",
    "status": "COMPLETED",
    "summary": "The contract has payment, termination, and liability obligations.",
    "riskScore": 72,
    "completedAt": "2026-07-03T10:05:00.000Z"
  }
}
```

Notes: Return `404` or a domain-specific empty state if analysis has not run.

### GET /analysis-jobs/:jobId

Purpose: Poll analysis job status.

Response:

```json
{
  "success": true,
  "data": {
    "id": "job_123",
    "documentId": "doc_123",
    "status": "PROCESSING",
    "createdAt": "2026-07-03T10:00:00.000Z",
    "startedAt": "2026-07-03T10:01:00.000Z"
  }
}
```

Notes: Job visibility must still be workspace-authorized.

## 7. Clause/Risk APIs

### GET /documents/:documentId/clauses

Purpose: Return clause findings.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "clause_123",
      "category": "TERMINATION",
      "title": "Termination for convenience",
      "plainLanguageSummary": "Either party may terminate with 30 days notice.",
      "confidence": 0.91
    }
  ]
}
```

Notes: Include page/source locations when OCR is available.

### GET /documents/:documentId/risks

Purpose: Return risk findings.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "risk_123",
      "riskLevel": "HIGH",
      "title": "Broad liability exposure",
      "description": "The limitation of liability clause is missing a clear cap.",
      "confidence": 0.87
    }
  ]
}
```

Notes: Sort by severity first, then confidence.

### GET /documents/:documentId/recommendations

Purpose: Return actionable recommendations.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "rec_123",
      "title": "Add a liability cap",
      "description": "Negotiate a liability cap tied to fees paid under the agreement.",
      "priority": 1
    }
  ]
}
```

Notes: Recommendations should reference risks where possible.

## 8. AI Chat APIs

### POST /documents/:documentId/chat/sessions

Purpose: Create a document-scoped chat session.

Request body:

```json
{
  "title": "Payment questions"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "chat_123",
    "documentId": "doc_123",
    "title": "Payment questions"
  }
}
```

Notes: Document access is required.

### GET /chat/sessions/:sessionId

Purpose: Return a chat session and messages.

Response:

```json
{
  "success": true,
  "data": {
    "id": "chat_123",
    "documentId": "doc_123",
    "messages": [
      {
        "id": "msg_123",
        "role": "USER",
        "content": "What are the payment risks?"
      },
      {
        "id": "msg_124",
        "role": "ASSISTANT",
        "content": "The document may expose you to delayed payment risk. This is AI-generated and not legal advice.",
        "citations": []
      }
    ]
  }
}
```

Notes: Future responses should include citations to source text.

### POST /chat/sessions/:sessionId/messages

Purpose: Send a user message and receive an assistant reply.

Request body:

```json
{
  "content": "Can this contract be terminated early?"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_125",
      "role": "USER",
      "content": "Can this contract be terminated early?"
    },
    "assistantMessage": {
      "id": "msg_126",
      "role": "ASSISTANT",
      "content": "The mock analysis indicates a termination clause with notice requirements. This is not legal advice.",
      "citations": []
    }
  }
}
```

Notes: Rate limit chat requests per user and workspace.

## 9. Report APIs

### GET /reports

Purpose: List workspace reports.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "rpt_123",
      "documentId": "doc_123",
      "title": "Vendor Agreement Report",
      "status": "READY",
      "createdAt": "2026-07-03T10:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNext": false
  }
}
```

Notes: Filter by `documentId` when supplied.

### POST /documents/:documentId/reports

Purpose: Create a report from current analysis.

Request body:

```json
{
  "title": "Vendor Agreement Report"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "rpt_123",
    "documentId": "doc_123",
    "status": "READY"
  }
}
```

Notes: Require an analyzed document.

### GET /reports/:reportId

Purpose: Return report detail.

Response:

```json
{
  "success": true,
  "data": {
    "id": "rpt_123",
    "title": "Vendor Agreement Report",
    "status": "READY",
    "content": {
      "summary": "The agreement contains payment, termination, and liability risks.",
      "riskScore": 72
    }
  }
}
```

Notes: Report content should be a stable snapshot.

### POST /reports/:reportId/export

Purpose: Create an export job.

Request body:

```json
{
  "format": "PDF"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "exportJobId": "exp_123",
    "status": "QUEUED",
    "format": "PDF"
  }
}
```

Notes: Use async export jobs even for MVP mock exports.

### POST /reports/:reportId/share

Purpose: Create a secure share link.

Request body:

```json
{
  "expiresInHours": 72
}
```

Response:

```json
{
  "success": true,
  "data": {
    "shareUrl": "https://app.lexai.local/share/token",
    "expiresAt": "2026-07-06T10:10:00.000Z"
  }
}
```

Notes: Store share token hashes, not raw tokens.

## 10. Settings APIs

### GET /settings/profile

Purpose: Return current user profile settings.

Response:

```json
{
  "success": true,
  "data": {
    "name": "Aarav Founder",
    "email": "founder@example.com",
    "theme": "system",
    "emailNotificationsEnabled": true
  }
}
```

Notes: Email changes should require verification later.

### PATCH /settings/profile

Purpose: Update user profile settings.

Request body:

```json
{
  "name": "Aarav Sharma",
  "theme": "dark",
  "emailNotificationsEnabled": false
}
```

Response:

```json
{
  "success": true,
  "data": {
    "name": "Aarav Sharma",
    "theme": "dark",
    "emailNotificationsEnabled": false
  }
}
```

Notes: Write an audit log for sensitive profile changes.

### GET /settings/workspace

Purpose: Return workspace settings.

Response:

```json
{
  "success": true,
  "data": {
    "maxUploadSizeBytes": 20971520,
    "allowedUploadTypes": ["pdf", "docx", "png", "jpg", "jpeg"],
    "defaultRiskThreshold": "MEDIUM"
  }
}
```

Notes: Require workspace membership.

### PATCH /settings/workspace

Purpose: Update workspace settings.

Request body:

```json
{
  "defaultRiskThreshold": "HIGH"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "defaultRiskThreshold": "HIGH"
  }
}
```

Notes: Require `OWNER` or `ADMIN`.

### GET /settings/ai-preferences

Purpose: Return AI preference defaults.

Response:

```json
{
  "success": true,
  "data": {
    "analysisDepth": "standard",
    "includeRecommendations": true,
    "legalDisclaimerEnabled": true
  }
}
```

Notes: MVP can store preferences as JSON while the values stabilize.

### PATCH /settings/ai-preferences

Purpose: Update AI preferences.

Request body:

```json
{
  "analysisDepth": "detailed",
  "includeRecommendations": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "analysisDepth": "detailed",
    "includeRecommendations": true
  }
}
```

Notes: Preferences should not override mandatory legal disclaimers.

## 11. Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload.",
    "details": []
  }
}
```

Common codes:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `UPLOAD_REJECTED`
- `ANALYSIS_FAILED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

## 12. Pagination Format

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}
```

Default list behavior:

- `page` defaults to `1`.
- `limit` defaults to `20`.
- `limit` maximum should be `100`.
- Sort defaults to newest first unless a feature requires otherwise.

## 13. Validation Rules

- Email must be valid and normalized to lowercase.
- Password must meet minimum length and complexity rules.
- Workspace names must be non-empty and length-limited.
- Slugs must be unique and URL-safe.
- Document titles must be non-empty and length-limited.
- File uploads must be PDF, DOCX, PNG, JPG, or JPEG.
- File uploads must be 20MB or smaller.
- Route ids must be validated before querying.
- Enum values must be rejected when unknown.
- Chat prompts must have a maximum length.
- Export formats must be one of `PDF`, `DOCX`, or `SECURE_LINK`.
- Client-provided workspace ids must not bypass membership checks.
