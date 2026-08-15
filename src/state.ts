import { chmod, readFile, writeFile } from "node:fs/promises";

interface StateData { nextRunAt: string; recentUrls: string[]; lastAttemptAt?: string }
const DAY = 86_400_000;

export class SurfState {
  private constructor(private readonly path: string, private data: StateData) {}

  static async load(path: string, now = new Date()): Promise<SurfState> {
    try {
      const value = JSON.parse(await readFile(path, "utf8")) as StateData;
      if (!Number.isFinite(Date.parse(value.nextRunAt))) throw new Error("Invalid state");
      return new SurfState(path, { ...value, recentUrls: value.recentUrls?.slice(-100) ?? [] });
    } catch {
      const state = new SurfState(path, { nextRunAt: new Date(now.getTime() + 5 * 60_000).toISOString(), recentUrls: [] });
      await state.persist();
      return state;
    }
  }

  isDue(now = new Date()): boolean { return now.getTime() >= Date.parse(this.data.nextRunAt); }
  unseen<T extends { url: string }>(items: readonly T[]): T[] { const seen = new Set(this.data.recentUrls); return items.filter((item) => !seen.has(item.url)); }

  async success(url: string, now = new Date(), random = Math.random): Promise<void> {
    this.data.lastAttemptAt = now.toISOString();
    this.data.nextRunAt = nextLocalDaytime(now, random).toISOString();
    this.data.recentUrls = [...this.data.recentUrls, url].slice(-100);
    await this.persist();
  }

  async defer(now = new Date()): Promise<void> {
    this.data.lastAttemptAt = now.toISOString();
    this.data.nextRunAt = new Date(now.getTime() + 60 * 60_000).toISOString();
    await this.persist();
  }

  private async persist(): Promise<void> {
    await writeFile(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    await chmod(this.path, 0o600);
  }
}

export function nextLocalDaytime(now: Date, random = Math.random): Date {
  const result = new Date(now.getTime() + DAY);
  result.setHours(11 + Math.floor(random() * 10), Math.floor(random() * 60), 0, 0);
  return result;
}
