import { randomUUID } from "node:crypto";
import { preflight as defaultPreflight, currentHead as defaultCurrentHead } from "./preflight.js";
import { StateStore } from "./state-store.js";
import { continuationPrompt, retryPrompt, stageInvocationPrompt } from "./prompts.js";

export async function runShipFlow(options, deps) {
  const runtime = makeRuntime(options, deps);
  const pre = runtime.preflight(options);
  const stateStore = runtime.stateStoreFactory(pre.gitDir);
  let state = initialState(options, pre);
  state = await stateStore.save(state);

  try {
    if (!pre.configured) {
      state = await executeSetup({ state, stateStore, runtime });
    }

    state = await executePlanning({ state, stateStore, runtime });
    state = await executeImplementation({ state, stateStore, runtime });

    state = await stateStore.save({
      ...state,
      stage: "complete",
      status: "complete",
      activeThreadId: null,
      lastCheckpoint: "workflow-complete",
      finalHead: runtime.currentHead(state.repoRoot),
      failure: null,
    });

    runtime.io.info(`ShipFlow run complete: ${state.runId}`);
    return state;
  } catch (error) {
    const baseState = error?.shipflowState || state;
    const failed = await stateStore.save({
      ...baseState,
      status: baseState.status === "blocked" ? "blocked" : "failed",
      failure: error instanceof Error ? error.message : String(error),
    });
    error.shipflowState = failed;
    throw error;
  }
}

export async function resumeShipFlow(options, deps) {
  const runtime = makeRuntime(options, deps);
  const pre = runtime.preflight({ ...options, cwd: options.cwd, allowDirty: true });
  const stateStore = runtime.stateStoreFactory(pre.gitDir);
  let state = await stateStore.load(options.runId);

  if (state.repoRoot !== pre.repoRoot) {
    throw new Error(`Run ${state.runId} belongs to ${state.repoRoot}, not ${pre.repoRoot}`);
  }
  if (state.branch !== pre.branch) {
    throw new Error(`Run ${state.runId} belongs to branch ${state.branch}, not ${pre.branch}`);
  }
  if (state.status === "complete") {
    runtime.io.info(`ShipFlow run ${state.runId} is already complete.`);
    return state;
  }

  try {
    if (state.status === "waiting_for_user" || state.status === "blocked") {
      const resumed = await resumeActiveStage({ state, stateStore, runtime });
      state = await finalizeResumedStage({ state: resumed.state, result: resumed.result, stateStore, runtime });
    } else if (state.status === "running" || state.status === "failed") {
      throw new Error(
        "This MVP only resumes from a persisted human checkpoint or blocker. The run stopped outside a safe checkpoint; inspect the recorded Codex thread before retrying.",
      );
    }

    if (state.stage === "grill") {
      state = await executePlanning({ state, stateStore, runtime });
    } else if (state.stage === "spec" || state.stage === "tickets") {
      state = await continuePlanningFromCheckpoint({ state, stateStore, runtime });
    }

    if (state.stage === "implement") {
      state = await executeImplementation({ state, stateStore, runtime });
    }

    state = await stateStore.save({
      ...state,
      stage: "complete",
      status: "complete",
      activeThreadId: null,
      lastCheckpoint: "workflow-complete",
      finalHead: runtime.currentHead(state.repoRoot),
      failure: null,
    });
    runtime.io.info(`ShipFlow run complete: ${state.runId}`);
    return state;
  } catch (error) {
    const baseState = error?.shipflowState || state;
    const failed = await stateStore.save({
      ...baseState,
      status: baseState.status === "blocked" ? "blocked" : "failed",
      failure: error instanceof Error ? error.message : String(error),
    });
    error.shipflowState = failed;
    throw error;
  }
}

async function executeSetup({ state, stateStore, runtime }) {
  const thread = runtime.agent.startThread({ cwd: state.repoRoot });
  state = await stateStore.save({
    ...state,
    stage: "setup",
    status: "running",
    activeThreadId: thread.id,
    setupThreadId: thread.id,
    lastCheckpoint: "setup-started",
  });

  const result = await runInteractiveStage({
    stage: "setup",
    thread,
    initialPrompt: stageInvocationPrompt("setup", {}),
    state,
    stateStore,
    runtime,
  });

  return stateStore.save({
    ...result.state,
    stage: "grill",
    status: "running",
    activeThreadId: null,
    lastCheckpoint: "setup-complete",
    failure: null,
  });
}

