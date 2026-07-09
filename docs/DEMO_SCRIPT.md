# LexAI Demo Script

Use this script for a complete MVP walkthrough.

## Setup

1. Start the backend and frontend.
2. Confirm `http://localhost:8000/health` returns process status.
3. Confirm `http://localhost:8000/ready` returns database readiness.
4. Log in or sign up so the shell shows `Signed in`.

## Demo Flow

1. Open `/upload`.
2. Upload a contract file.
3. Run analysis and wait for completion.
4. Open the analysis page and explain the risk score, top risks, recommendations, and rule-based real analysis label.
5. Open the report from the analysis page.
6. Export the PDF report.
7. Open clause review from the report or analysis page.
8. Select a risky real clause and generate a rewrite.
9. Mark the rewrite as accepted.
10. Open the negotiation pack.
11. Confirm the accepted rewrite appears in the package.
12. Generate a professional counterparty email.
13. Copy the email.
14. Open AI chat with the same document and ask: `What should I negotiate first?`

## Demo Safety Checks

- Real document routes should not show fake demo negotiation content.
- Demo fallback content should only appear when no real document route is active or the backend is unavailable on demo-capable pages.
- Rule-based output should be clearly labeled.
- Legal disclaimer should remain visible on report, clause review, negotiation, and export surfaces.
