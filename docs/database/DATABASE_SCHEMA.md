# LexAI Database Schema Plan

This plan describes the relational model LexAI should implement with PostgreSQL and Prisma. It is not a Prisma schema file. Field names are Prisma-friendly so the future `schema.prisma` can be created directly from this design.

## Enums

### UserRole

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

### DocumentStatus

- `UPLOADED`
- `PROCESSING`
- `ANALYZED`
- `FAILED`
- `ARCHIVED`

### AnalysisStatus

- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### RiskLevel

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### ClauseCategory

- `LIABILITY`
- `PRIVACY`
- `TERMINATION`
- `PAYMENT`
- `SECURITY`
- `AUDIT`
- `INDEMNITY`
- `NOTICES`
- `OTHER`

### ReportStatus

- `DRAFT`
- `READY`
- `EXPORTED`
- `FAILED`

### ExportFormat

- `PDF`
- `DOCX`
- `SECURE_LINK`

### ExportStatus

- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### ChatRole

- `USER`
- `ASSISTANT`
- `SYSTEM`

## 1. User

### Purpose

Represents a person who can authenticate, belong to workspaces, upload documents, run analysis, chat with AI, and export reports.

### Important fields

- `id String @id @default(cuid())`
- `email String @unique`
- `name String?`
- `passwordHash String?`
- `avatarUrl String?`
- `emailVerifiedAt DateTime?`
- `lastLoginAt DateTime?`
- `createdAt DateTime`
- `updatedAt DateTime`
- `deletedAt DateTime?`

### Relationships

- Has many `WorkspaceMember` records.
- Has one `UserSettings`.
- Has many uploaded `Document` records through `createdById`.
- Has many `ChatMessage` records through `createdById`.
- Has many `AuditLog` records through `actorUserId`.

### Indexes

- Unique index on `email`.
- Index on `createdAt`.

### Notes

Email should be stored lowercase. MVP delete should be a soft or mock delete; avoid hard deleting user data until retention and billing policies are finalized.

## 2. Workspace

### Purpose

Represents a tenant boundary for documents, members, settings, reports, and audit logs.

### Important fields

- `id String @id @default(cuid())`
- `name String`
- `slug String @unique`
- `createdById String`
- `createdAt DateTime`
- `updatedAt DateTime`
- `deletedAt DateTime?`

### Relationships

- Has many `WorkspaceMember` records.
- Has many `Document` records.
- Has one `WorkspaceSettings`.
- Has many `ChatSession` records.
- Has many `Report` records.
- Has many `AuditLog` records.

### Indexes

- Unique index on `slug`.
- Index on `createdById`.
- Index on `createdAt`.

### Notes

Even if MVP starts as one workspace per user, all document and report access should still be workspace-scoped.

## 3. WorkspaceMember

### Purpose

Joins users to workspaces and defines role-based permissions.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String`
- `userId String`
- `role UserRole`
- `invitedById String?`
- `joinedAt DateTime?`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Workspace`.
- Belongs to `User`.
- Optionally references inviter `User`.

### Indexes

- Unique composite index on `workspaceId` and `userId`.
- Index on `userId`.
- Index on `workspaceId`.
- Index on `role`.

### Notes

This table is the source of authorization for workspace access. Do not infer access from document ownership alone.

## 4. Document

### Purpose

Represents a legal document record and its lifecycle.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String`
- `createdById String`
- `title String`
- `description String?`
- `status DocumentStatus`
- `currentAnalysisJobId String?`
- `riskScore Int?`
- `summary String?`
- `createdAt DateTime`
- `updatedAt DateTime`
- `deletedAt DateTime?`

### Relationships

- Belongs to `Workspace`.
- Belongs to creator `User`.
- Has one or many `DocumentFile` records.
- Has many `AnalysisJob` records.
- Has one current `AnalysisJob` through `currentAnalysisJobId`.
- Has many `ClauseFinding` records.
- Has many `RiskFinding` records.
- Has many `Recommendation` records.
- Has many `ChatSession` records.
- Has many `Report` records.

### Indexes

- Index on `workspaceId`.
- Index on `status`.
- Index on `createdById`.
- Index on `createdAt`.
- Index on `deletedAt`.

### Notes

Documents should be soft deleted using `deletedAt`. Queries should exclude deleted documents by default.

## 5. DocumentFile

### Purpose

Stores metadata for uploaded files without exposing raw storage paths to the client.

### Important fields

- `id String @id @default(cuid())`
- `documentId String`
- `fileName String`
- `originalName String`
- `mimeType String`
- `extension String`
- `sizeBytes Int`
- `storageKey String`
- `checksum String?`
- `uploadedById String`
- `createdAt DateTime`

### Relationships

- Belongs to `Document`.
- Belongs to uploader `User`.

### Indexes

- Index on `documentId`.
- Index on `uploadedById`.
- Index on `storageKey`.

### Notes

`storageKey` should be an internal key, not a raw local path. S3 migration should only require changing the storage adapter.

## 6. AnalysisJob

### Purpose

Tracks async document analysis lifecycle and captures worker failures.

### Important fields

- `id String @id @default(cuid())`
- `documentId String`
- `workspaceId String`
- `requestedById String`
- `status AnalysisStatus`
- `provider String`
- `startedAt DateTime?`
- `completedAt DateTime?`
- `failedAt DateTime?`
- `errorCode String?`
- `errorMessage String?`
- `metadata Json?`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Document`.
- Belongs to `Workspace`.
- Belongs to requesting `User`.
- Can be referenced by `Document.currentAnalysisJobId`.

