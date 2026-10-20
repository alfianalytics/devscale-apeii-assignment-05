import { useState } from "react";
import type { UIToolMessagePart } from "@anvia/client";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe,
  BookOpen,
  FileText,
  Brain,
  Loader2,
  AlertCircle,
  Wrench,
} from "lucide-react";

function getToolIcon(toolName: string) {
  if (toolName === "web_search") return <Globe className="w-4 h-4 text-sky-400" />;
  if (toolName === "search_knowledge_base") return <BookOpen className="w-4 h-4 text-amber-400" />;
  if (toolName === "read_webpage") return <FileText className="w-4 h-4 text-emerald-400" />;
  if (toolName === "remember_user_fact") return <Brain className="w-4 h-4 text-purple-400" />;
  return <Wrench className="w-4 h-4 text-indigo-400" />;
}

function getToolLabel(toolName: string) {
  if (toolName === "web_search") return "Tavily Web Search";
  if (toolName === "search_knowledge_base") return "Knowledge Base Lookup (RAG)";
  if (toolName === "read_webpage") return "Webpage Reader";
  if (toolName === "remember_user_fact") return "Memory Updated (Cross-Session)";
  return toolName;
}

export function ToolCall({ part }: { part: UIToolMessagePart }) {
  const [open, setOpen] = useState(false);

  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "error";
  const isDone = part.state === "output-available";

  return (
    <div className="my-2.5 rounded-xl border border-zinc-800/90 bg-zinc-900/70 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {getToolIcon(part.toolName)}
          <span className="font-medium text-zinc-200 truncate">
            {getToolLabel(part.toolName)}
          </span>
          <code className="text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
            {part.toolName}
          </code>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running…
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Error
            </span>
          )}
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800/80 px-3.5 py-3 space-y-2.5 bg-zinc-950/60">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Arguments
            </div>
            <pre className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-300 overflow-x-auto font-mono text-[11px] leading-relaxed">
              {typeof part.input === "string"
                ? part.input
                : JSON.stringify(part.input, null, 2)}
            </pre>
          </div>

          {part.state === "output-available" && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Result Output
              </div>
              <pre className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-emerald-300/90 overflow-x-auto max-h-60 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}

          {part.state === "error" && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1">
                Error Details
              </div>
              <pre className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 overflow-x-auto font-mono text-[11px]">
                {part.error.message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
