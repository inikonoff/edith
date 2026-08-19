import { safeStorage } from '@edith/core';

const GROQ_KEY = 'edith:groq-key';
const OPENROUTER_KEY = 'edith:openrouter-key';

// Keys live only in safeStorage (localStorage, with an in-memory fallback),
// never inside Page Project data — same pattern as the GitHub PAT in
// packages/git/src/auth.ts.
export function getGroqKey(): string | null {
  return safeStorage.getItem(GROQ_KEY);
}

export function setGroqKey(key: string): void {
  safeStorage.setItem(GROQ_KEY, key);
}

export function getOpenRouterKey(): string | null {
  return safeStorage.getItem(OPENROUTER_KEY);
}

export function setOpenRouterKey(key: string): void {
  safeStorage.setItem(OPENROUTER_KEY, key);
}