### Indexes

- Index on `documentId`.
- Index on `workspaceId`.
- Index on `status`.
- Index on `createdAt`.

### Notes

Use idempotent processors. A job should be safe to retry without duplicating findings.

## 7. ClauseFinding

### Purpose

Stores extracted legal clauses and simplified explanations.

### Important fields

- `id String @id @default(cuid())`
- `documentId String`
- `analysisJobId String`
- `category ClauseCategory`
- `title String`
- `sourceText String`
- `plainLanguageSummary String`
- `confidence Float`
- `pageNumber Int?`
- `startOffset Int?`
- `endOffset Int?`
- `createdAt DateTime`

### Relationships

- Belongs to `Document`.
- Belongs to `AnalysisJob`.

### Indexes

- Index on `documentId`.
- Index on `analysisJobId`.
- Index on `category`.

### Notes

Future OCR and citations should populate page and offset fields.

## 8. RiskFinding

### Purpose

Stores legal or business risks identified in a document.

### Important fields

- `id String @id @default(cuid())`
- `documentId String`
- `analysisJobId String`
- `clauseFindingId String?`
- `riskLevel RiskLevel`
- `title String`
- `description String`
- `evidence String?`
- `impact String?`
- `confidence Float`
- `createdAt DateTime`

### Relationships

- Belongs to `Document`.
- Belongs to `AnalysisJob`.
- Optionally belongs to `ClauseFinding`.
- Has many `Recommendation` records.

### Indexes

- Index on `documentId`.
- Index on `riskLevel`.
- Index on `analysisJobId`.
- Index on `clauseFindingId`.

### Notes

Risk findings should be evidence-backed. Avoid storing unsupported claims without source context.

## 9. Recommendation

### Purpose

Stores practical actions users can take to improve or negotiate a document.

### Important fields

- `id String @id @default(cuid())`
- `documentId String`
- `analysisJobId String`
- `riskFindingId String?`
- `title String`
- `description String`
- `priority Int`
- `createdAt DateTime`

### Relationships

- Belongs to `Document`.
- Belongs to `AnalysisJob`.
- Optionally belongs to `RiskFinding`.

### Indexes

- Index on `documentId`.
- Index on `riskFindingId`.
- Index on `priority`.

### Notes

Recommendations should be actionable, not generic legal commentary.

## 10. ChatSession

### Purpose

Groups AI chat messages for a document within a workspace.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String`
- `documentId String`
- `createdById String`
- `title String?`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Workspace`.
- Belongs to `Document`.
- Belongs to creator `User`.
- Has many `ChatMessage` records.

### Indexes

- Index on `documentId`.
- Index on `workspaceId`.
- Index on `createdById`.
- Index on `updatedAt`.

### Notes

Chat sessions should always be scoped to a document so future grounding and citations are reliable.

## 11. ChatMessage

### Purpose

Stores user, assistant, and system messages.

### Important fields

- `id String @id @default(cuid())`
- `chatSessionId String`
- `role ChatRole`
- `content String`
- `createdById String?`
- `citations Json?`
- `metadata Json?`
- `createdAt DateTime`

### Relationships

- Belongs to `ChatSession`.
- Optionally belongs to creator `User`.

### Indexes

- Index on `chatSessionId`.
- Index on `createdAt`.

### Notes

Assistant messages should eventually include citations. MVP mock responses can use empty citation arrays.

