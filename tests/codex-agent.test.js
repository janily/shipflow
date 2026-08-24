import test from "node:test";
import assert from "node:assert/strict";
import { CodexAgent } from "../src/codex-agent.js";

class FakeCodex {
  startThread(options) {
    this.startOptions = options;
    return { id: "thread-1" };
  }

  resumeThread(id, options) {
    this.resumeId = id;
    this.resumeOptions = options;
    return { id };
  }
}

test("inherits Codex configuration by default and only sets the working directory", () => {
  const codex = new FakeCodex();
  const agent = new CodexAgent({ codex });

  agent.startThread({ cwd: "/repo" });
  agent.resumeThread("thread-1", { cwd: "/repo" });

  assert.deepEqual(codex.startOptions, { workingDirectory: "/repo" });
  assert.deepEqual(codex.resumeOptions, { workingDirectory: "/repo" });
});

test("passes only explicitly requested Codex thread overrides", () => {
  const codex = new FakeCodex();
  const agent = new CodexAgent({
    codex,
    model: "gpt-5.6-codex",
    reasoning: "high",
    sandbox: "workspace-write",
    approval: "never",
    network: true,
    webSearch: "live",
    additionalDirectories: ["/shared"],
  });

  agent.startThread({ cwd: "/repo" });

  assert.deepEqual(codex.startOptions, {
    workingDirectory: "/repo",
    model: "gpt-5.6-codex",
    modelReasoningEffort: "high",
    sandboxMode: "workspace-write",
    approvalPolicy: "never",
    networkAccessEnabled: true,
    webSearchMode: "live",
    additionalDirectories: ["/shared"],
  });
});
