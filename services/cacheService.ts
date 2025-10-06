// In-memory cache for JD and CV processing results
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly ttlMs: number;

  constructor(ttlMs = 24 * 60 * 60 * 1000) { // 24 hours default
    this.ttlMs = ttlMs;
  }

  private getKey(file: File, schemaVersion = 'v1'): string {
    return `${file.name}-${file.size}-${file.lastModified}-${schemaVersion}`;
  }

  set<T>(file: File, data: T, schemaVersion = 'v1'): void {
    const key = this.getKey(file, schemaVersion);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: schemaVersion
    });
  }

  get<T>(file: File, schemaVersion = 'v1'): T | null {
    const key = this.getKey(file, schemaVersion);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const jdCache = new MemoryCache(72 * 60 * 60 * 1000); // 72 hours for JD
export const cvCache = new MemoryCache(24 * 60 * 60 * 1000); // 24 hours for CV