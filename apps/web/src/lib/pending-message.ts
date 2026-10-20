const pendingMessages = new Map<string, string>();

export function newSessionId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `chat-${random}`;
}

export function setPendingMessage(sessionId: string, message: string): void {
  pendingMessages.set(sessionId, message);
}

export function takePendingMessage(sessionId: string): string | undefined {
  const message = pendingMessages.get(sessionId);
  if (message !== undefined) {
    pendingMessages.delete(sessionId);
  }
  return message;
}
