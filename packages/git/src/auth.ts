import { safeStorage } from '@edith/core';

const PAT_KEY = 'edith:github-pat';

// The token lives only in safeStorage (localStorage, with an in-memory
// fallback), never in the Page Project data itself (spec §28-31).
export function getStoredToken(): string | null {
  return safeStorage.getItem(PAT_KEY);
}

export function setStoredToken(token: string): void {
  safeStorage.setItem(PAT_KEY, token);
}

export function clearStoredToken(): void {
  safeStorage.removeItem(PAT_KEY);
}
