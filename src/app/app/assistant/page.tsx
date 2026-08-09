import { Suspense } from "react";
import { AssistantChat } from "@/components/chat/assistant-chat";

export const metadata = { title: "Ask NyayAI" };

export default function AssistantPage() {
  return (
    <div className="workspace-page !max-w-[100rem]">
      <header className="mb-7 max-w-3xl">
        <p className="eyebrow text-navy-700">Ask NyayAI</p>
        <h1 className="mt-3 font-serif-display text-4xl text-navy-950">Understand the issue. See the route.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">Answers are organized as legal guidance with visible source and verification status—not as legal advice.</p>
      </header>
      <Suspense><AssistantChat /></Suspense>
    </div>
  );
}
