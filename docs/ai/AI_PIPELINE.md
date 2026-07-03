# LexAI AI Pipeline

## 1. Purpose

The LexAI AI pipeline transforms uploaded legal documents into understandable summaries, clause explanations, risk findings, recommendations, AI chat responses, and export-ready reports. The first backend version should use mock AI with real persistence so the application can validate product behavior before introducing OCR, embeddings, vector retrieval, or LLM providers.

## 2. MVP AI Strategy

MVP goals:

- Preserve the real backend workflow.
- Persist real analysis jobs, findings, recommendations, chat messages, and reports.
- Use deterministic mock analysis output.
- Avoid external AI provider costs and instability during early backend implementation.
- Make future provider replacement straightforward.

MVP pipeline:

1. User uploads document.
2. Backend validates file.
3. Document and file metadata are saved.
4. `AnalysisJob` is created.
5. Mock analysis worker generates:
   - summary
   - risk score
   - clause findings
   - risk findings
   - recommendations
6. Report becomes export-ready.
7. Chat uses mock grounded responses.

The mock engine should return realistic legal-document-shaped data so frontend and API flows can be tested end to end.

## 3. Future Production AI Strategy

Production pipeline:

1. OCR/text extraction.
2. Text chunking.
3. Clause classification.
4. Embeddings.
5. Vector retrieval.
6. LLM summarization.
7. Risk scoring.
8. Recommendation generation.
9. Citation/source grounding.
10. Report generation.

Possible tools:

OCR:

- Tesseract
- AWS Textract
- Google Document AI

LLM:

- OpenAI API
- Anthropic
- local models later

Embeddings:

- OpenAI embeddings
- pgvector

Queue:

- BullMQ + Redis

Storage:

- S3-compatible storage

## 4. Document Processing Pipeline

MVP:

```text
Upload file
  -> validate file metadata
  -> save file locally
  -> store DocumentFile record
  -> create AnalysisJob
  -> run mock processor
```

Production:

```text
Upload file
  -> validate metadata and file signature
  -> store in private object storage
  -> extract text through OCR/parser
  -> normalize text
  -> detect pages and sections
  -> store extraction metadata
  -> enqueue clause/risk processing
```

Supported MVP input types:

- PDF
- DOCX
- PNG
- JPG
- JPEG

The system should be designed so adding text extraction later does not change public analysis APIs.

## 5. Clause Extraction Pipeline

MVP:

- Generate mock clause findings based on document category or static templates.
- Include category, title, source text, plain-language summary, and confidence.
- Use the `ClauseCategory` enum.

Production:

```text
Extracted text
  -> split into paragraphs/sections
  -> classify clause category
  -> identify legal obligations
  -> capture source spans
  -> generate plain-language explanation
  -> persist ClauseFinding records
```

Important clause categories:

- liability
- privacy
- termination
- payment
- security
- audit
- indemnity
- notices
- other

Clause findings should preserve source references for future citations and report evidence.

## 6. Risk Scoring Pipeline

MVP:

- Generate a deterministic risk score.
- Create a small set of mock risk findings.
- Map findings to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.

Production risk scoring inputs:

- missing clauses
- unusual obligations
- uncapped liability
- one-sided termination rights
- payment ambiguity
- privacy/security exposure
- audit requirements
- indemnity scope
- jurisdiction or notice issues

Production scoring flow:

```text
Clause findings
  -> rule checks
  -> model-assisted risk detection
  -> confidence scoring
  -> severity scoring
  -> aggregate document risk score
  -> persist RiskFinding records
```

Risk scores should be explainable. Users need to understand why a document is risky, not just see a number.

## 7. Recommendation Generation

MVP:

- Create practical mock recommendations tied to common risks.
- Store recommendations as separate records.

Production:

```text
Risk findings
  -> map severity and category to remediation patterns
  -> generate document-specific recommendation
  -> cite supporting clause text
  -> assign priority
  -> persist Recommendation records
```

Recommendation quality rules:

- Be specific.
- Be actionable.
- Explain expected benefit.
- Avoid pretending to provide binding legal advice.
- Link recommendations to risk findings when possible.

## 8. AI Chat Grounding

MVP:

- Chat sessions belong to one document and workspace.
- User messages and assistant messages are persisted.
- Assistant responses are mock grounded responses based on stored summary and findings.
- Responses include a legal disclaimer.

Production:

```text
User question
  -> authorize chat session
  -> retrieve document chunks and findings
  -> rank relevant context
  -> build grounded prompt
  -> call LLM
  -> validate answer style and safety
  -> attach citations
  -> persist messages
```

Grounding rules:

- Prefer document source text over general knowledge.
- Say when the document does not contain enough information.
- Include citations when available.
- Do not provide definitive legal advice.

## 9. Report Generation

MVP:

- Create a report from mock analysis output.
- Snapshot summary, risk score, findings, and recommendations.
- Mark report `READY` when analysis completes.
- Allow export jobs to be created against report records.

Production:

```text
Completed analysis
  -> select report template
  -> assemble executive summary
  -> include risk score
  -> include clauses and findings
  -> include recommendations
  -> include legal disclaimer
  -> generate PDF/DOCX/secure link
```

Reports should be stable snapshots. Re-running analysis should not silently mutate existing exported reports.

## 10. Human Review Layer

LexAI should keep users in control:

- Users decide whether to rely on AI findings.
- AI output should be editable or annotatable in future versions.
- High-risk findings should be easy to review.
- Reports should make clear that outputs are AI-generated.
- Future legal-review workflows can support comments, approvals, and lawyer handoff.

The system should support human review without requiring it in MVP.

## 11. Failure Handling

Failure cases:

- unsupported file type
- file too large
- storage failure
- OCR failure
- empty extracted text
- AI provider timeout
- AI provider malformed response
- queue worker crash
- report export failure

MVP behavior:

- Mark failed jobs as `FAILED`.
- Store safe error code and message.
- Mark document `FAILED` only when analysis fails.
- Allow retrying failed analysis jobs.

Production behavior:

- Retry transient failures with backoff.
- Send permanent failures to a dead-letter queue.
- Track provider latency and error rates.
- Avoid exposing provider secrets or raw stack traces.

## 12. Evaluation Metrics

AI quality metrics:

- extraction accuracy
- clause classification accuracy
- risk precision
- hallucination rate
- response grounding rate
- report generation time

Product metrics:

- upload success rate
- analysis completion rate
- analysis duration
- chat response time
- report export duration
- percentage of findings with citations
- user correction rate when review features exist

Operational metrics:

- queue depth
- worker failure count
- provider timeout rate
- token usage
- storage error rate

## 13. Future Enhancements

- OCR confidence visualization.
- Clause comparison across document versions.
- Contract playbooks by industry.
- Custom risk policies by workspace.
- pgvector-powered semantic search.
- Citation-first AI chat.
- Multi-document question answering.
- Human legal reviewer workflow.
- Secure external report sharing.
- Enterprise audit exports.
- Usage metering and billing integration.