async function executePlanning({ state, stateStore, runtime }) {
  const thread = runtime.agent.startThread({ cwd: state.repoRoot });
  state = await stateStore.save({
    ...state,
    stage: "grill",
    status: "running",
    planningThreadId: thread.id,
    activeThreadId: thread.id,
    lastCheckpoint: "planning-started",
  });

  const grill = await runInteractiveStage({
    stage: "grill",
    thread,
    initialPrompt: stageInvocationPrompt("grill", { goal: state.goal }),
    state,
    stateStore,
    runtime,
  });
  state = await stateStore.save({
    ...grill.state,
    stage: "spec",
    status: "running",
    lastCheckpoint: "grill-complete",
  });

  const spec = await runInteractiveStage({
    stage: "spec",
    thread,
    initialPrompt: stageInvocationPrompt("spec", {}),
    state,
    stateStore,
    runtime,
  });
  const specArtifact = requireSingleArtifact(spec.result.artifacts, "spec", "to-spec");
  state = await stateStore.save({
    ...spec.state,
    stage: "tickets",
    status: "running",
    specReference: specArtifact.reference,
    lastCheckpoint: "spec-complete",
  });

  const tickets = await runInteractiveStage({
    stage: "tickets",
    thread,
    initialPrompt: stageInvocationPrompt("tickets", { specReference: state.specReference }),
    state,
    stateStore,
    runtime,
  });
  const ticketArtifacts = tickets.result.artifacts.filter((artifact) => artifact.kind === "ticket");
  if (ticketArtifacts.length === 0) {
    throw new Error("to-tickets completed without durable ticket references");
  }

  return stateStore.save({
    ...tickets.state,
    stage: "implement",
    status: "running",
    activeThreadId: null,
    tickets: ticketArtifacts,
    nextTicketIndex: state.nextTicketIndex ?? 0,
    lastCheckpoint: "tickets-complete",
  });
}

async function continuePlanningFromCheckpoint({ state, stateStore, runtime }) {
  if (!state.planningThreadId) {
    throw new Error("Cannot resume planning: planningThreadId is missing");
  }
  const thread = runtime.agent.resumeThread(state.planningThreadId, { cwd: state.repoRoot });

  if (state.stage === "grill") {
    state = await stateStore.save({ ...state, stage: "spec", status: "running", lastCheckpoint: "grill-complete" });
  }

  if (state.stage === "spec") {
    const spec = await runInteractiveStage({
      stage: "spec",
      thread,
      initialPrompt: stageInvocationPrompt("spec", {}),
      state,
      stateStore,
      runtime,
    });
    const specArtifact = requireSingleArtifact(spec.result.artifacts, "spec", "to-spec");
    state = await stateStore.save({
      ...spec.state,
      stage: "tickets",
      status: "running",
      specReference: specArtifact.reference,
      lastCheckpoint: "spec-complete",
    });
  }

  if (state.stage === "tickets") {
    const tickets = await runInteractiveStage({
      stage: "tickets",
      thread,
      initialPrompt: stageInvocationPrompt("tickets", { specReference: state.specReference }),
      state,
      stateStore,
      runtime,
    });
    const ticketArtifacts = tickets.result.artifacts.filter((artifact) => artifact.kind === "ticket");
    if (ticketArtifacts.length === 0) {
      throw new Error("to-tickets completed without durable ticket references");
    }
    state = await stateStore.save({
      ...tickets.state,
      stage: "implement",
      status: "running",
      activeThreadId: null,
      tickets: ticketArtifacts,
      nextTicketIndex: state.nextTicketIndex ?? 0,
      lastCheckpoint: "tickets-complete",
    });
  }

  return state;
}

