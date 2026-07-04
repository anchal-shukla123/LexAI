import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LexAI",
  description: "Contract review workspace for risky clauses, reports, and legal workflows.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
