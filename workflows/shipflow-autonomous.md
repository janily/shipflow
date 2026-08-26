# ShipFlow autonomous workflow

## Purpose

Provide one in-agent command, `/shipflow <goal>`, that automatically executes Matt Pocock's installed feature-development workflow while preserving real planning/implementation context boundaries and all upstream human checkpoints.

ShipFlow owns orchestration only. Matt's installed skills own each engineering stage. The host agent/runtime owns coding capabilities and isolated agent/session primitives.

## Trigger

Explicit user invocation:

```text
/shipflow <development goal>
```

Autonomous execution is the default. Guided/manual routing is opt-in only.

## Required inputs and access

- A Git repository working tree.
- The complete ShipFlow multi-skill bundle installed in the active agent environment.
- Repository write access for upstream specs, tickets, code, tests, and commits.
- A runtime capable of creating genuinely isolated child agents/sessions and, when a stage pauses for human input, resuming the same active context.
- Repository workflow configuration from `setup-matt-pocock-skills`, or permission to run that setup and ask its required human questions.

## Ordered actions

1. **Preflight.** Resolve repository state, installed skills, configured tracker/domain conventions, existing specs/tickets, and already-completed work.
2. **Setup when missing.** Execute upstream `setup-matt-pocock-skills`. Preserve every setup decision that requires the user.
3. **Create one isolated planning context.** Its first top-level task is `$grill-with-docs <goal>`.
4. Relay upstream human questions to the parent conversation and return the user's answer to the same planning context until grilling is complete.
5. In the same planning context, execute `$to-spec`; resolve the durable spec reference.
6. In the same planning context, execute `$to-tickets <spec-reference>`; resolve durable ticket references and dependencies from the configured tracker.
7. **End the planning context.** Carry only durable references and repository state across the boundary, never the planning transcript.
8. **Create a fresh implementation context for each dependency-ready ticket.** Its first top-level task is `$implement <ticket-reference>`, with the originating spec reference when useful.
9. Let upstream `implement` own TDD, verification, code review, and commit behavior. Verify its durable repository evidence before marking the ticket complete.
10. Continue with fresh contexts until all required tickets are complete, then report spec/ticket references and final Git state.

## Runtime strategy

### Preferred: native isolated agents

Use the host runtime's own sub-agent/multi-agent primitives when they provide a real isolated context plus a way to continue the same child after a human checkpoint.

For Codex, native multi-agent tools are preferred when exposed by the active runtime.

### Codex fallback: native sessions

If native multi-agent tools are unavailable but the Codex CLI is available, the ShipFlow skill may directly use Codex's own persisted sessions:

- `codex exec --json` to start a fresh session,
- the `thread.started.thread_id` event to identify it,
- `codex exec resume <thread-id> <prompt>` to continue that exact planning session,
- a new `codex exec` session for each implementation ticket.

This is a host-runtime primitive, not a ShipFlow Runner. No separate Node/Python/Bash ShipFlow workflow process is required.

The fallback must preserve the user's normal Codex configuration; do not use `--ignore-user-config`. A planning session that may need resume must not be `--ephemeral`.

## Human checkpoints

When an upstream stage needs a genuine human decision:

1. pause only that active stage,
2. present the upstream question faithfully in the parent conversation,
3. wait for the user's answer,
4. return the answer to the same active child context,
5. continue automatically through the remaining stage and subsequent stages.

The user answers engineering questions only; they should not need to issue another ShipFlow or Matt workflow command.

## Durable state and resume

ShipFlow should prefer the upstream repository artifacts as state:

- repository workflow configuration,
- domain/decision docs created by upstream skills,
- published spec reference,
- tracker ticket references/dependencies,
- commits and verification evidence.

On a new `/shipflow` invocation, inspect these artifacts and skip completed stages.

The orchestration parent may retain transient child agent/session identifiers while the current user conversation is active. Do not duplicate Matt's spec or ticket bodies into a ShipFlow-owned state model merely to drive the sequence.

If an unfinished child session is lost and safe resume is impossible, restart only the unfinished stage from its durable boundary. If no safe durable boundary exists, stop and explain the gap instead of guessing.

## Failure behavior

Stop with a concrete error when:

- a required upstream skill is missing,
- the configured tracker/spec/ticket reference cannot be resolved,
- an upstream skill reports a blocker,
- a child agent/session cannot be started or safely resumed,
- the runtime cannot provide a genuinely isolated implementation context,
- upstream implementation claims completion but required repository evidence is missing.

Never replace a failed Matt stage with ShipFlow-authored engineering instructions.

## Observability

A successful autonomous run should make it possible to identify:

- the goal,
- the upstream spec reference,
- the published ticket references/dependencies,
- that planning and implementation used distinct contexts,
- the fresh implementation context used for each ticket,
- the commits/verification evidence produced by upstream implementation,
- the final Git state.

Do not surface hidden model reasoning.

## Acceptance criteria

- One `/shipflow <goal>` invocation starts and drives the workflow without requiring manual Matt commands.
- Human decisions remain interactive, but answering them automatically continues the same active stage.
- Matt's skill bodies are never copied into ShipFlow orchestration.
- Planning uses one isolated context; implementation never reuses it.
- Every implementation ticket gets a fresh context.
- Main-branch autonomous use has no dependency on an external `shipflow run` Runner CLI.
- Missing runtime capabilities fail closed rather than silently weakening the context-engineering contract.
