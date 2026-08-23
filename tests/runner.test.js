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

function fakeIo(answers = []) {
  return {
    answers: [...answers],
    outputs: [],
    infos: [],
    errors: [],
    async ask() {
      const answer = this.answers.shift();
      if (answer === undefined) throw new Error("No fake user answer left");
      return answer;
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

function preflightResult(configured = true) {
  return {
    repoRoot: "/repo",
    gitDir: "/repo/.git",
    branch: "feat/example",
    fixedPoint: "head-0",
    configured,
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

test("run uses one planning thread and a fresh thread for every implementation ticket", async () => {
  const agent = new FakeAgent([
    [
      envelope("stage_complete", "grill done"),
      envelope("stage_complete", "spec done", [artifact("spec", ".scratch/feature/spec.md", "Feature spec")]),
      envelope("stage_complete", "tickets done", [
        artifact("ticket", ".scratch/feature/issues/01-first.md", "First"),
        artifact("ticket", ".scratch/feature/issues/02-second.md", "Second", [".scratch/feature/issues/01-first.md"]),
      ]),
    ],
    [envelope("stage_complete", "first implemented")],
    [envelope("stage_complete", "second implemented")],
  ]);
  const io = fakeIo();
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io,
      preflight: () => preflightResult(true),
      currentHead: headSequence(["head-0", "head-1", "head-1", "head-2", "head-2"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.status, "complete");
  assert.equal(state.stage, "complete");
  assert.equal(state.specReference, ".scratch/feature/spec.md");
  assert.deepEqual(
    state.completedTickets.map((ticket) => [ticket.reference, ticket.threadId, ticket.commit]),
    [
      [".scratch/feature/issues/01-first.md", "thread-2", "head-1"],
      [".scratch/feature/issues/02-second.md", "thread-3", "head-2"],
    ],
  );
  assert.equal(agent.threads.length, 3);
  assert.equal(agent.threads[0].prompts.length, 3);
  assert.match(agent.threads[0].prompts[0], /\$grill-with-docs Build feature/);
  assert.match(agent.threads[0].prompts[1], /\$to-spec/);
  assert.match(agent.threads[0].prompts[2], /\$to-tickets \.scratch\/feature\/spec\.md/);
  assert.match(agent.threads[1].prompts[0], /\$implement \.scratch\/feature\/issues\/01-first\.md/);
  assert.match(agent.threads[2].prompts[0], /\$implement \.scratch\/feature\/issues\/02-second\.md/);
  assert.notEqual(state.completedTickets[0].threadId, state.completedTickets[1].threadId);
});

test("human answers resume the same active planning thread before advancing", async () => {
  const agent = new FakeAgent([
    [
      envelope("waiting_for_user", "Q1: choose A or B"),
      envelope("stage_complete", "grill done"),
      envelope("stage_complete", "spec done", [artifact("spec", "spec-1", "Spec")]),
      envelope("stage_complete", "tickets done", [artifact("ticket", "ticket-1", "Ticket")]),
    ],
    [envelope("stage_complete", "implemented")],
  ]);
  const io = fakeIo(["A"]);
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io,
      preflight: () => preflightResult(true),
      currentHead: headSequence(["head-0", "head-1", "head-1"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.status, "complete");
  assert.equal(agent.threads[0].prompts.length, 4);
  assert.match(agent.threads[0].prompts[1], /human's answer/);
  assert.match(agent.threads[0].prompts[1], /\nA\n/);
  assert.equal(io.outputs[0], "Q1: choose A or B");
});

test("missing repo setup runs in its own thread before the planning context", async () => {
  const agent = new FakeAgent([
    [envelope("stage_complete", "setup done")],
    [
      envelope("stage_complete", "grill done"),
      envelope("stage_complete", "spec done", [artifact("spec", "spec-1", "Spec")]),
      envelope("stage_complete", "tickets done", [artifact("ticket", "ticket-1", "Ticket")]),
    ],
    [envelope("stage_complete", "implemented")],
  ]);
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io: fakeIo(),
      preflight: () => preflightResult(false),
      currentHead: headSequence(["head-0", "head-1", "head-1"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.status, "complete");
  assert.equal(agent.threads.length, 3);
  assert.match(agent.threads[0].prompts[0], /\$setup-matt-pocock-skills/);
  assert.match(agent.threads[1].prompts[0], /\$grill-with-docs/);
  assert.notEqual(state.setupThreadId, state.planningThreadId);
});

test("implementation must create the commit required by the upstream implement skill", async () => {
  const agent = new FakeAgent([
    [
      envelope("stage_complete", "grill done"),
      envelope("stage_complete", "spec done", [artifact("spec", "spec-1", "Spec")]),
      envelope("stage_complete", "tickets done", [artifact("ticket", "ticket-1", "Ticket")]),
    ],
    [envelope("stage_complete", "implemented but no commit")],
  ]);
  const store = new MemoryStateStore();

  await assert.rejects(
    runShipFlow(
      { goal: "Build feature", cwd: "/repo" },
      {
        agent,
        io: fakeIo(),
        preflight: () => preflightResult(true),
        currentHead: headSequence(["head-0", "head-0"]),
        stateStoreFactory: () => store,
      },
    ),
    /without creating the upstream-required commit/,
  );
});

test("a blocked stage persists the exact active stage and thread", async () => {
  const agent = new FakeAgent([
    [envelope("blocked", "parallel sub-agents are unavailable")],
  ]);
  const store = new MemoryStateStore();

  let caught;
  try {
    await runShipFlow(
      { goal: "Build feature", cwd: "/repo" },
      {
        agent,
        io: fakeIo(),
        preflight: () => preflightResult(true),
        currentHead: headSequence([]),
        stateStoreFactory: () => store,
      },
    );
  } catch (error) {
    caught = error;
  }

  assert.ok(caught);
  assert.equal(caught.shipflowState.status, "blocked");
  assert.equal(caught.shipflowState.stage, "grill");
  assert.equal(caught.shipflowState.activeThreadId, "thread-1");
  assert.match(caught.shipflowState.failure, /parallel sub-agents are unavailable/);
});

test("resume from a spec human checkpoint continues the same planning thread without replaying to-spec", async () => {
  const planning = new FakeThread("planning-thread", [
    envelope("stage_complete", "spec approved", [artifact("spec", "spec-1", "Spec")]),
    envelope("stage_complete", "tickets published", [artifact("ticket", "ticket-1", "Ticket")]),
  ]);
  const agent = new FakeAgent([
    [envelope("stage_complete", "implemented")],
  ]);
  agent.threads.push(planning);
  const io = fakeIo(["yes, use that seam"]);
  const store = new MemoryStateStore();
  const state = {
    schemaVersion: 1,
    runId: "resume-spec",
    goal: "Build feature",
    agent: "codex",
    repoRoot: "/repo",
    gitDir: "/repo/.git",
    branch: "feat/example",
    fixedPoint: "head-0",
    finalHead: "head-0",
    stage: "spec",
    status: "waiting_for_user",
    setupThreadId: null,
    planningThreadId: "planning-thread",
    activeThreadId: "planning-thread",
    implementationThreadId: null,
    specReference: null,
    tickets: [],
    nextTicketIndex: 0,
    currentTicket: null,
    ticketStartHead: null,
    completedTickets: [],
    lastCheckpoint: "spec-waiting-for-user",
    failure: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await store.save(state);

  const result = await resumeShipFlow(
    { runId: state.runId, cwd: "/repo" },
    {
      agent,
      io,
      preflight: () => preflightResult(true),
      currentHead: headSequence(["head-0", "head-1", "head-1"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(result.status, "complete");
  assert.equal(result.specReference, "spec-1");
  assert.equal(agent.resumed[0], "planning-thread");
  assert.match(planning.prompts[0], /Continue the already-active ShipFlow spec stage/);
  assert.doesNotMatch(planning.prompts[0], /\$to-spec/);
  assert.match(planning.prompts[1], /\$to-tickets spec-1/);
});

test("resume from an implementation checkpoint finishes that ticket then starts the next in a fresh thread", async () => {
  const implementation = new FakeThread("impl-thread-1", [
    envelope("stage_complete", "first ticket complete"),
  ]);
  const agent = new FakeAgent([
    [envelope("stage_complete", "second ticket complete")],
  ]);
  agent.threads.push(implementation);
  const store = new MemoryStateStore();
  const tickets = [artifact("ticket", "ticket-1", "First"), artifact("ticket", "ticket-2", "Second")];
  const state = {
    schemaVersion: 1,
    runId: "resume-impl",
    goal: "Build feature",
    agent: "codex",
    repoRoot: "/repo",
    gitDir: "/repo/.git",
    branch: "feat/example",
    fixedPoint: "head-0",
    finalHead: "head-0",
    stage: "implement",
    status: "waiting_for_user",
    setupThreadId: null,
    planningThreadId: "planning-thread",
    activeThreadId: "impl-thread-1",
    implementationThreadId: "impl-thread-1",
    specReference: "spec-1",
    tickets,
    nextTicketIndex: 0,
    currentTicket: tickets[0],
    ticketStartHead: "head-0",
    completedTickets: [],
    lastCheckpoint: "implement-waiting-for-user",
    failure: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await store.save(state);

  const result = await resumeShipFlow(
    { runId: state.runId, cwd: "/repo" },
    {
      agent,
      io: fakeIo(["approved"]),
      preflight: () => preflightResult(true),
      currentHead: headSequence(["head-1", "head-1", "head-2", "head-2"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(result.status, "complete");
  assert.equal(result.completedTickets.length, 2);
  assert.deepEqual(
    result.completedTickets.map((item) => [item.reference, item.threadId, item.commit]),
    [
      ["ticket-1", "impl-thread-1", "head-1"],
      ["ticket-2", "thread-2", "head-2"],
    ],
  );
  assert.match(agent.threads.at(-1).prompts[0], /\$implement ticket-2/);
});

test("persists the Codex thread id after the first turn starts", async () => {
  class LazyThread extends FakeThread {
    constructor(realId, responses) {
      super(realId, responses);
      this.realId = realId;
      this.started = false;
    }
    get id() {
      return this.started ? this.realId : null;
    }
    set id(_value) {}
    async turn(prompt) {
      this.started = true;
      return super.turn(prompt);
    }
  }

  class LazyAgent extends FakeAgent {
    startThread() {
      const responses = this.threadResponses.shift();
      const thread = new LazyThread(`lazy-${this.threads.length + 1}`, responses);
      this.threads.push(thread);
      return thread;
    }
  }

  const agent = new LazyAgent([
    [
      envelope("stage_complete", "grill done"),
      envelope("stage_complete", "spec done", [artifact("spec", "spec-1", "Spec")]),
      envelope("stage_complete", "tickets done", [artifact("ticket", "ticket-1", "Ticket")]),
    ],
    [envelope("stage_complete", "implemented")],
  ]);
  const store = new MemoryStateStore();

  const state = await runShipFlow(
    { goal: "Build feature", cwd: "/repo" },
    {
      agent,
      io: fakeIo(),
      preflight: () => preflightResult(true),
      currentHead: headSequence(["head-0", "head-1", "head-1"]),
      stateStoreFactory: () => store,
    },
  );

  assert.equal(state.planningThreadId, "lazy-1");
  assert.equal(state.completedTickets[0].threadId, "lazy-2");
});
