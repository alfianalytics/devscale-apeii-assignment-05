import {
  Link,
  Outlet,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import {
  Bot,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import "../styles.css";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type SessionItem = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount?: number;
};

async function loadSessions(): Promise<SessionItem[]> {
  try {
    const response = await fetch(`${baseUrl}/api/session`);
    if (!response.ok) return [];
    const data = (await response.json()) as { sessions: SessionItem[] };
    return data.sessions ?? [];
  } catch {
    return [];
  }
}

export const Route = createRootRoute({
  loader: () => loadSessions(),
  component: RootLayout,
});

function RootLayout() {
  const sessions = Route.useLoaderData();
  const router = useRouter();

  async function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`${baseUrl}/api/session/${id}`, { method: "DELETE" });
      await router.invalidate();
    } catch {
      // ignore error
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800/80 bg-zinc-900/50 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                Anvia Chat
              </div>
              <div className="text-[11px] text-zinc-500">
                Full-Stack Agent Monorepo
              </div>
            </div>
          </Link>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </Link>
        </div>

        {/* Session History List */}
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Recent Sessions ({sessions.length})
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-500">
              No saved conversations yet. Start a new chat!
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                to="/s/$id"
                params={{ id: session.id }}
                activeProps={{
                  className:
                    "bg-zinc-800/90 text-white border-zinc-700/80 shadow-xs",
                }}
                inactiveProps={{
                  className:
                    "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent",
                }}
                className="group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-indigo-400/80" />
                  <div className="truncate font-medium">{session.title}</div>
                </div>
                <button
                  type="button"
                  title="Delete conversation"
                  onClick={(e) => void handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-zinc-500 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            ))
          )}
        </nav>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Anvia Protocol v3</span>
          <span className="text-zinc-400 font-mono">@anvia/react-ui</span>
        </div>
      </aside>

      {/* Main Content Outlet */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