async function executeImplementation({ state, stateStore, runtime }) {
  const tickets = state.tickets || [];
  let index = state.nextTicketIndex || 0;

  while (index < tickets.length) {
    const ticket = tickets[index];
    const beforeHead = runtime.currentHead(state.repoRoot);
    const thread = runtime.agent.startThread({ cwd: state.repoRoot });
    state = await stateStore.save({
      ...state,
      stage: "implement",
      status: "running",
      activeThreadId: thread.id,
      implementationThreadId: thread.id,
      currentTicket: ticket,
      ticketStartHead: beforeHead,
      nextTicketIndex: index,
      lastCheckpoint: `ticket-${index + 1}-started`,
    });

    const implementation = await runInteractiveStage({
      stage: "implement",
      thread,
      initialPrompt: stageInvocationPrompt("implement", {
        ticket,
        specReference: state.specReference,
      }),
      state,
      stateStore,
      runtime,
    });

    const afterHead = runtime.currentHead(state.repoRoot);
    if (afterHead === beforeHead) {
      throw new Error(`implement completed for ${ticket.reference} without creating the upstream-required commit`);
    }

    index += 1;
    state = await stateStore.save({
      ...implementation.state,
      status: "running",
      activeThreadId: null,
      implementationThreadId: null,
      currentTicket: null,
      ticketStartHead: null,
      nextTicketIndex: index,
      completedTickets: [
        ...(state.completedTickets || []),
        { reference: ticket.reference, threadId: thread.id, commit: afterHead },
      ],
      lastCheckpoint: `ticket-${index}-complete`,
      finalHead: afterHead,
    });
  }

  return state;
}

async function resumeActiveStage({ state, stateStore, runtime }) {
  if (!state.activeThreadId) {
    throw new Error(`Run is ${state.status} but has no active Codex thread to resume`);
  }
  const thread = runtime.agent.resumeThread(state.activeThreadId, { cwd: state.repoRoot });
  const answer = await runtime.io.ask(
    state.status === "blocked"
      ? "Describe what changed so ShipFlow can retry the blocked stage (or type :abort): "
      : "Answer the pending upstream question(s) (or type :abort): ",
  );
  if (answer.trim() === ":abort") {
    throw new Error("Run aborted by user");
  }

  const result = await runInteractiveStage({
    stage: state.stage,
    thread,
    initialPrompt:
      state.status === "blocked" ? retryPrompt(state.stage, answer) : continuationPrompt(state.stage, answer),
    state: { ...state, status: "running" },
    stateStore,
    runtime,
  });

  return result;
}

async function finalizeResumedStage({ state, result, stateStore, runtime }) {
  if (state.stage === "setup") {
    return stateStore.save({
      ...state,
      stage: "grill",
      status: "running",
      activeThreadId: null,
      lastCheckpoint: "setup-complete",
      failure: null,
    });
  }

  if (state.stage === "grill") {
    return stateStore.save({
      ...state,
      stage: "spec",
      status: "running",
      activeThreadId: state.planningThreadId,
      lastCheckpoint: "grill-complete",
      failure: null,
    });
  }

  if (state.stage === "spec") {
    const specArtifact = requireSingleArtifact(result.artifacts, "spec", "to-spec");
    return stateStore.save({
      ...state,
      stage: "tickets",
      status: "running",
      activeThreadId: state.planningThreadId,
      specReference: specArtifact.reference,
      lastCheckpoint: "spec-complete",
      failure: null,
    });
  }

  if (state.stage === "tickets") {
    const ticketArtifacts = result.artifacts.filter((artifact) => artifact.kind === "ticket");
    if (ticketArtifacts.length === 0) {
      throw new Error("to-tickets completed without durable ticket references");
    }
    return stateStore.save({
      ...state,
      stage: "implement",
      status: "running",
      activeThreadId: null,
      tickets: ticketArtifacts,
      nextTicketIndex: state.nextTicketIndex ?? 0,
      lastCheckpoint: "tickets-complete",
      failure: null,
    });
  }

  if (state.stage === "implement") {
    if (!state.currentTicket || !state.ticketStartHead) {
      throw new Error("Cannot finalize resumed implementation: current ticket checkpoint is incomplete");
    }
    const afterHead = runtime.currentHead(state.repoRoot);
    if (afterHead === state.ticketStartHead) {
      throw new Error(`implement completed for ${state.currentTicket.reference} without creating the upstream-required commit`);
    }
    const completedTicket = state.currentTicket;
    const completedThreadId = state.activeThreadId;
    const nextTicketIndex = (state.nextTicketIndex || 0) + 1;
    return stateStore.save({
      ...state,
      stage: "implement",
      status: "running",
      activeThreadId: null,
      implementationThreadId: null,
      currentTicket: null,
      ticketStartHead: null,
      nextTicketIndex,
      completedTickets: [
        ...(state.completedTickets || []),
        { reference: completedTicket.reference, threadId: completedThreadId, commit: afterHead },
      ],
      lastCheckpoint: `ticket-${nextTicketIndex}-complete`,
      finalHead: afterHead,
      failure: null,
    });
  }

  throw new Error(`Cannot finalize unknown resumed stage: ${state.stage}`);
}

