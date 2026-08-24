import { Codex } from "@openai/codex-sdk";
import { CONTROL_SCHEMA, parseControlEnvelope } from "./control.js";

export class CodexAgent {
  constructor({
    codex,
    model,
    reasoning,
    sandbox,
    approval,
    network,
    webSearch,
    additionalDirectories = [],
    codexConfigOverrides = [],
    onEvent = () => {},
  } = {}) {
    this.codex =
      codex ||
      new Codex(
        codexConfigOverrides.length > 0
          ? { configOverrides: [...codexConfigOverrides] }
          : {},
      );
    this.threadOverrides = compactThreadOptions({
      model,
      modelReasoningEffort: reasoning,
      sandboxMode: sandbox,
      approvalPolicy: approval,
      networkAccessEnabled: network,
      webSearchMode: webSearch,
      additionalDirectories:
        additionalDirectories.length > 0 ? [...additionalDirectories] : undefined,
    });
    this.onEvent = onEvent;
  }

  startThread({ cwd }) {
    const thread = this.codex.startThread(this.#threadOptions(cwd));
    return new CodexThread(thread, this.onEvent);
  }

  resumeThread(threadId, { cwd }) {
    const thread = this.codex.resumeThread(threadId, this.#threadOptions(cwd));
    return new CodexThread(thread, this.onEvent);
  }

  #threadOptions(cwd) {
    return {
      workingDirectory: cwd,
      ...this.threadOverrides,
    };
  }
}

function compactThreadOptions(options) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

class CodexThread {
  constructor(thread, onEvent) {
    this.thread = thread;
    this.onEvent = onEvent;
  }

  get id() {
    return this.thread.id;
  }

  async turn(prompt) {
    const { events } = await this.thread.runStreamed(prompt, { outputSchema: CONTROL_SCHEMA });
    let finalResponse = "";

    for await (const event of events) {
      this.onEvent(event);
      if (event.type === "item.completed" && event.item?.type === "agent_message") {
        finalResponse = event.item.text;
      }
      if (event.type === "turn.failed") {
        throw new Error(event.error?.message || "Codex turn failed");
      }
    }

    if (!finalResponse) {
      throw new Error("Codex turn completed without an agent control response");
    }

    return parseControlEnvelope(finalResponse);
  }
}
