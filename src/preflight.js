import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const REQUIRED_SKILLS = [
  "setup-matt-pocock-skills",
  "grill-with-docs",
  "grilling",
  "domain-modeling",
  "to-spec",
  "to-tickets",
  "implement",
  "tdd",
  "code-review",
  "shipflow",
];

const MANAGED_DIRTY_PREFIXES = [".agents/skills/", ".codex/skills/"];
const MANAGED_DIRTY_FILES = new Set(["skills-lock.json"]);

export function preflight({ cwd, allowDirty = false, allowMain = false }) {
  const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"]);
  const gitDirRaw = git(repoRoot, ["rev-parse", "--git-dir"]);
  const gitDir = path.resolve(repoRoot, gitDirRaw);
  const branch = git(repoRoot, ["branch", "--show-current"]);
  const fixedPoint = git(repoRoot, ["rev-parse", "HEAD"]);
  const status = git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const unsafeDirtyEntries = parseDirtyEntries(status).filter((entry) => !isManagedInstallPath(entry.path));

  if (!allowMain && (branch === "main" || branch === "master")) {
    throw new Error(`Refusing to run on protected branch '${branch}'. Create a feature branch or pass --allow-main explicitly.`);
  }

  if (!allowDirty && unsafeDirtyEntries.length > 0) {
    const preview = unsafeDirtyEntries.slice(0, 8).map((entry) => entry.raw).join("\n");
    throw new Error(`Working tree has unrelated changes. Commit/stash them or pass --allow-dirty.\n${preview}`);
  }

  const skillRoots = candidateSkillRoots(repoRoot);
  const missingSkills = REQUIRED_SKILLS.filter((skill) => !findValidSkill(skill, skillRoots));
  if (missingSkills.length > 0) {
    throw new Error(`Missing required ShipFlow bundle skills: ${missingSkills.join(", ")}`);
  }

  const configured = existsSync(path.join(repoRoot, "docs", "agents", "issue-tracker.md"));

  return {
    repoRoot,
    gitDir,
    branch,
    fixedPoint,
    configured,
    skillRoots,
    unsafeDirtyEntries,
  };
}

export function currentHead(repoRoot) {
  return git(repoRoot, ["rev-parse", "HEAD"]);
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.().trim();
    throw new Error(stderr || `git ${args.join(" ")} failed in ${cwd}`);
  }
}

function candidateSkillRoots(repoRoot) {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return [
    path.join(repoRoot, ".agents", "skills"),
    path.join(repoRoot, ".codex", "skills"),
    path.join(codexHome, "skills"),
    path.join(os.homedir(), ".agents", "skills"),
  ];
}

function findValidSkill(skill, roots) {
  return roots.some((root) => {
    const skillFile = path.join(root, skill, "SKILL.md");
    if (!existsSync(skillFile)) return false;
    try {
      const content = readFileSync(skillFile, "utf8");
      return new RegExp(`^name:\\s*["']?${escapeRegExp(skill)}["']?\\s*$`, "m").test(content);
    } catch {
      return false;
    }
  });
}

function parseDirtyEntries(status) {
  if (!status) return [];
  return status.split("\n").filter(Boolean).map((raw) => {
    const rawPath = raw.slice(3);
    const pathValue = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;
    return { raw, path: pathValue };
  });
}

function isManagedInstallPath(filePath) {
  if (MANAGED_DIRTY_FILES.has(filePath)) return true;
  return MANAGED_DIRTY_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
