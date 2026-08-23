const STAGE_COMMANDS = {
  setup: () => "$setup-matt-pocock-skills",
  grill: ({ goal }) => `$grill-with-docs ${goal}`,
  spec: () => "$to-spec",
  tickets: ({ specReference }) => `$to-tickets ${specReference}`,
  implement: ({ ticket, specReference }) => {
    const specSuffix = specReference ? `\nOriginating spec: ${specReference}` : "";
    return `$implement ${ticket.reference}${specSuffix}`;
  },
};

export function stageInvocationPrompt(stage, context) {
  const commandFactory = STAGE_COMMANDS[stage];
  if (!commandFactory) {
    throw new Error(`Unknown ShipFlow stage: ${stage}`);
  }

  const command = commandFactory(context);
  const artifactRule = artifactInstruction(stage);

  return [
    "You are receiving a top-level user turn from the external ShipFlow Runner.",
    "Execute the explicitly named installed Codex skill exactly as installed. Do not emulate or paraphrase its workflow.",
    "The command for this stage is:",
    command,
    "",
    "ShipFlow only controls stage boundaries. The installed skill owns the engineering method and every human decision inside the stage.",
    "For the final response, use the required structured output and classify the stage as follows:",
    '- status="waiting_for_user" only when the installed skill needs a human answer or approval before it can continue.',
    '- status="stage_complete" only when the installed skill\'s own completion criterion has been met.',
    '- status="blocked" when the stage cannot continue because a concrete prerequisite or runtime capability is missing.',
    "Put the complete user-facing questions/result in message. Do not hide a required human decision.",
    artifactRule,
    "Do not start the next user-invoked skill. ShipFlow Runner will do that as a new top-level user turn.",
  ].join("\n");
}

export function continuationPrompt(stage, answer) {
  return [
    `Continue the already-active ShipFlow ${stage} stage in this same Codex thread.`,
    "Do not start another user-invoked skill.",
    "Treat the text below as the human's answer to the currently pending upstream question(s):",
    "",
    answer,
    "",
    "Continue following the installed upstream skill exactly.",
    "Return the required ShipFlow structured output with status waiting_for_user, stage_complete, or blocked using the same semantics as before.",
  ].join("\n");
}

export function retryPrompt(stage, note) {
  return [
    `Resume the already-active ShipFlow ${stage} stage after an external blocker or interruption.`,
    "Do not replay a completed stage and do not start another user-invoked skill.",
    note ? `Operator note: ${note}` : "Re-check the current repository state and continue only the active stage.",
    "Return the required ShipFlow structured output using the same status semantics as before.",
  ].join("\n");
}

function artifactInstruction(stage) {
  switch (stage) {
    case "spec":
      return 'When complete, artifacts must contain exactly the published spec as kind="spec" with its durable tracker/file reference. Do not invent a reference.';
    case "tickets":
      return 'When complete, artifacts must contain every published implementation ticket as kind="ticket", in dependency-safe publication order, with durable references and blockedBy references. Do not copy ticket bodies into artifacts.';
    case "implement":
      return 'Artifacts may be empty. If useful, report only durable references produced by the installed skill; never duplicate the ticket/spec contents.';
    default:
      return "Artifacts should be empty unless the installed skill created a durable reference that ShipFlow must persist.";
  }
}
