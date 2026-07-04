# LexAI Project Overview

LexAI is an AI-powered contract and legal document intelligence SaaS MVP built for the ApexGroup product ecosystem. It focuses on a practical legal workflow: upload a document, generate structured analysis, review risk and clause findings, open a report, and explore document-aware chat context.

## Product Vision

Legal review is often slow, fragmented, and difficult to translate into clear business action. LexAI is designed as a focused workspace where teams can turn contracts into structured, reviewable intelligence: risk scores, clause summaries, recommendations, reports, and conversational context.

The current product is an MVP. It demonstrates the end-to-end product journey and technical foundation while using mock AI outputs. The goal is to show how a future OCR and LLM-backed legal intelligence platform would feel and operate without overstating the current AI capability.

Live demo: https://lex-ai-frontend-opal.vercel.app/

## Target Users

- Startup founders reviewing commercial and financing documents.
- Operators managing vendor agreements and DPAs.
- Legal teams triaging routine contract risk.
- Portfolio and internal product reviewers evaluating SaaS workflow quality.
- Recruiters or technical reviewers assessing full-stack execution.

## Core Value Proposition

LexAI provides a premium, workspace-oriented interface for contract intelligence. It combines document upload, analysis, findings, reports, and chat into one cohesive flow, while preserving a demo fallback mode so the product remains explorable even without a logged-in session.

## What the MVP Supports

- Landing, auth, dashboard, documents, upload, analysis, chat, reports, and settings screens.
- Signup, login, logout, and JWT-aware API calls.
- Auth-aware workspace mode when a valid token exists.
- Demo Mode fallback when no token exists.
- Document creation and file upload flow.
- Mock AI analysis persisted in PostgreSQL.
- Risk findings, clause findings, recommendations, and reports.
- Chat session detail views grounded in existing document context.

## What Is Mocked

The AI analysis provider is mocked. It creates realistic structured outputs and stores them in the database, but it does not perform production OCR, extraction, semantic search, or live LLM reasoning. This is intentional for the MVP stage.

## Product Principles

- Premium but practical: the UI should feel investor/recruiter ready without becoming decorative.
- Honest AI positioning: the app should clearly represent mock analysis as an MVP capability.
- Demo resilience: users should be able to explore the product even without auth.
- Auth-aware by default: logged-in users should see workspace-specific data.
- Full-stack clarity: the repo should be easy to run, inspect, and explain.

## Current User Journey

1. Visitor opens the landing page.
2. User signs up or logs in.
3. Shell switches to `Signed in` workspace mode.
4. User opens the dashboard and documents library.
5. User uploads a document.
6. Backend creates the document, stores file metadata, and runs mock analysis.
7. User lands on the analysis page with risk score, clause findings, risk findings, and recommendations.
8. User opens a report or AI chat context.
9. User can log out and continue exploring in `Demo Mode`.

## Portfolio Readiness

LexAI is suitable as a portfolio MVP because it demonstrates:

- Full-stack TypeScript implementation.
- Auth-aware API client and backend request context.
- PostgreSQL schema usage through Prisma.
- Real upload and persistence flow.
- Frontend fallback states and non-blocking demo UX.
- Polished SaaS interface and recruiter-friendly documentation.

## Near-Term Product Opportunities

- Replace mock AI with OCR plus LLM-backed document analysis.
- Add richer document previews and evidence citation.
- Add report export jobs and download support.
- Add workspace invitations and team role management.
- Add deployment documentation and production environment examples.
