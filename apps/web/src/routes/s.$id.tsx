import { createFileRoute } from "@tanstack/react-router";
import { messagesToUIMessages, type UIMessage } from "@anvia/client";
import { ChatScreen } from "../components/chat-screen";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type StoredMessage = {
  message: Parameters<typeof messagesToUIMessages>[0][number];
};

type SessionResponse = {
  conversation?: { messages: StoredMessage[] };
};

async function loadSession(id: string): Promise<UIMessage[]> {
  try {
    const response = await fetch(`${baseUrl}/api/session/${id}`);
    if (!response.ok) return [];
    const data = (await response.json()) as SessionResponse;
    const messages = data.conversation?.messages ?? [];
    return messagesToUIMessages(messages.map((item) => item.message));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/s/$id")({
  loader: ({ params }) => loadSession(params.id),
  pendingComponent: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 text-sm text-zinc-400">
      Loading conversation…
    </div>
  ),
  component: Session,
});

function Session() {
  const { id } = Route.useParams();
  const initialMessages = Route.useLoaderData();
  return <ChatScreen key={id} sessionId={id} initialMessages={initialMessages} />;
}
