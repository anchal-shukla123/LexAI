# LexAI Recruiter Demo Script

Use this 3-5 minute walkthrough for the deployed portfolio demo.

## Pre-Demo Checks

1. Open the live app: https://lex-ai-frontend-opal.vercel.app/
2. Confirm the backend is healthy:
   - `https://lexai-1agi.onrender.com/health`
   - `https://lexai-1agi.onrender.com/ready`
3. Sign up or log in so the workspace shell shows `Signed in`.
4. Keep one small contract file ready, preferably a PDF or DOCX with visible indemnity, termination, payment, or confidentiality terms.

## 3-5 Minute Walkthrough

### 1. Landing and Product Pitch

Open `/` and say:

> LexAI is a full-stack legal document intelligence MVP. It helps a business user upload a contract, identify risky clauses, create a report, rewrite clauses, prepare a negotiation pack, export a PDF, and ask document-aware questions.

Point out that the app is deployed and the intelligence layer is clearly labeled as deterministic rule-based output.

### 2. Upload Contract

Open `/upload`.

Upload the prepared contract and start the review. If you need a fast fallback, use one of the clearly labeled sample examples on the upload page.

Call out:

- Supported files: PDF, DOCX, PNG, JPG, JPEG.
- The upload flow creates a real document route when backend upload and analysis are available.
- Sample/demo routes are labeled and should not appear as fake content on real document routes.

### 3. Analyze and View Report

After analysis completes, open the analysis page and then the report.

Show:

- Risk score.
- Top risks.
- Affected clauses.
- Recommendations.
- Rule-based real analysis label.
- Legal disclaimer.

Open the report page and export the PDF if the deployed storage/export path is available. If export storage is temporary, show the user-friendly limitation state rather than a broken flow.

### 4. Review and Rewrite Clauses

Open clause review from the analysis or report page.

Select a risky clause and generate a rewrite. Show:

- Original clause.
- Rewritten clause.
- Key changes.
- What changed and why.
- Rewrite history.
- Status badge.

Mark the rewrite as accepted and copy the rewritten clause.

### 5. Generate Negotiation Pack

Open `/contracts/<documentId>/negotiation`.

Show:

- Negotiation summary.
- Top issues.
- Accepted rewrites.
- Pending draft rewrites, if any.
- Recommended priorities.
- Checklist.
- Legal disclaimer.

Generate a professional counterparty email and copy it.

### 6. Ask a Chat Question

Open `/ai-chat?documentId=<documentId>`.

Ask:

```text
What should I negotiate first?
```

Show that the response is tied back to the selected document context and can link back into review/rewrite flows when a clause reference exists.

## Route Checklist

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/documents`
- `/upload`
- `/reports`
- `/contracts/<documentId>/clauses`
- `/contracts/<documentId>/negotiation`
- `/ai-chat?documentId=<documentId>`

## Demo Safety Checks

- Real document routes should not show fake demo negotiation content.
- Demo/sample data should be clearly labeled.
- Rule-based output should be clearly labeled.
- Errors should be human-readable, not stack traces.
- No local-only paths should appear in the deployed UI.
- Legal disclaimer should remain visible on report, clause review, negotiation, and export surfaces.
