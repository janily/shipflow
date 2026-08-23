import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { preflight, REQUIRED_SKILLS } from "../src/preflight.js";

function makeRepo({ branch = "feat/test", configure = true } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "shipflow-preflight-"));
  git(root, ["init", "-b", branch]);
  git(root, ["config", "user.email", "shipflow@example.test"]);
  git(root, ["config", "user.name", "ShipFlow Test"]);
  writeFileSync(path.join(root, "README.md"), "# Fixture\n");
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "fixture"]);

  for (const skill of REQUIRED_SKILLS) {
    const dir = path.join(root, ".agents", "skills", skill);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${skill}\ndescription: test\n---\n`);
  }

  if (configure) {
    const docs = path.join(root, "docs", "agents");
    mkdirSync(docs, { recursive: true });
    writeFileSync(path.join(docs, "issue-tracker.md"), "# Local Markdown\n");
    git(root, ["add", "docs/agents/issue-tracker.md"]);
    git(root, ["commit", "-m", "configure workflow"]);
  }

  return root;
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

test("accepts a feature branch with the full skills bundle", () => {
  const root = makeRepo();
  const result = preflight({ cwd: root });
  assert.equal(result.branch, "feat/test");
  assert.equal(result.configured, true);
  assert.equal(result.unsafeDirtyEntries.length, 0);
});

test("rejects main by default", () => {
  const root = makeRepo({ branch: "main" });
  assert.throws(() => preflight({ cwd: root }), /Refusing to run on protected branch 'main'/);
});

test("rejects unrelated dirty files but ignores standard project skill installation files", () => {
  const root = makeRepo();
  writeFileSync(path.join(root, "app.txt"), "dirty\n");
  assert.throws(() => preflight({ cwd: root }), /Working tree has unrelated changes/);

  const accepted = preflight({ cwd: root, allowDirty: true });
  assert.equal(accepted.unsafeDirtyEntries.length, 1);
});
