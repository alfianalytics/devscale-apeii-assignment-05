import { createTool } from "@anvia/core";
import { tavily } from "@tavily/core";
import z from "zod";
import { loadUserFacts, saveUserFact } from "./user-memory.js";

const KNOWLEDGE_DOCS = [
  {
    id: "doc-atlas-auth",
    title: "Atlas Account Access & Password Reset Policy",
    category: "Security & Authentication",
    content:
      "Password reset links in Atlas expire strictly after 30 minutes. If a user's reset link is older than 30 minutes (for example, 45 minutes old), it is expired and they must request a new link from the sign-in page. Multi-factor authentication (MFA) recovery codes are single-use and valid for 24 hours after generation.",
    source: "Atlas Support Policy / Account Access [1]",
  },
  {
    id: "doc-anvia-architecture",
    title: "Anvia Full-Stack Streaming Protocol & Architecture",
    category: "Engineering",
    content:
      "Anvia Full-Stack connects an Agent to a React chat UI over HTTP using four core packages: @anvia/server (streams framed JSONL events with the x-anvia-stream-protocol: anvia.client.v3 header), @anvia/client (adapts agent events and provides createHttpClientTransport), @anvia/react (useChat controller managing messages, status, and actions), and @anvia/react-ui (ThreadPrimitive, MessagePrimitive, and ComposerPrimitive).",
    source: "Anvia Engineering Handbook / Full-Stack Guide [2]",
  },
  {
    id: "doc-hr-leave",
    title: "Company Remote Work & Annual Leave Policy",
    category: "HR & Operations",
    content:
      "Full-time employees receive 18 days of paid annual leave per calendar year, plus 12 days of paid sick leave. Remote work is hybrid-flexible: engineers may work remotely up to 3 days per week. Leave requests of 3+ consecutive days should be submitted at least 7 days in advance.",
    source: "Employee Handbook v4.2 / HR Policies [3]",
  },
];

export const webSearchTool = createTool({
  name: "web_search",
  description:
    "Search the live web using Tavily for up-to-date news, documentation, facts, or technical topics. Returns title, snippet, and source URL.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
    maxResults: z
      .number()
      .min(1)
      .max(8)
      .optional()
      .describe("Number of results to fetch (default 4)"),
  }),
  execute: async ({ query, maxResults = 4 }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return {
        query,
        error: "TAVILY_API_KEY is not configured on the server.",
        results: [],
      };
    }

    try {
      const tvly = tavily({ apiKey });
      const response = await tvly.search(query, { maxResults });
      return {
        query,
        resultCount: response.results?.length ?? 0,
        results: (response.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      };
    } catch (error: any) {
      return {
        query,
        error: error?.message ?? String(error),
        results: [],
      };
    }
  },
});

export const searchKnowledgeBaseTool = createTool({
  name: "search_knowledge_base",
  description:
    "Search internal company policies and technical knowledge base (e.g., Atlas reset link expiration policy, Anvia architecture, HR leave policy). Always cite the returned source.",
  inputSchema: z.object({
    query: z.string().describe("Keywords or question to search in the internal knowledge base"),
  }),
  execute: async ({ query }) => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = KNOWLEDGE_DOCS.map((doc) => {
      const haystack = `${doc.title} ${doc.category} ${doc.content}`.toLowerCase();
      const score = terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
      return { doc, score };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const matches = (scored.length > 0 ? scored.map((s) => s.doc) : KNOWLEDGE_DOCS).slice(0, 2);

    return {
      query,
      passages: matches.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        content: m.content,
        source: m.source,
      })),
    };
  },
});

export const fetchWebpageReaderTool = createTool({
  name: "read_webpage",
  description:
    "Fetch and extract readable text content from a specific public HTTP/HTTPS URL for deeper inspection.",
  inputSchema: z.object({
    url: z.string().url().describe("The full HTTP/HTTPS URL to fetch and read"),
  }),
  execute: async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AnviaResearchAgent/1.0",
          Accept: "text/html,application/xhtml+xml,text/plain,application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return { url, status: response.status, error: `HTTP ${response.status} ${response.statusText}` };
      }

      const raw = await response.text();
      const cleaned = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      return {
        url,
        status: response.status,
        excerpt: cleaned || "No readable text extracted.",
      };
    } catch (error: any) {
      return {
        url,
        error: error?.message ?? String(error),
      };
    }
  },
});

export const rememberUserFactTool = createTool({
  name: "remember_user_fact",
  description:
    "Save an important personal fact, preference, name, project, or context about the user into persistent cross-session memory (like ChatGPT's 'Memory updated' feature) so you remember it across all future chat sessions.",
  inputSchema: z.object({
    key: z
      .string()
      .describe("Short category key for the fact, e.g. 'name', 'current_project', 'role', 'favorite_stack'"),
    fact: z
      .string()
      .describe("The fact or preference to remember across all sessions, e.g. 'User name is Alfian'"),
  }),
  execute: async ({ key, fact }) => {
    const saved = saveUserFact(key, fact);
    const allFacts = loadUserFacts();
    return {
      status: "saved",
      savedFact: saved,
      totalStoredFacts: allFacts.length,
    };
  },
});

export const agentTools = [
  webSearchTool,
  searchKnowledgeBaseTool,
  fetchWebpageReaderTool,
  rememberUserFactTool,
];
