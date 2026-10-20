import { Hono } from "hono";
import {
  agentToClientStream,
  parseClientStreamRequest,
} from "@anvia/client";
import { createClientStreamResponse } from "@anvia/server";
import type { Message } from "@anvia/core";
import { runAgent } from "@repo/agents";
import { memory } from "@repo/db";

function lastUserText(messages: readonly Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        return msg.content;
      }
      if (Array.isArray(msg.content)) {
        const text = msg.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("\n")
          .trim();
        if (text) return text;
      }
    }
  }
  return "";
}

export const chatRouter = new Hono().post("/chat", async (c) => {
  const body = parseClientStreamRequest(await c.req.json());
  if (body.type !== "messages") {
    return c.json({ error: "This endpoint accepts messages only." }, 400);
  }

  const sessionId =
    typeof body.metadata?.sessionId === "string" && body.metadata.sessionId.trim()
      ? body.metadata.sessionId
      : "default";

  const prompt = lastUserText(body.messages);
  if (!prompt) {
    return c.json({ error: "Prompt is required." }, 400);
  }

  const events = agentToClientStream({
    events: runAgent({
      prompt,
      memory: { store: memory, savePolicy: "turn" },
      session: { sessionId },
    }),
  });

  return createClientStreamResponse({ events });
});
