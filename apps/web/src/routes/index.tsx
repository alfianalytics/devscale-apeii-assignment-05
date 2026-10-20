import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  Globe,
  Send,
  Sparkles,
} from "lucide-react";
import { newSessionId, setPendingMessage } from "../lib/pending-message";

export const Route = createFileRoute("/")({
  component: Home,
});

const STARTER_PROMPTS = [
  {
    icon: BookOpen,
    title: "Internal Policy (RAG)",
    prompt: "My Atlas password reset link is 45 minutes old. Can I still use it, and what is the policy?",
    badge: "search_knowledge_base",
  },
  {
    icon: Globe,
    title: "Live Web Research",
    prompt: "Search the web for the latest TypeScript 5.8 / Node.js 24 features and summarize key highlights with URLs.",
    badge: "web_search",
  },
  {
    icon: FileText,
    title: "Session Memory Test",
    prompt: "Hi! My name is Alfian and I am building a full-stack Anvia monorepo for Day 14. Please remember this!",
    badge: "memory",
  },
];

function Home() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  function startConversation(text: string) {
    const message = text.trim();
    if (!message) return;
    const id = newSessionId();
    setPendingMessage(id, message);
    void navigate({ to: "/s/$id", params: { id } });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startConversation(input);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-zinc-950 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Anvia Full-Stack Monorepo · TanStack Router + Hono + Prisma
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            What would you like to research today?
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Powered by <code className="text-indigo-400">@anvia/core</code>,{" "}
            <code className="text-indigo-400">@anvia/react-ui</code>, Tavily Web Search, and persistent session memory.
          </p>
        </div>

        {/* Prompt Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3 shadow-xl focus-within:border-indigo-500/60 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                startConversation(input);
              }
            }}
            placeholder="Message Anvia Assistant… (Press Enter to send)"
            rows={3}
            className="w-full bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-1">
              <span>Tools: Web Search · Knowledge RAG · Webpage Reader</span>
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 text-xs font-medium transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Start Chat
            </button>
          </div>
        </form>

        {/* Starter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STARTER_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => startConversation(item.prompt)}
                className="flex flex-col justify-between text-left p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    "{item.prompt}"
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
