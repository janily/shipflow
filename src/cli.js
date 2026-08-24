import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { CodexAgent } from "./codex-agent.js";
import { runShipFlow, resumeShipFlow } from "./runner.js";

const REASONING_LEVELS = new Set(["minimal", "low", "medium", "high", "xhigh", "max", "ultra"]);
const SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);
const WEB_SEARCH_MODES = new Set(["disabled", "cached", "live"]);

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
      reasoning: parsed.reasoning,
      sandbox: parsed.sandbox,
      approval: parsed.approval,
      network: parsed.network,
      webSearch: parsed.webSearch,
      additionalDirectories: parsed.additionalDirectories,
      codexConfigOverrides: parsed.codexConfigOverrides,
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
    reasoning: undefined,
    sandbox: undefined,
    approval: undefined,
    network: undefined,
    webSearch: undefined,
    additionalDirectories: [],
    codexConfigOverrides: [],
    safe: false,
    allowDirty: false,
    allowMain: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];

    if (
      arg === "--agent" ||
      arg === "--cwd" ||
      arg === "--model" ||
      arg === "--reasoning" ||
      arg === "--sandbox" ||
      arg === "--approval" ||
      arg === "--web-search" ||
      arg === "--add-dir" ||
      arg === "--codex-config"
    ) {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);

      if (arg === "--agent") flags.agent = value;
      if (arg === "--cwd") flags.cwd = path.resolve(value);
      if (arg === "--model") flags.model = value;
      if (arg === "--reasoning") flags.reasoning = requireEnum(arg, value, REASONING_LEVELS);
      if (arg === "--sandbox") flags.sandbox = requireEnum(arg, value, SANDBOX_MODES);
      if (arg === "--approval") flags.approval = requireEnum(arg, value, APPROVAL_POLICIES);
      if (arg === "--web-search") flags.webSearch = requireEnum(arg, value, WEB_SEARCH_MODES);
      if (arg === "--add-dir") flags.additionalDirectories.push(path.resolve(value));
      if (arg === "--codex-config") {
        if (!value.includes("=")) {
          throw new Error("--codex-config requires a raw Codex key=value override");
        }
        flags.codexConfigOverrides.push(value);
      }
      continue;
    }

    if (arg === "--network") {
      flags.network = true;
      continue;
    }
    if (arg === "--no-network") {
      flags.network = false;
      continue;
    }
    if (arg === "--safe") {
      flags.safe = true;
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

  if (flags.safe) {
    flags.sandbox ??= "workspace-write";
    flags.approval ??= "never";
    flags.network ??= false;
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

function requireEnum(flag, value, allowed) {
  if (!allowed.has(value)) {
    throw new Error(`Invalid ${flag} value '${value}'. Expected one of: ${[...allowed].join(", ")}`);
  }
  return value;
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
  shipflow run "<development goal>" [options]
  shipflow resume <run-id> [options]

ShipFlow safety:
  --allow-main                 allow running on main/master
  --allow-dirty                allow unrelated dirty working-tree changes

Codex behavior:
  By default ShipFlow inherits the user's Codex configuration and environment.
  ShipFlow only controls thread/session lifecycle, working directory, stage prompts,
  and the structured control output required for orchestration.

Optional Codex overrides:
  --model <model>
  --reasoning <minimal|low|medium|high|xhigh|max|ultra>
  --sandbox <read-only|workspace-write|danger-full-access>
  --approval <never|on-request|on-failure|untrusted>
  --network | --no-network
  --web-search <disabled|cached|live>
  --add-dir <path>             repeatable
  --codex-config <key=value>   raw Codex config override; repeatable
  --safe                       workspace-write + approval never + network off

Other:
  --agent codex
  --cwd <path>

The runner uses one planning thread and a fresh Codex thread per implementation ticket.`;
}
