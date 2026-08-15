import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProactiveSurfEngine } from "./engine.js";
import { SurfState, nextLocalDaytime } from "./state.js";

test("runs one due discovery and persists it", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "surf-agent-"));
  const now = new Date("2026-08-16T08:00:00Z");
  const statePath = path.join(dir, "state.json");
  const state = await SurfState.load(statePath, new Date(now.getTime() - 10 * 60_000));
  let delivered = "";
  const engine = new ProactiveSurfEngine({
    state,
    sources: [{ name: "test", async discover() { return [{ title: "A", url: "https://example.com/a", summary: "Interesting", source: "test" }]; } }],
    selector: async () => ({ index: 0, message: "This made me think of you." }),
    delivery: { async send(item) { delivered = item.candidate.url; } }
  });
  assert.equal(await engine.runIfDue(now), true);
  assert.equal(delivered, "https://example.com/a");
  assert.match(await readFile(statePath, "utf8"), /example\.com/);
});

test("schedules the next run during local daytime", () => {
  const result = nextLocalDaytime(new Date("2026-08-16T02:00:00"), () => 0.5);
  assert.equal(result.getHours(), 16);
  assert.equal(result.getMinutes(), 30);
});