## 12. Report

### Purpose

Stores a generated document intelligence report.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String`
- `documentId String`
- `createdById String`
- `status ReportStatus`
- `title String`
- `summarySnapshot String?`
- `riskScoreSnapshot Int?`
- `content Json`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Workspace`.
- Belongs to `Document`.
- Belongs to creator `User`.
- Has many `ExportJob` records.

### Indexes

- Index on `documentId`.
- Index on `workspaceId`.
- Index on `status`.
- Index on `createdAt`.

### Notes

Reports should snapshot key analysis data so they remain stable even if findings are recalculated later.

## 13. ExportJob

### Purpose

Tracks async report exports for PDF, DOCX, and secure links.

### Important fields

- `id String @id @default(cuid())`
- `reportId String`
- `workspaceId String`
- `requestedById String`
- `format ExportFormat`
- `status ExportStatus`
- `storageKey String?`
- `shareTokenHash String?`
- `expiresAt DateTime?`
- `startedAt DateTime?`
- `completedAt DateTime?`
- `failedAt DateTime?`
- `errorMessage String?`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Report`.
- Belongs to `Workspace`.
- Belongs to requesting `User`.

### Indexes

- Index on `reportId`.
- Index on `workspaceId`.
- Index on `status`.
- Index on `createdAt`.

### Notes

Store hashes for share tokens, not raw tokens. Export artifacts should be private by default.

## 14. UserSettings

### Purpose

Stores user-level preferences.

### Important fields

- `id String @id @default(cuid())`
- `userId String @unique`
- `theme String?`
- `defaultWorkspaceId String?`
- `emailNotificationsEnabled Boolean`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `User`.

### Indexes

- Unique index on `userId`.

### Notes

Keep settings flexible but avoid unbounded JSON for core preferences that need querying.

## 15. WorkspaceSettings

### Purpose

Stores workspace-level preferences and AI defaults.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String @unique`
- `defaultRiskThreshold RiskLevel?`
- `allowedUploadTypes String[]`
- `maxUploadSizeBytes Int`
- `aiPreferences Json?`
- `createdAt DateTime`
- `updatedAt DateTime`

### Relationships

- Belongs to `Workspace`.

### Indexes

- Unique index on `workspaceId`.

### Notes

MVP defaults should allow PDF, DOCX, PNG, JPG, and JPEG with a 20MB maximum.

## 16. AuditLog

### Purpose

Provides immutable records of sensitive actions for security and compliance.

### Important fields

- `id String @id @default(cuid())`
- `workspaceId String?`
- `actorUserId String?`
- `action String`
- `entityType String`
- `entityId String?`
- `ipAddress String?`
- `userAgent String?`
- `metadata Json?`
- `createdAt DateTime`

### Relationships

- Optionally belongs to `Workspace`.
- Optionally belongs to actor `User`.

### Indexes

- Index on `workspaceId`.
- Index on `actorUserId`.
- Index on `action`.
- Index on `entityType` and `entityId`.
- Index on `createdAt`.

### Notes

Audit logs are immutable. Do not hard delete audit logs in MVP.

## Relationship Summary

- User has many workspace memberships.
- Workspace has many documents.
- Workspace has many members through `WorkspaceMember`.
- Document has one current `AnalysisJob`.
- Document has many clause findings.
- Document has many risk findings.
- Document has many recommendations.
- Document has many reports.
- ChatSession belongs to a document and workspace.
- ChatMessage belongs to a chat session.
- Report belongs to a document and workspace.
- ExportJob belongs to a report and workspace.
- AuditLog belongs to a workspace when the action is tenant-scoped.

## Indexing Strategy

- `user.email` unique.
- `workspace.slug` unique.
- `workspaceMember.workspaceId + workspaceMember.userId` unique.
- `document.workspaceId`.
- `document.status`.
- `analysisJob.documentId`.
- `riskFinding.documentId`.
- `riskFinding.riskLevel`.
- `chatSession.documentId`.
- `report.documentId`.
- `auditLog.workspaceId`.
- `auditLog.createdAt`.

Use compound indexes for common list views after observing query patterns, especially `(workspaceId, createdAt)` on documents, reports, and audit logs.

## Deletion Policy

- Soft delete documents using `deletedAt`.
- Keep audit logs immutable.
- Do not hard delete user data in MVP except mock delete flows.
- Uploaded files should be retained while a document is active.
- Future production deletion must define retention windows, legal holds, billing retention, and export cleanup.
