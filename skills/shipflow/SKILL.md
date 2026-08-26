---
name: shipflow
description: Use when a developer wants ShipFlow to autonomously execute Matt Pocock's feature-development workflow from one goal, preserving human checkpoints and fresh implementation contexts without an external ShipFlow runner.
disable-model-invocation: true
---

# ShipFlow

ShipFlow is an autonomous workflow orchestrator over the installed Matt Pocock engineering skills. The installed Matt skills own the engineering method; ShipFlow owns stage ordering, context boundaries, and handoff between stages.

`/shipflow <goal>` means **run the workflow**, not “tell me the next command”. Do not require the user to manually type `/grill-with-docs`, `/to-spec`, `/to-tickets`, or `/implement` unless they explicitly ask for guided/manual mode.

## Source-of-truth rule

For every stage, execute the installed upstream skill as an explicit top-level skill invocation inside the stage's agent/session. Never recreate, summarize, paraphrase, or emulate Matt's instructions from memory.

Resolution order:

1. Prefer the runtime's native installed-skill invocation.
2. If the stage runs in a child Codex session, invoke the installed `$<skill-name>` command as that session's first/top-level task.
3. If an installed skill cannot be resolved exactly, stop and identify the missing skill. Do not substitute a ShipFlow implementation.

Required upstream skills:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `grilling`
- `domain-modeling`
- `to-spec`
- `to-tickets`
- `implement`
- `tdd`
- `code-review`

## Autonomous route

1. **Preflight.** Confirm the current repository and required installed skills. Inspect the repository workflow conventions produced by `setup-matt-pocock-skills`; do not invent a ShipFlow tracker layout.
2. **Setup when required.** If Matt's repository workflow is not configured, execute `setup-matt-pocock-skills` and surface only the choices that genuinely require the user.
3. **Planning context.** Create one isolated planning agent/session. Its first top-level task is `$grill-with-docs <goal>`.
4. Relay every real human question from the planning context to the user. Send the user's answer back to the same planning agent/session and continue until the upstream skill reaches its completion criterion.
5. In the **same planning context**, execute `$to-spec`. Persist/use the durable spec reference produced by the upstream skill.
6. In the **same planning context**, execute `$to-tickets <spec-reference>`. Resolve the durable ticket references and dependency order from the configured tracker.
7. **Context boundary.** End or stop using the planning context. Carry forward durable artifacts only: goal, spec reference, ticket references/dependencies, repository state. Do not carry the planning transcript into implementation.
8. **Fresh implementation context per ticket.** For each ready ticket, create a new isolated agent/session whose first top-level task is `$implement <ticket-reference>`. Include the originating spec reference when useful, but not the planning transcript.
9. Let upstream `implement` own TDD, verification, `code-review`, and commit behavior. Verify the expected repository evidence before considering a ticket complete.
10. Continue through dependency-ready tickets until the upstream workflow is complete, then report the durable artifacts and final Git state.

## Fresh-context runtime

Use the runtime's native isolated-agent/session capability. For Codex, follow [`CODEX-AUTONOMY.md`](CODEX-AUTONOMY.md): prefer native multi-agent tools when available; otherwise use Codex's own `exec` / `resume` session primitives. There is no separate ShipFlow Runner dependency.

If the runtime cannot create or resume a genuinely isolated agent/session, stop with a concrete capability gap. Do not silently collapse planning and implementation into one context and call it “fresh”.

## Human checkpoints

Human input is part of the automatic workflow, not a return to manual commands.

When an upstream stage asks a product, architecture, testing-seam, setup, ticket-granularity, irreversible, or blocker question:

1. Present the question faithfully.
2. Wait for the user's answer in the current conversation.
3. Continue the same active stage automatically in its existing agent/session.
4. After the stage completes, advance automatically to the next stage.

The user should answer the engineering question only. They should not need to type another ShipFlow or Matt skill command.

## Resume from repository state

On a later `/shipflow` invocation, inspect the configured tracker and durable artifacts before starting work. Skip stages whose upstream artifacts are already complete and valid. Never replay completed implementation tickets merely to reconstruct context.

If interruption happened inside an unfinished stage and its session cannot be resumed safely, restart only that unfinished stage in a fresh isolated context using the durable inputs available at that boundary. Fail closed when safe reconstruction is impossible.

## Guided mode

Only when the user explicitly asks for guided/manual mode, inspect repository state and report the single next Matt command without executing it.

Completion criterion: the full upstream route completes, or ShipFlow is waiting on one genuine human decision/blocker, or a concrete runtime/upstream capability gap prevents safe continuation.
