import { CacheService } from "../../domain/ports/CacheService";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache implements CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.removeExpired(), 60_000);

    if (typeof this.cleanupInterval === "object" && "unref" in this.cleanupInterval) {
      (this.cleanupInterval as NodeJS.Timeout).unref();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }


  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}