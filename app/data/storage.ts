// The one place that reads and writes this device's saved data (localStorage, as JSON).
// Never throws: a full or blocked storage just means "not saved" / "use the default".

export function get<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function set(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* full or blocked */ }
}

export function del(key: string): void {
  try { localStorage.removeItem(key) } catch { /* blocked */ }
}

export function keys(): string[] {
  try { return Object.keys(localStorage) } catch { return [] }
}

/** raw text, for copying storage as it is (demo sandbox, backups) */
export function getRaw(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function setRaw(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* full or blocked */ }
}
