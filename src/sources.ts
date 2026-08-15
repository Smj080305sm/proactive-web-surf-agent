import type { DiscoveryCandidate, DiscoverySource } from "./types.js";

const USER_AGENT = "proactive-web-surf-agent/0.1";

export class GitHubDiscoverySource implements DiscoverySource {
  readonly name = "GitHub";
  constructor(private readonly topics = ["ai-agent", "creative-coding", "virtual-pet", "personal-assistant"]) {}

  async discover(now: Date): Promise<DiscoveryCandidate[]> {
    const since = new Date(now.getTime() - 120 * 86_400_000).toISOString().slice(0, 10);
    const topic = this.topics[Math.floor(Math.random() * this.topics.length)];
    const query = encodeURIComponent(`topic:${topic} created:>=${since} stars:>20`);
    const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=8`, {
      headers: { accept: "application/vnd.github+json", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`GitHub discovery failed: HTTP ${response.status}`);
    const data = await response.json() as { items?: Array<{ full_name?: string; html_url?: string; description?: string | null; stargazers_count?: number; language?: string | null; owner?: { avatar_url?: string } }> };
    return (data.items ?? []).flatMap((item) => item.full_name && item.html_url ? [{
      title: item.full_name,
      url: item.html_url,
      summary: `${item.description ?? "No description"} · ${item.stargazers_count ?? 0} stars${item.language ? ` · ${item.language}` : ""}`,
      source: this.name,
      imageUrl: item.owner?.avatar_url
    }] : []);
  }
}

export class HackerNewsDiscoverySource implements DiscoverySource {
  readonly name = "Hacker News";
  async discover(): Promise<DiscoveryCandidate[]> {
    const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Hacker News discovery failed: HTTP ${response.status}`);
    const ids = (await response.json() as number[]).slice(0, 16);
    const items = await Promise.all(ids.map(async (id) => {
      const result = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(10_000) });
      return result.ok ? await result.json() as { title?: string; url?: string; score?: number; descendants?: number } : undefined;
    }));
    return items.flatMap((item) => item?.title && item.url ? [{
      title: item.title, url: item.url,
      summary: `${item.score ?? 0} points · ${item.descendants ?? 0} comments`, source: this.name
    }] : []).slice(0, 6);
  }
}

export async function collectCandidates(sources: readonly DiscoverySource[], now = new Date()): Promise<DiscoveryCandidate[]> {
  const settled = await Promise.allSettled(sources.map((source) => source.discover(now)));
  const unique = new Map<string, DiscoveryCandidate>();
  for (const result of settled) if (result.status === "fulfilled") {
    for (const candidate of result.value) if (isSafePublicUrl(candidate.url) && !unique.has(candidate.url)) unique.set(candidate.url, candidate);
  }
  return [...unique.values()];
}

export function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch { return false; }
}
