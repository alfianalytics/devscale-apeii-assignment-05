import {
  Agent,
  type AgentMemory,
  type MemoryScope,
  type Message,
} from "@anvia/core";
import { OpenAIClient } from "@anvia/openai";
import { agentTools } from "./tools.js";
import { formatUserMemoryBlock } from "./user-memory.js";

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseUrl: process.env.OPENAI_BASE_URL ?? "https://gateway.devscale.id/v1",
});

const model = client.completionModel({
  modelId: process.env.MODEL_ID || "deepseek-v4.1-flash",
});

export type RunAgentOptions = {
  id?: string;
  prompt?: string;
  messages?: readonly Message[];
  memory?: AgentMemory;
  session?: MemoryScope;
};

export function runAgent(options: RunAgentOptions) {
  const userMemoryBlock = formatUserMemoryBlock();

  const agent = new Agent({
    id: options.id ?? "anvia-research-agent",
    name: "Anvia Research & Knowledge Agent",
    description:
      "Full-stack AI assistant equipped with live web search, webpage reader, internal RAG knowledge retrieval, and cross-session user memory.",
    model,
    instructions: [
      "You are Anvia Assistant, a helpful, accurate, and articulate AI research and engineering assistant.",
      "You have access to four tools:",
      "1. `web_search`: Use this to search the live web via Tavily for current events, documentation, facts, or external research.",
      "2. `search_knowledge_base`: Use this when asked about internal policies or course topics (such as Atlas reset link expiry, Anvia full-stack architecture, or HR leave policies). Always cite the source returned by the knowledge base.",
      "3. `read_webpage`: Use this when the user provides or asks to inspect a specific URL in detail.",
      "4. `remember_user_fact`: Whenever the user tells you their name, role, project, preferences, or asks you to remember something about them, ALWAYS call `remember_user_fact` so it is saved across all future chat sessions!",
      "Format your responses clearly using Markdown (headings, bullet points, code blocks, and source links where appropriate).",
      "Pay close attention to both the current conversation memory AND the Cross-Session User Profile Memory below.",
      userMemoryBlock,
    ]
      .filter(Boolean)
      .join("\n"),
    tools: agentTools,
    maxTurns: 6,
    memory: options.memory,
  });

  if (options.session) {
    if (!options.prompt) {
      throw new Error("session requires prompt");
    }
    return agent.stream({
      prompt: options.prompt,
      session: options.session,
    });
  }

  return agent.stream({
    messages: [...(options.messages ?? [])],
  });
}

export { agentTools } from "./tools.js";
