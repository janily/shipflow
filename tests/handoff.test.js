import test from "node:test";
import assert from "node:assert/strict";
import { runShipFlow, resumeShipFlow } from "../src/runner.js";

function envelope(status, message, artifacts = []) {
  return { status, message, artifacts };
}

function artifact(kind, reference, title, blockedBy = []) {
  return { kind, reference, title, blockedBy };
}

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
  constructor(id, responses) {
    this.id = id;
    this.responses = [...responses];
    this.prompts = [];
  }

  async turn(prompt) {
    this.prompts.push(prompt);
    const response = this.responses.shift();
    if (!response) throw new Error(`No fake response left for ${this.id}`);
    return structuredClone(response);
  }
}

class FakeAgent {
  constructor(threadResponses) {
    this.threadResponses = [...threadResponses];
    this.threads = [];
    this.resumed = [];
  }

  startThread() {
    const responses = this.threadResponses.shift();
    if (!responses) throw new Error("No fake thread response plan left");
    const thread = new FakeThread(`thread-${this.threads.length + 1}`, responses);
    this.threads.push(thread);
    return thread;
  }

  resumeThread(id) {
    this.resumed.push(id);
    const thread = this.threads.find((candidate) => candidate.id === id);
    if (!thread) throw new Error(`Unknown fake thread ${id}`);
    return thread;
  }
}

function silentIo() {
  return {
    outputs: [],
    infos: [],
    errors: [],
    async ask() {
      throw new Error("handoff mode must not read interactive stdin");
    },
    output(text) {
      this.outputs.push(text);
    },
    info(text) {
      this.infos.push(text);
    },
    error(text) {
      this.errors.push(text);
    },
  };
}

function preflightResult() {
  return {
    repoRoot: "/repo",
    gitDir: "/repo/.git",
    branch: "feat/example",
    fixedPoint: "head-0",
    configured: true,
    skillRoots: ["/repo/.agents/skills"],
    unsafeDirtyEntries: [],
  };
}

function headSequence(values) {
  const queue = [...values];
  return () => {
    if (queue.length === 0) throw new Error("No fake HEAD value left");
    return queue.shift();
  };
}

test("handoff run returns a durable human checkpoint instead of reading stdin", async () => {
  const agent = new FakeAgent([
    [envelope("waiting_for_user", "Q1: choose A or B")],
  ]);
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io: silentIo(),
      pauseOnHuman: true,
      preflight: () => preflightResult(),
      currentHead: headSequence([]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.status, "waiting_for_user");
  assert.equal(state.stage, "grill");
  assert.equal(state.activeThreadId, "thread-1");
  assert.equal(state.pendingMessage, "Q1: choose A or B");
  assert.match(state.runId, /^\d{14}-/);
});

test("handoff resume sends the supplied answer to the same thread and keeps running automatically", async () => {
  const agent = new FakeAgent([
    [
      envelope("waiting_for_user", "Q1: choose A or B"),
      envelope("stage_complete", "grill complete"),
      envelope("stage_complete", "spec complete", [artifact("spec", "spec-1", "Spec")]),
      envelope("stage_complete", "tickets complete", [artifact("ticket", "ticket-1", "Ticket")]),
    ],
    [envelope("stage_complete", "implementation complete")],
  ]);
  const store = new MemoryStateStore();
  const deps = {
    agent,
    io: silentIo(),
    pauseOnHuman: true,
    preflight: () => preflightResult(),
    currentHead: headSequence(["head-0", "head-1", "head-1"]),
    stateStoreFactory: () => store,
  };

  const paused = await runShipFlow({ goal: "Build feature", cwd: "/repo" }, deps);
  const result = await resumeShipFlow(
    { runId: paused.runId, cwd: "/repo", answer: "A" },
    deps,
  );

  assert.equal(result.status, "complete");
  assert.equal(agent.resumed[0], "thread-1");
  assert.match(agent.threads[0].prompts[1], /human's answer/);
  assert.match(agent.threads[0].prompts[1], /\nA\n/);
  assert.equal(result.completedTickets.length, 1);
  assert.equal(result.pendingMessage, null);
});

test("handoff run returns a blocked checkpoint with its message and run id", async () => {
  const agent = new FakeAgent([
    [envelope("blocked", "Required capability is unavailable")],
  ]);
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io: silentIo(),
      pauseOnHuman: true,
      preflight: () => preflightResult(),
      currentHead: headSequence([]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.status, "blocked");
  assert.equal(state.stage, "grill");
  assert.equal(state.pendingMessage, "Required capability is unavailable");
  assert.equal(state.failure, "Required capability is unavailable");
  assert.ok(state.runId);
});
