import test from "node:test";
import assert from "node:assert/strict";
import { main } from "../src/cli.js";

class MemoryStateStore {
  constructor() {
    this.states = new Map();
  }
  async save(state) {
    const saved = structuredClone({ ...state, updatedAt: new Date().toISOString() });
    this.states.set(saved.runId, saved);
    return structuredClone(saved);
  }
  async load(runId) {
    return structuredClone(this.states.get(runId));
  }
}

class FakeThread {
  constructor() {
    this.id = "planning-thread";
  }
  async turn() {
    return {
      status: "waiting_for_user",
      message: "Choose A or B",
      artifacts: [],
    };
  }
}

class FakeAgent {
  startThread() {
    return new FakeThread();
  }
}

test("handoff CLI emits one JSON object for the skill frontend", async () => {
  let output = "";
  const stdout = { write(chunk) { output += chunk; } };
  const store = new MemoryStateStore();

  const exitCode = await main(
    ["run", "Build feature", "--handoff"],
    {
      stdout,
      agent: new FakeAgent(),
      preflight: () => ({
        repoRoot: "/repo",
        gitDir: "/repo/.git",
        branch: "feat/example",
        fixedPoint: "head-0",
        configured: true,
        skillRoots: ["/repo/.agents/skills"],
        unsafeDirtyEntries: [],
      }),
      currentHead: () => {
        throw new Error("HEAD should not be queried before the human checkpoint");
      },
      stateStoreFactory: () => store,
    },
  );

  assert.equal(exitCode, 0);
  const lines = output.trim().split("\n");
  assert.equal(lines.length, 1);

  const handoff = JSON.parse(lines[0]);
  assert.equal(handoff.status, "waiting_for_user");
  assert.equal(handoff.stage, "grill");
  assert.equal(handoff.runId.length > 0, true);
  assert.equal(handoff.message, "Choose A or B");
  assert.equal(handoff.statePath.endsWith(`${handoff.runId}.json`), true);
});