async function runInteractiveStage({ stage, thread, initialPrompt, state, stateStore, runtime }) {
  let prompt = initialPrompt;
  let currentState = state;

  while (true) {
    currentState = await stateStore.save({
      ...currentState,
      stage,
      status: "running",
      activeThreadId: thread.id || currentState.activeThreadId,
      failure: null,
    });

    const result = await thread.turn(prompt);
    currentState = await stateStore.save({
      ...currentState,
      ...threadIdentityPatch(stage, thread.id),
      activeThreadId: thread.id || currentState.activeThreadId,
    });
    runtime.io.output(result.message);

    if (result.status === "stage_complete") {
      currentState = await stateStore.save({
        ...currentState,
        stage,
        status: "running",
        activeThreadId: thread.id,
        lastCheckpoint: `${stage}-complete`,
      });
      return { state: currentState, result };
    }

    if (result.status === "blocked") {
      currentState = await stateStore.save({
        ...currentState,
        stage,
        status: "blocked",
        activeThreadId: thread.id,
        lastCheckpoint: `${stage}-blocked`,
        failure: result.message,
      });
      const error = new Error(`ShipFlow ${stage} stage is blocked: ${result.message}`);
      error.shipflowState = currentState;
      throw error;
    }

    currentState = await stateStore.save({
      ...currentState,
      stage,
      status: "waiting_for_user",
      activeThreadId: thread.id,
      lastCheckpoint: `${stage}-waiting-for-user`,
    });

    const answer = await runtime.io.ask("Your answer (or :abort): ");
    if (answer.trim() === ":abort") {
      throw new Error("Run aborted by user");
    }
    prompt = continuationPrompt(stage, answer);
  }
}

function threadIdentityPatch(stage, threadId) {
  if (!threadId) return {};
  if (stage === "setup") return { setupThreadId: threadId };
  if (stage === "grill" || stage === "spec" || stage === "tickets") {
    return { planningThreadId: threadId };
  }
  if (stage === "implement") return { implementationThreadId: threadId };
  return {};
}

function requireSingleArtifact(artifacts, kind, stageName) {
  const matches = artifacts.filter((artifact) => artifact.kind === kind);
  if (matches.length !== 1) {
    throw new Error(`${stageName} must return exactly one durable ${kind} reference; received ${matches.length}`);
  }
  return matches[0];
}

function initialState(options, pre) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    runId: createRunId(),
    goal: options.goal,
    agent: "codex",
    repoRoot: pre.repoRoot,
    gitDir: pre.gitDir,
    branch: pre.branch,
    fixedPoint: pre.fixedPoint,
    finalHead: pre.fixedPoint,
    stage: pre.configured ? "grill" : "setup",
    status: "running",
    setupThreadId: null,
    planningThreadId: null,
    activeThreadId: null,
    implementationThreadId: null,
    specReference: null,
    tickets: [],
    nextTicketIndex: 0,
    currentTicket: null,
    ticketStartHead: null,
    completedTickets: [],
    lastCheckpoint: "preflight-complete",
    failure: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createRunId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
}

function makeRuntime(options, deps = {}) {
  if (!deps.agent) throw new Error("ShipFlow runner requires an agent adapter");
  if (!deps.io) throw new Error("ShipFlow runner requires an IO adapter");

  return {
    agent: deps.agent,
    io: deps.io,
    preflight: deps.preflight || defaultPreflight,
    currentHead: deps.currentHead || defaultCurrentHead,
    stateStoreFactory: deps.stateStoreFactory || ((gitDir) => new StateStore(gitDir)),
  };
}
