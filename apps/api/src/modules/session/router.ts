import { Hono } from "hono";
import type { Message } from "@anvia/core";
import { memory } from "@repo/db";

export type SessionItem = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

function extractTextFromMessage(msg: Message): string {
  if (typeof msg.content === "string") {
    return msg.content.trim();
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
  }
  return "";
}

function getConversationTitle(messages: { message: Message }[], fallbackId: string): string {
  for (const item of messages) {
    if (item.message.role === "user") {
      const text = extractTextFromMessage(item.message);
      if (text) {
        return text.length > 60 ? text.slice(0, 57) + "..." : text;
      }
    }
  }
  return `Chat ${fallbackId.slice(0, 8)}`;
}

export const sessionRouter = new Hono()
  .get("/session", async (c) => {
    const summaries =
      (await memory.inspector?.listConversations({
        limit: 50,
      })) ?? [];

    const sessions: SessionItem[] = await Promise.all(
      summaries.map(async (summary) => {
        const conv = await memory.inspector?.getConversation({ ref: summary.ref });
        const title = getConversationTitle(conv?.messages ?? [], summary.sessionId);
        return {
          id: summary.sessionId,
          title,
          updatedAt: summary.updatedAt,
          messageCount: summary.messageCount,
        };
      })
    );

    return c.json({ sessions });
  })
  .get("/session/:id", async (c) => {
    const id = c.req.param("id");
    const conversations = await memory.inspector?.listConversations({
      limit: 100,
    });
    const summary = conversations?.find(
      (item) => item.sessionId === id || item.ref === id
    );
    const conversation = summary
      ? await memory.inspector?.getConversation({ ref: summary.ref })
      : undefined;

    if (!conversation) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json({ conversation });
  })
  .delete("/session/:id", async (c) => {
    const id = c.req.param("id");
    await memory.clear({ scope: { sessionId: id } });
    return c.json({ ok: true, id });
  });
