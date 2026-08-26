# Codex autonomous execution

This document defines how the `shipflow` skill creates real context boundaries in Codex without an external ShipFlow Runner.

## Capability order

Use the first available path that preserves isolated contexts:

1. **Codex native multi-agent tools** — preferred.
2. **Codex native CLI sessions** using `codex exec` plus `codex exec resume` — fallback.
3. If neither path is available, fail closed. Do not simulate a fresh context inside the current conversation.

The orchestration parent stays thin. Matt's installed skills remain the first/top-level task inside each stage context.

## Native multi-agent path

When Codex exposes agent-spawn/manage tools:

### Planning

Create one fresh planning agent/session with only the repository and goal needed for planning. Its first task is the installed skill invocation:

```text
$grill-with-docs <goal>
```

Keep this same planning agent for:

```text
$to-spec
$to-tickets <spec-reference>
```

If the planning agent returns a human question, present it in the parent conversation and send the user's answer back to that same planning agent. Do not start a replacement planning agent merely because a human checkpoint occurred.

Once tickets exist, stop using/close the planning agent. The implementation agents receive durable references, not its transcript.

### Implementation

For every dependency-ready ticket, spawn a new fresh agent/session. Its first task is:

```text
$implement <ticket-reference>
```

Provide the originating spec reference when useful. Do not preload the planning transcript.

Wait for the upstream implementation skill to finish and verify the repository evidence it requires before advancing. Start the next ticket in another fresh agent/session.

## Codex CLI session fallback

Use this only when native multi-agent tools are unavailable but the `codex` CLI is available.

Codex currently provides native non-interactive session primitives:

- `codex exec` starts a new persisted session.
- `codex exec resume <session-id> <prompt>` continues that session.
- `codex exec --json` emits JSONL events; the first `thread.started` event contains `thread_id` for later resume.
- `codex exec` loads the user's normal Codex configuration unless explicitly told not to.

Do not use `--ephemeral` for a planning session that may require resume. Do not use `--ignore-user-config`; ShipFlow should inherit the user's normal Codex model, MCP, sandbox, web, and other configuration unless the user explicitly asks otherwise.

### Planning session

Start one new `codex exec --json` session whose prompt is the top-level installed skill invocation:

```text
$grill-with-docs <goal>
```

Pass the prompt as one safely quoted process argument. Never splice raw user text into an unescaped shell command.

Capture the `thread_id` from the `thread.started` JSONL event. Use that same session for human answers and for the next planning stages:

```text
codex exec resume <thread-id> <human-answer>
codex exec resume <thread-id> $to-spec
codex exec resume <thread-id> $to-tickets <spec-reference>
```

The exact shell quoting is platform-specific; use the environment's safe argument mechanism rather than constructing a shell string when possible.

### Human checkpoints

A child session may finish a turn because the upstream skill needs a human decision. The parent ShipFlow conversation should:

1. surface the child's full user-facing question,
2. wait for the user's answer,
3. resume that exact Codex session with the answer,
4. continue the active upstream stage,
5. automatically send the next top-level planning skill only after the active stage has actually completed.

Do not treat a process exit as proof that an upstream stage completed. Inspect the child's final message and the durable repository artifact required by that stage.

### Implementation sessions

After ticket publication, do not resume the planning session for implementation.

For every ticket, start a brand-new `codex exec` session with:

```text
$implement <ticket-reference>
```

Each ticket therefore gets a real fresh Codex context. Verify the commit/test/review evidence expected by the installed upstream `implement` skill before moving on.

## Stage evidence

Use upstream durable evidence instead of ShipFlow-owned copies:

- setup: repository workflow conventions/configuration exist,
- grill: the upstream skill reports completion and its required documentation/decisions are resolved,
- spec: exactly one durable spec reference exists,
- tickets: durable ticket references and dependencies exist in the configured tracker,
- implement: the ticket's upstream completion conditions, verification, review, and commit evidence exist.

If the evidence is ambiguous, keep the current stage active instead of guessing that it completed.

## Safety and ownership

- Do not copy Matt skill bodies into ShipFlow prompts.
- Do not expose hidden reasoning from child agents; relay only their user-facing output and durable artifacts.
- Do not auto-answer upstream human decisions.
- Do not reuse a planning context as an implementation context.
- Do not introduce a Node/Python/Bash ShipFlow runner process as a required product dependency.

The desired experience remains one entry point:

```text
/shipflow <goal>
```

Everything after that is automatic except genuine human decisions surfaced by the upstream workflow.
