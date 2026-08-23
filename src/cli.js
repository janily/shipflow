import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { CodexAgent } from "./codex-agent.js";
import { runShipFlow, resumeShipFlow } from "./runner.js";

export async function main(argv = process.argv.slice(2), overrides = {}) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    const out = overrides.stdout || stdout;
    out.write(`[shipflow:error] ${error instanceof Error ? error.message : String(error)}\n\n${helpText()}\n`);
    return 1;
  }
  if (parsed.command === "help") {
    (overrides.stdout || stdout).write(`${helpText()}\n`);
    return 0;
  }

  const rl = createInterface({ input: overrides.stdin || stdin, output: overrides.stdout || stdout });
  const io = overrides.io || createIo(rl, overrides.stdout || stdout);
  const agent =
    overrides.agent ||
    new CodexAgent({
      model: parsed.model,
      network: parsed.network,
      onEvent: (event) => printProgress(event, overrides.stdout || stdout),
    });

  try {
    if (parsed.agent !== "codex") {
      throw new Error(`Codex MVP only supports --agent codex; received '${parsed.agent}'`);
    }

    if (parsed.command === "run") {
      const state = await runShipFlow(
        {
          goal: parsed.goal,
          cwd: parsed.cwd,
          allowDirty: parsed.allowDirty,
          allowMain: parsed.allowMain,
        },
        { ...overrides, agent, io },
      );
      io.info(`State: ${path.join(state.gitDir, "shipflow", "runs", `${state.runId}.json`)}`);
      return 0;
    }

    if (parsed.command === "resume") {
      await resumeShipFlow(
        {
          runId: parsed.runId,
          cwd: parsed.cwd,
          allowDirty: parsed.allowDirty,
          allowMain: parsed.allowMain,
        },
        { ...overrides, agent, io },
      );
      return 0;
    }

    throw new Error(`Unknown command: ${parsed.command}`);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    rl.close();
  }
}

export function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    return { command: "help" };
  }

  const command = argv[0];
  const values = [];
  const flags = {
    agent: "codex",
    cwd: process.cwd(),
    model: undefined,
    network: false,
    allowDirty: false,
    allowMain: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--agent" || arg === "--cwd" || arg === "--model") {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      if (arg === "--agent") flags.agent = value;
      if (arg === "--cwd") flags.cwd = path.resolve(value);
      if (arg === "--model") flags.model = value;
      continue;
    }
    if (arg === "--network") {
      flags.network = true;
      continue;
    }
    if (arg === "--allow-dirty") {
      flags.allowDirty = true;
      continue;
    }
    if (arg === "--allow-main") {
      flags.allowMain = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    values.push(arg);
  }

  if (command === "run") {
    if (values.length !== 1 || !values[0].trim()) {
      throw new Error('Usage: shipflow run "<development goal>" [options]');
    }
    return { command, goal: values[0], ...flags };
  }

  if (command === "resume") {
    if (values.length !== 1 || !values[0].trim()) {
      throw new Error("Usage: shipflow resume <run-id> [options]");
    }
    return { command, runId: values[0], ...flags };
  }

  throw new Error(`Unknown command: ${command}`);
}

function createIo(rl, out) {
  return {
    ask: (question) => rl.question(question),
    output: (text) => out.write(`${text}\n`),
    info: (text) => out.write(`[shipflow] ${text}\n`),
    error: (text) => out.write(`[shipflow:error] ${text}\n`),
  };
}

function printProgress(event, out) {
  if (event.type !== "item.completed") return;
  const item = event.item;
  if (item?.type === "command_execution") {
    const suffix = item.exit_code === undefined ? "" : ` (exit ${item.exit_code})`;
    out.write(`[codex] ${item.command}${suffix}\n`);
  } else if (item?.type === "file_change") {
    for (const change of item.changes || []) {
      out.write(`[codex] ${change.kind}: ${change.path}\n`);
    }
  }
}

function helpText() {
  return `ShipFlow Codex Runner MVP

Usage:
  shipflow run "<development goal>" [--agent codex] [--cwd <path>] [--model <model>] [--network] [--allow-dirty] [--allow-main]
  shipflow resume <run-id> [--cwd <path>] [--model <model>] [--network] [--allow-main]

Safety defaults:
  - feature branch required (main/master rejected unless --allow-main)
  - unrelated dirty working-tree changes rejected unless --allow-dirty
  - Codex runs with workspace-write sandbox and approval policy never
  - network is disabled unless --network is explicitly passed

The runner uses fresh Codex threads per implementation ticket.`;
}
