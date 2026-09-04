import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NyayAI — Legal navigation for India",
    template: "%s · NyayAI",
  },
  description:
    "NyayAI helps you understand cases, documents and legal processes in plain language — with sources you can verify.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground font-sans">{children}<Analytics /></body>
    </html>
  );
}
