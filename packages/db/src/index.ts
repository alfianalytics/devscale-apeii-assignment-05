import fs from "node:fs";
import path from "node:path";
import postgres from "@prisma/orm-postgres/runtime";
import { PrismaMemoryStore } from "@anvia/memory-prisma/v8";
import {
  createMemoryScopeKey,
  type MemoryAppendOptions,
  type MemoryClearOptions,
  type MemoryConversation,
  type MemoryConversationSummary,
  type MemoryInspector,
  type MemoryLoadOptions,
  type MemoryStore,
  type Message,
} from "@anvia/core";
import type { Contract } from "./prisma/contract.d.js";
import contractJson from "./prisma/contract.json" with { type: "json" };

const SESSIONS_FILE = path.resolve(process.cwd(), ".sessions-memory.json");

class FileBackedFallbackStore implements MemoryStore {
  private sessions = new Map<string, MemoryConversation>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(SESSIONS_FILE)) return;
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const data = JSON.parse(raw) as MemoryConversation[];
      if (Array.isArray(data)) {
        for (const conv of data) {
          this.sessions.set(conv.ref, conv);
        }
      }
    } catch {
      // ignore corrupted or missing file
    }
  }

  private saveToDisk() {
    try {
      const data = Array.from(this.sessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[db] Failed to persist sessions to disk:", err);
    }
  }

  readonly inspector: MemoryInspector = {
    listConversations: async ({ limit }) => {
      const all = Array.from(this.sessions.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return all.slice(0, limit).map(({ messages, ...summary }) => summary);
    },
    getConversation: async ({ ref }) => {
      return this.sessions.get(ref);
    },
  };

  async load({ scope }: MemoryLoadOptions): Promise<Message[]> {
    const key = createMemoryScopeKey({ scope });
    const conv = this.sessions.get(key);
    return conv ? conv.messages.map((m) => m.message) : [];
  }

  async append({ scope, runId, turn, messages }: MemoryAppendOptions): Promise<void> {
    const key = createMemoryScopeKey({ scope });
    const now = new Date().toISOString();
    let conv = this.sessions.get(key);
    if (!conv) {
      conv = {
        ref: key,
        sessionId: scope.sessionId,
        userId: scope.userId,
        metadata: scope.metadata,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        messages: [],
      };
      this.sessions.set(key, conv);
    }
    for (const msg of messages) {
      conv.messages.push({
        position: conv.messages.length,
        runId,
        turn,
        createdAt: now,
        message: msg,
      });
    }
    conv.messageCount = conv.messages.length;
    conv.updatedAt = now;
    this.saveToDisk();
  }

  async clear({ scope }: MemoryClearOptions): Promise<void> {
    const key = createMemoryScopeKey({ scope });
    this.sessions.delete(key);
    this.saveToDisk();
  }
}

class ResilientMemoryStore implements MemoryStore {
  private prismaStore?: PrismaMemoryStore;
  private fallbackStore = new FileBackedFallbackStore();
  private useFallback = false;

  constructor(prismaStore?: PrismaMemoryStore) {
    this.prismaStore = prismaStore;
    if (!prismaStore) {
      this.useFallback = true;
    }
  }

  private get activeStore(): MemoryStore {
    return this.useFallback || !this.prismaStore ? this.fallbackStore : this.prismaStore;
  }

  readonly inspector: MemoryInspector = {
    listConversations: async (options): Promise<MemoryConversationSummary[]> => {
      if (!this.useFallback && this.prismaStore?.inspector) {
        try {
          return await this.prismaStore.inspector.listConversations(options);
        } catch (err) {
          console.warn("[db] Postgres unreachable, falling back to in-memory store.");
          this.useFallback = true;
        }
      }
      return this.fallbackStore.inspector.listConversations(options);
    },
    getConversation: async (options): Promise<MemoryConversation | undefined> => {
      if (!this.useFallback && this.prismaStore?.inspector) {
        try {
          return await this.prismaStore.inspector.getConversation(options);
        } catch (err) {
          console.warn("[db] Postgres unreachable, falling back to in-memory store.");
          this.useFallback = true;
        }
      }
      return this.fallbackStore.inspector.getConversation(options);
    },
  };

  async load(options: MemoryLoadOptions): Promise<Message[]> {
    if (!this.useFallback && this.prismaStore) {
      try {
        return await this.prismaStore.load(options);
      } catch (err) {
        console.warn("[db] Postgres unreachable during load, falling back to in-memory store.");
        this.useFallback = true;
      }
    }
    return this.fallbackStore.load(options);
  }

  async append(options: MemoryAppendOptions): Promise<void> {
    if (!this.useFallback && this.prismaStore) {
      try {
        await this.prismaStore.append(options);
        return;
      } catch (err) {
        console.warn("[db] Postgres unreachable during append, falling back to in-memory store.");
        this.useFallback = true;
      }
    }
    await this.fallbackStore.append(options);
  }

  async clear(options: MemoryClearOptions): Promise<void> {
    if (!this.useFallback && this.prismaStore) {
      try {
        await this.prismaStore.clear(options);
        return;
      } catch {
        this.useFallback = true;
      }
    }
    await this.fallbackStore.clear(options);
  }
}

export const db = process.env.DATABASE_URL
  ? postgres<Contract>({
      contractJson,
      url: process.env.DATABASE_URL,
    })
  : undefined;

const prismaMemory = db ? new PrismaMemoryStore({ client: db }) : undefined;

export const memory: MemoryStore = new ResilientMemoryStore(prismaMemory);
