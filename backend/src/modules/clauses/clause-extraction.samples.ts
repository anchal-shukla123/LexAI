import { extractClauseDraftsFromText } from "./clause-extraction.service.js";

export const clauseExtractionSampleCases = [
  {
    name: "numbered headings",
    text: [
      "1. Confidentiality",
      "Each party shall protect confidential and proprietary information and may not disclose trade secrets.",
      "",
      "2. Termination",
      "Either party may terminate this agreement for material breach after a thirty day notice period."
    ].join("\n")
  },
  {
    name: "all-caps headings",
    text: [
      "LIMITATION OF LIABILITY",
      "Neither party shall be liable for consequential or indirect damages, and aggregate liability is limited.",
      "",
      "GOVERNING LAW",
      "This agreement is governed by the laws of New York and the courts of New York have jurisdiction."
    ].join("\n")
  },
  {
    name: "keyword paragraph fallback",
    text: "The vendor shall indemnify, defend, and hold harmless the customer from third-party claims arising from breach of confidentiality or misuse of personal data."
  },
  {
    name: "no legal headings",
    text: "This document is a short project note with general business context and no clear contract clauses."
  }
];

export function runClauseExtractionSampleCases() {
  return clauseExtractionSampleCases.map((sample) => ({
    name: sample.name,
    clauses: extractClauseDraftsFromText(sample.text).map((clause) => ({
      title: clause.title,
      category: clause.category,
      confidence: clause.confidence
    }))
  }));
}
