import { Suspense } from "react";
import { AssistantChat } from "@/components/chat/assistant-chat";

export const metadata = { title: "Ask NyayAI" };

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantChat />
    </Suspense>
  );
}
