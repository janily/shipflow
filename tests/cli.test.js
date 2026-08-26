import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { parseArgs } from "../src/cli.js";

test("run inherits Codex defaults unless the user explicitly overrides them", () => {
  const parsed = parseArgs(["run", "Build feature"]);

  assert.equal(parsed.model, undefined);
  assert.equal(parsed.reasoning, undefined);
  assert.equal(parsed.sandbox, undefined);
  assert.equal(parsed.approval, undefined);
  assert.equal(parsed.network, undefined);
  assert.equal(parsed.webSearch, undefined);
  assert.deepEqual(parsed.additionalDirectories, []);
  assert.deepEqual(parsed.codexConfigOverrides, []);
  assert.equal(parsed.safe, false);
  assert.equal(parsed.handoff, false);
  assert.equal(parsed.answer, undefined);
});

test("run parses explicit Codex overrides without changing ShipFlow safety flags", () => {
  const parsed = parseArgs([
    "run",
    "Build feature",
    "--model",
    "gpt-5.6-codex",
    "--reasoning",
    "high",
    "--sandbox",
    "workspace-write",
    "--approval",
    "never",
    "--network",
    "--web-search",
    "live",
    "--add-dir",
    "../shared",
    "--codex-config",
    "features.example=true",
    "--allow-dirty",
  ]);

  assert.equal(parsed.model, "gpt-5.6-codex");
  assert.equal(parsed.reasoning, "high");
  assert.equal(parsed.sandbox, "workspace-write");
  assert.equal(parsed.approval, "never");
  assert.equal(parsed.network, true);
  assert.equal(parsed.webSearch, "live");
  assert.deepEqual(parsed.additionalDirectories, [path.resolve("../shared")]);
  assert.deepEqual(parsed.codexConfigOverrides, ["features.example=true"]);
  assert.equal(parsed.allowDirty, true);
});

test("safe preset restores the conservative MVP Codex overrides", () => {
  const parsed = parseArgs(["run", "Build feature", "--safe"]);

  assert.equal(parsed.sandbox, "workspace-write");
  assert.equal(parsed.approval, "never");
  assert.equal(parsed.network, false);
});

test("explicit options win over the safe preset", () => {
  const parsed = parseArgs([
    "run",
    "Build feature",
    "--safe",
    "--sandbox",
    "danger-full-access",
    "--network",
  ]);

  assert.equal(parsed.sandbox, "danger-full-access");
  assert.equal(parsed.approval, "never");
  assert.equal(parsed.network, true);
});

test("handoff mode and resume answers are explicit CLI behavior", () => {
  const run = parseArgs(["run", "Build feature", "--handoff"]);
  assert.equal(run.handoff, true);
  assert.equal(run.answer, undefined);

  const resume = parseArgs(["resume", "run-123", "--handoff", "--answer", "Use option A"]);
  assert.equal(resume.handoff, true);
  assert.equal(resume.answer, "Use option A");

  assert.throws(
    () => parseArgs(["run", "Build feature", "--answer", "A"]),
    /--answer is only valid with shipflow resume/,
  );
});

test("rejects invalid enumerated Codex options", () => {
  assert.throws(() => parseArgs(["run", "Build feature", "--sandbox", "anything"]), /Invalid --sandbox/);
  assert.throws(() => parseArgs(["run", "Build feature", "--reasoning", "extreme"]), /Invalid --reasoning/);
  assert.throws(() => parseArgs(["run", "Build feature", "--web-search", "yes"]), /Invalid --web-search/);
});
