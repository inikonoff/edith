// Settings (theme, GitHub PAT, editor preferences) go through this wrapper so
// a browser with localStorage disabled/full degrades to an in-memory store
// instead of throwing (spec §9).
const TEST_KEY = '__edith_safe_storage_test__';

function isLocalStorageAvailable(): boolean {
  try {
    window.localStorage.setItem(TEST_KEY, '1');
    window.localStorage.removeItem(TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

class SafeStorage {
  private readonly memory = new Map<string, string>();
  private readonly useLocalStorage: boolean;

  constructor() {
    this.useLocalStorage = typeof window !== 'undefined' && isLocalStorageAvailable();
  }

  getItem(key: string): string | null {
    if (this.useLocalStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.memory.get(key) ?? null;
      }
    }
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.useLocalStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to the in-memory fallback below.
      }
    }
    this.memory.set(key, value);
  }

  removeItem(key: string): void {
    if (this.useLocalStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    this.memory.delete(key);
  }
}

export const safeStorage = new SafeStorage();
