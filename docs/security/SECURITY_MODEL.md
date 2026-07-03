# LexAI Security Model

## 1. Security Goals

LexAI handles sensitive legal documents, so the backend must protect confidentiality, tenant boundaries, file access, and auditability from the beginning.

Core goals:

- Only authenticated users can access private product APIs.
- Workspace membership is required for all workspace-scoped resources.
- Documents and files are never exposed across workspaces.
- Uploads are validated before storage.
- Raw local file paths are never returned to clients.
- Sensitive actions are audit logged.
- AI output is clearly labeled as assistance, not legal advice.

## 2. Authentication Strategy

MVP authentication should use:

- Email and password login.
- Password hashing with bcrypt or argon2.
- JWT-based auth later when backend features are implemented.
- Short-lived access tokens.
- Optional refresh token flow after MVP.

Password handling:

- Never store raw passwords.
- Never log passwords or tokens.
- Use strong password validation.
- Use constant-time password verification through the chosen hashing library.

Session handling:

- `GET /auth/me` should derive user context from the token.
- Auth middleware should attach `userId` only after token validation.
- Logout can be client-side for stateless JWT in MVP, with token revocation added later.

## 3. Authorization Strategy

Authorization should be role-based and workspace-scoped.

Important permissions:

| Role | Permissions |
| --- | --- |
| `OWNER` | Manage workspace, manage billing, manage members, delete workspace |
| `ADMIN` | Manage documents, run analysis, export reports, manage settings |
| `MEMBER` | Upload documents, view analysis, chat with AI, export reports |
| `VIEWER` | Read-only access |

Implementation rules:

- Resolve the current workspace before authorizing workspace resources.
- Check `WorkspaceMember` for the current user.
- Use role checks for mutating actions.
- Never trust a client-supplied role.
- Never infer workspace access from document id alone.

## 4. Workspace-Based Access Control

Every workspace-scoped request should follow this pattern:

```text
authenticate user
  -> resolve workspace
  -> confirm WorkspaceMember exists
  -> confirm required role
  -> load resource by workspaceId and resource id
```

Workspace-scoped resources:

- documents
- document files
- analysis jobs
- clause findings
- risk findings
- recommendations
- chat sessions
- chat messages
- reports
- export jobs
- workspace settings
- audit logs

Avoid global lookups like `findUnique({ id })` followed by authorization. Prefer queries that include both resource id and `workspaceId` where possible.

## 5. Document Access Rules

- Workspace membership is required for all document access.
- `VIEWER` can read documents, analysis, findings, chat sessions, and reports.
- `MEMBER` can upload documents, run analysis, chat with AI, and export reports.
- `ADMIN` can update and archive documents.
- `OWNER` can perform all workspace-level document operations.
- Soft-deleted documents should be hidden from normal reads.
- A document file should only be served after membership and document access checks.

The API should not expose raw storage paths, internal storage keys, or filesystem structure.

## 6. File Upload Security

MVP upload policy:

- Allowed files: PDF, DOCX, PNG, JPG, JPEG.
- Max file size: 20MB.
- Store files locally in MVP.
- Move to S3-compatible storage later.
- Never expose raw file paths.
- Never trust client-side metadata.

Validation should include:

- file size
- extension
- MIME type
- safe generated file names
- workspace and document authorization before accepting bytes

Additional production controls:

- file signature validation
- malware scanning
- quarantine storage for suspicious files
- private object storage buckets
- short-lived signed URLs
- checksum calculation

## 7. AI Safety & Legal Disclaimer

LexAI provides AI-generated document intelligence and does not replace professional legal advice.

Product rules:

- AI responses should explain uncertainty when relevant.
- AI responses should avoid claiming to be a lawyer.
- Future production AI should cite source text where possible.
- Chat should be grounded to the selected document and its extracted text.
- High-risk findings should include evidence and confidence.
- Users should remain responsible for legal decisions.

The legal disclaimer should be present in product surfaces and available in API-driven report content.

## 8. Data Privacy

Privacy requirements:

- Store only data needed for the product workflow.
- Keep document files private.
- Do not use customer documents for model training unless explicitly permitted by policy and contract.
- Avoid logging document content, chat prompts, passwords, tokens, and raw file paths.
- Encrypt data in transit with HTTPS in production.
- Use encrypted disks or managed encrypted storage in production.
- Define retention rules before hard deletion is enabled.

Future enterprise controls:

- workspace-level data retention policy
- export access logs
- data processing agreements
- customer-managed keys if required by enterprise customers

## 9. Audit Logging

Keep audit logs for sensitive actions:

- signup
- login
- workspace update
- member role update
- document upload
- document delete
- analysis run
- report creation
- export creation
- share link creation
- settings update

Audit log fields should include:

- actor user id
- workspace id
- action
- entity type
- entity id
- timestamp
- IP address when available
- user agent when available
- safe metadata

Audit logs should be append-only and not hard deleted in MVP.

## 10. Rate Limiting

Apply rate limits to:

- login attempts
- signup attempts
- upload requests
- analysis job creation
- chat messages
- report export requests
- share link creation

MVP can use in-memory rate limiting for local development. Production should use Redis-backed rate limiting so limits work across multiple API instances.

## 11. Input Validation

Use Zod validation for:

- request bodies
- query params
- route params
- enum values
- file metadata
- pagination values
- settings payloads

Validation rules:

- Reject unknown enum values.
- Limit string length for names, titles, descriptions, and chat prompts.
- Validate all ids before queries.
- Validate upload type and size server-side.
- Normalize emails.
- Escape or sanitize content only at the rendering boundary; do not destroy source text needed for legal analysis.

## 12. Secrets Management

Secrets should live in environment variables, not source control.

MVP secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- future AI provider keys
- future object storage keys

Production rules:

- Use a managed secret store where possible.
- Rotate secrets.
- Never log environment variables.
- Keep `.env` files out of git.
- Use separate secrets for development, staging, and production.

## 13. Production Security Checklist

- Helmet enabled.
- CORS locked to approved frontend origins.
- HTTPS enforced.
- Passwords hashed with bcrypt or argon2.
- JWT secret strong and environment-specific.
- Zod validation on all public endpoints.
- Workspace membership checks on every workspace-scoped route.
- Upload type and size validation enabled.
- Raw file paths never exposed.
- Audit logs written for sensitive actions.
- Rate limits enabled for auth, upload, AI chat, analysis, and exports.
- Database migrations reviewed before deploy.
- Error responses do not expose stack traces.
- Logs exclude document content, passwords, tokens, and raw file paths.
- Dependency scanning enabled in CI.
- Backups configured for PostgreSQL.
- Storage encryption enabled in production.
- Legal AI disclaimer visible in product and report surfaces.
