/**
 * Safe multi-layer storage helper designed for restrictive browser environments
 * like Safe Exam Browser (SEB), embedded WebViews, and private modes.
 * 
 * Fallback chain: localStorage -> sessionStorage -> document.cookie -> MemoryMap
 */

const memoryStore = new Map<string, string>();

function setCookie(key: string, value: string, days = 7) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors
  }
}

function getCookie(key: string): string | null {
  try {
    const nameEQ = encodeURIComponent(key) + '=';
    const ca = document.cookie.split(';');
    for (let c of ca) {
      c = c.trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
  } catch {
    // Ignore cookie read errors
  }
  return null;
}

function removeCookie(key: string) {
  try {
    document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie remove errors
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    // 1. Try localStorage
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // localStorage blocked or threw SecurityError
    }

    // 2. Try sessionStorage
    try {
      const val = window.sessionStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // sessionStorage blocked
    }

    // 3. Try document.cookie
    const cookieVal = getCookie(key);
    if (cookieVal !== null) return cookieVal;

    // 4. Try memoryStore
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    let saved = false;

    // 1. Try localStorage
    try {
      window.localStorage.setItem(key, value);
      saved = true;
    } catch {
      // Ignore
    }

    // 2. Try sessionStorage
    try {
      window.sessionStorage.setItem(key, value);
      saved = true;
    } catch {
      // Ignore
    }

    // 3. Set cookie as fallback
    setCookie(key, value);

    // 4. Set memoryStore
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {}

    try {
      window.sessionStorage.removeItem(key);
    } catch {}

    removeCookie(key);
    memoryStore.delete(key);
  },

  getJson<T>(key: string, fallback: T | null = null): T | null {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJson(key: string, value: unknown): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {}
  },
};
