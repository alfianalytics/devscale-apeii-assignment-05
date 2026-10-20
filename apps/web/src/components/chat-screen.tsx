import { useEffect, useMemo } from "react";
import { createHttpClientTransport, type UIMessage } from "@anvia/client";
import { useChat } from "@anvia/react";
import {
  ChatProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@anvia/react-ui";
import { rootRouteId, useRouter } from "@tanstack/react-router";
import { Bot, Send, Square, Sparkles, User } from "lucide-react";
import { takePendingMessage } from "../lib/pending-message";
import { ToolCall } from "./tool-call";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ChatScreenProps = {
  sessionId: string;
  initialMessages?: UIMessage[];
};

export function ChatScreen({ sessionId, initialMessages = [] }: ChatScreenProps) {
  const router = useRouter();

  const transport = useMemo(
    () =>
      createHttpClientTransport({
        endpoint: baseUrl + "/api/chat",
        body: ({ request, headers }) => {
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
          }
          return JSON.stringify({
            ...request,
            metadata: { ...request.metadata, sessionId },
          });
        },
      }),
    [sessionId]
  );

  const chat = useChat({
    transport,
    initialMessages,
    onEvent: (event) => {
      if (event.type === "run_end") {
        void router.invalidate({
          filter: (match) => match.routeId === rootRouteId,
        });
      }
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const text = takePendingMessage(sessionId);
      if (text) {
        void chat.sendMessage({ text });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [sessionId, chat]);

  const streaming = chat.status === "submitted" || chat.status === "streaming";

  return (
    <ChatProvider controller={chat}>
      <ThreadPrimitive.Root className="flex flex-col h-full w-full bg-zinc-950">
        {/* Top Session Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-zinc-200">
              Anvia Research & Knowledge Agent
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 font-mono">
              {sessionId}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            Status:{" "}
            <span className="text-zinc-300 font-medium capitalize">{chat.status}</span>
          </div>
        </header>

        {/* Scrollable Message Viewport */}
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <ThreadPrimitive.Empty className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-200">
                Start your conversation
              </h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Ask any question, search live web facts with Tavily, or query internal company policies.
              </p>
            </ThreadPrimitive.Empty>

            <ThreadPrimitive.Messages className="space-y-6">
              {(message) =>
                message.role === "user" ? (
                  <MessagePrimitive.Root
                    key={message.id}
                    className="flex justify-end"
                  >
                    <div className="flex items-start gap-3 max-w-[82%]">
                      <div className="rounded-2xl rounded-tr-sm bg-indigo-600 text-white px-4 py-3 text-sm leading-relaxed shadow-sm">
                        <MessagePrimitive.Parts />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-zinc-300" />
                      </div>
                    </div>
                  </MessagePrimitive.Root>
                ) : (
                  <MessagePrimitive.Root
                    key={message.id}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-3.5 max-w-[90%] w-full">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 text-sm text-zinc-200 leading-relaxed">
                        <MessagePrimitive.Parts>
                          {(part) => {
                            if (part.type === "tool") {
                              return <ToolCall part={part} />;
                            }
                            if (part.type === "text") {
                              return (
                                <MessagePrimitive.Markdown className="prose prose-invert max-w-none space-y-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-indigo-400 [&_a]:underline [&_code]:bg-zinc-800/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:p-3.5 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold">
                                  {part.text}
                                </MessagePrimitive.Markdown>
                              );
                            }
                            return <MessagePrimitive.Part />;
                          }}
                        </MessagePrimitive.Parts>
                      </div>
                    </div>
                  </MessagePrimitive.Root>
                )
              }
            </ThreadPrimitive.Messages>

            <ThreadPrimitive.Error className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-300" />
          </div>
        </ThreadPrimitive.Viewport>

        {/* Bottom Composer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950">
          <div className="max-w-3xl mx-auto">
            <ComposerPrimitive.Root className="relative flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 focus-within:border-indigo-500/60 transition-colors shadow-lg">
              <ComposerPrimitive.TextareaInput
                placeholder="Ask Anvia Agent anything (web search, policies, research)…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none max-h-36 leading-relaxed"
              />
              {streaming ? (
                <ComposerPrimitive.Stop className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer shrink-0">
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </ComposerPrimitive.Stop>
              ) : (
                <ComposerPrimitive.Submit className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  Send
                </ComposerPrimitive.Submit>
              )}
            </ComposerPrimitive.Root>
          </div>
        </div>
      </ThreadPrimitive.Root>
    </ChatProvider>
  );
}
