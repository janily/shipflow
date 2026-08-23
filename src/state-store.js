import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export class StateStore {
  constructor(gitDir) {
    this.runsDir = path.join(gitDir, "shipflow", "runs");
  }

  pathFor(runId) {
    return path.join(this.runsDir, `${runId}.json`);
  }

  async save(state) {
    await mkdir(this.runsDir, { recursive: true });
    const target = this.pathFor(state.runId);
    const temp = `${target}.tmp`;
    const nextState = { ...state, updatedAt: new Date().toISOString() };
    await writeFile(temp, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    await rename(temp, target);
    return nextState;
  }

  async load(runId) {
    const content = await readFile(this.pathFor(runId), "utf8");
    return JSON.parse(content);
  }
}
