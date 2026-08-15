import { collectCandidates } from "./sources.js";
import type { CandidateSelector, DiscoverySource, SurfDelivery } from "./types.js";
import { SurfState } from "./state.js";

export interface ProactiveSurfOptions {
  sources: readonly DiscoverySource[];
  selector: CandidateSelector;
  delivery: SurfDelivery;
  state: SurfState;
  fetchImage?: (url: string) => Promise<Uint8Array | undefined>;
  maxCandidates?: number;
}

export class ProactiveSurfEngine {
  constructor(private readonly options: ProactiveSurfOptions) {}

  async runIfDue(now = new Date()): Promise<boolean> {
    if (!this.options.state.isDue(now)) return false;
    try {
      const all = await collectCandidates(this.options.sources, now);
      const unseen = this.options.state.unseen(all);
      const candidates = (unseen.length ? unseen : all).slice(0, this.options.maxCandidates ?? 12);
      if (!candidates.length) throw new Error("No usable public discoveries");
      const picked = await this.options.selector(candidates);
      if (!Number.isInteger(picked.index) || !candidates[picked.index] || !picked.message.trim()) throw new Error("Selector returned an invalid result");
      const candidate = candidates[picked.index];
      const image = candidate.imageUrl && this.options.fetchImage ? await this.options.fetchImage(candidate.imageUrl).catch(() => undefined) : undefined;
      await this.options.delivery.send({ candidate, message: picked.message.trim() }, image);
      await this.options.state.success(candidate.url, now);
      return true;
    } catch (error) {
      await this.options.state.defer(now);
      throw error;
    }
  }
}
