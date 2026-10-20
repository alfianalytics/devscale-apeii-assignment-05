import fs from "node:fs";
import path from "node:path";

export type UserFact = {
  id: string;
  key: string;
  fact: string;
  updatedAt: string;
};

const MEMORY_FILE = path.resolve(process.cwd(), ".user-memory.json");

export function loadUserFacts(): UserFact[] {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserFact(key: string, fact: string): UserFact {
  const facts = loadUserFacts();
  const normalizedKey = key.trim().toLowerCase();
  const now = new Date().toISOString();

  const existingIdx = facts.findIndex(
    (f) => f.key.toLowerCase() === normalizedKey
  );

  const entry: UserFact = {
    id: existingIdx >= 0 ? facts[existingIdx].id : `mem-${Date.now()}`,
    key: key.trim(),
    fact: fact.trim(),
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    facts[existingIdx] = entry;
  } else {
    facts.push(entry);
  }

  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(facts, null, 2), "utf-8");
  } catch (err) {
    console.error("[user-memory] Failed to write memory file:", err);
  }

  return entry;
}

export function formatUserMemoryBlock(): string {
  const facts = loadUserFacts();
  if (facts.length === 0) return "";

  const lines = facts.map((f) => `- **${f.key}**: ${f.fact}`);
  return [
    "",
    "### Cross-Session User Profile Memory (Persisted across all chats):",
    ...lines,
  ].join("\n");
}
