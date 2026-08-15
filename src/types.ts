export interface DiscoveryCandidate {
  title: string;
  url: string;
  summary: string;
  source: string;
  imageUrl?: string;
}

export interface PickedDiscovery {
  candidate: DiscoveryCandidate;
  message: string;
}

export interface DiscoverySource {
  name: string;
  discover(now: Date): Promise<DiscoveryCandidate[]>;
}

export interface SurfDelivery {
  send(discovery: PickedDiscovery, image?: Uint8Array): Promise<void>;
}

export type CandidateSelector = (
  candidates: readonly DiscoveryCandidate[]
) => Promise<{ index: number; message: string }>;
