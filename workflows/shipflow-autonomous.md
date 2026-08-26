# ShipFlow autonomous workflow

## Purpose

Provide one in-agent command, `/shipflow <goal>`, that automatically executes Matt Pocock's installed feature-development workflow while preserving real planning/implementation/review context boundaries and all upstream human checkpoints.

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
- Repository write access for upstream specs, tickets, code, tests, reviews, and commits.
- A runtime capable of creating genuinely isolated child agents/sessions and, when a stage pauses for human input, resuming the same active context.
- Repository workflow configuration from `setup-matt-pocock-skills`, or permission to run that setup and ask its required human questions.

## Ordered actions

1. **Preflight.** Resolve repository state, installed skills, configured tracker/domain conventions, existing specs/tickets, and already-completed work.
2. **Setup when missing.** Execute upstream `setup-matt-pocock-skills`. Preserve every setup decision that requires the user.
3. **Pin the feature fixed point.** After setup and before feature planning begins, record the current Git commit. The final whole-feature review always compares against this same original fixed point.
4. **Create one isolated planning context.** Its first top-level task is `$grill-with-docs <goal>`.
5. Relay upstream human questions to the parent conversation and return the user's answer to the same planning context until grilling is complete.
6. In the same planning context, execute `$to-spec`; resolve the durable spec reference.
7. In the same planning context, execute `$to-tickets <spec-reference>`; resolve durable ticket references and dependencies from the configured tracker.
8. **End the planning context.** Carry only durable references and repository state across the boundary, never the planning transcript.
9. **Create a fresh implementation context for each dependency-ready ticket.** Its first top-level task is `$implement <ticket-reference>`, with the originating spec reference when useful.
10. Let upstream `implement` own TDD, verification, its per-ticket `code-review`, and commit behavior. Verify its durable repository evidence before marking the ticket complete.
11. Continue with fresh contexts until all required tickets are complete.
12. **Create a fresh final review context.** This agent/session must not reuse planning or implementation context. Its first top-level task is the installed `$code-review` skill, supplied with the pinned feature fixed point and originating spec reference. The review covers the whole feature/branch.
13. Preserve the upstream review's separate **Standards** and **Spec** reports. Do not collapse or replace its review method.
14. **Repair loop.** If final review finds a concrete spec miss/wrong behavior or a hard documented-standard violation, create a fresh implementation context and invoke `$implement <relevant-ticket-or-spec-reference>` with the review feedback. After the fix produces the required commit/evidence, create another fresh final review context and run `$code-review` again against the same original fixed point.
15. Judgement-call smell findings do not block by themselves unless the upstream review identifies a concrete required change.
16. **Completion.** Only after the final whole-feature review has no blocking findings, report the spec/ticket references, review result, and final Git state.

## Runtime strategy

### Preferred: native isolated agents

Use the host runtime's own sub-agent/multi-agent primitives when they provide a real isolated context plus a way to continue the same child after a human checkpoint.

For Codex, native multi-agent tools are preferred when exposed by the active runtime.

The required context topology is:

```text
planning context
  grill-with-docs
  to-spec
  to-tickets
        ↓ close
implementation context #1
  implement ticket 01
        ↓ close
implementation context #2
  implement ticket 02
        ↓ close
...
        ↓
final review context
  code-review fixed-point + spec
```

A final review agent must be fresh so it can inspect the completed branch independently rather than relying on implementation context.

### Codex fallback: native sessions

If native multi-agent tools are unavailable but the Codex CLI is available, the ShipFlow skill may directly use Codex's own persisted sessions:

- `codex exec --json` to start a fresh session,
- the `thread.started.thread_id` event to identify it,
- `codex exec resume <thread-id> <prompt>` to continue that exact planning session,
- a new `codex exec` session for each implementation ticket,
- another new `codex exec` session for each final-review attempt.

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

## Final review semantics

The final whole-feature review is distinct from the review already performed inside each upstream `implement` run:

```text
per-ticket implement review
  = did this ticket's implementation satisfy its local work?

final feature review
  = does the complete branch satisfy the originating spec and repository standards as a whole?
```

Use Matt's installed `code-review` skill unchanged. Supply the original feature fixed point so its three-dot diff covers the complete feature branch. Supply the originating spec reference so the Spec axis can evaluate the intended behavior.

Do not mark ShipFlow complete merely because every ticket committed successfully. Final review is a mandatory workflow gate.

## Durable state and resume

ShipFlow should prefer the upstream repository artifacts as state:

- repository workflow configuration,
- domain/decision docs created by upstream skills,
- pinned feature fixed point,
- published spec reference,
- tracker ticket references/dependencies,
- commits and verification evidence,
- evidence that a final review was performed against the current completed HEAD.

On a new `/shipflow` invocation, inspect these artifacts and skip completed stages.

If all tickets are complete but the completed HEAD has not passed a final whole-feature review against the pinned fixed point, resume at final review rather than reporting completion.

The orchestration parent may retain transient child agent/session identifiers while the current user conversation is active. Do not duplicate Matt's spec or ticket bodies into a ShipFlow-owned state model merely to drive the sequence.

If an unfinished child session is lost and safe resume is impossible, restart only the unfinished stage from its durable boundary. If no safe durable boundary exists, stop and explain the gap instead of guessing.

## Failure behavior

Stop with a concrete error when:

- a required upstream skill is missing,
- the configured tracker/spec/ticket reference cannot be resolved,
- an upstream skill reports a blocker,
- a child agent/session cannot be started or safely resumed,
- the runtime cannot provide a genuinely isolated implementation or final-review context,
- upstream implementation claims completion but required repository evidence is missing,
- the final `code-review` cannot execute its required Standards/Spec review capabilities.

Never replace a failed Matt stage with ShipFlow-authored engineering instructions.

## Observability

A successful autonomous run should make it possible to identify:

- the goal,
- the original feature fixed point,
- the upstream spec reference,
- the published ticket references/dependencies,
- that planning and implementation used distinct contexts,
- the fresh implementation context used for each ticket,
- the per-ticket commits/verification evidence produced by upstream implementation,
- the final whole-feature review and whether it required repair cycles,
- the final Git state.

Do not surface hidden model reasoning.

## Acceptance criteria

- One `/shipflow <goal>` invocation starts and drives the workflow without requiring manual Matt commands.
- Human decisions remain interactive, but answering them automatically continues the same active stage.
- Matt's skill bodies are never copied into ShipFlow orchestration.
- Planning uses one isolated context; implementation never reuses it.
- Every implementation ticket gets a fresh context.
- Every upstream `implement` keeps its own TDD/review/commit behavior.
- After all tickets complete, a fresh final review context runs upstream `code-review` against the original feature fixed point and originating spec.
- Blocking final-review findings trigger repair through upstream `implement` and a new final-review attempt.
- ShipFlow cannot report completion until the final whole-feature review passes.
- Main-branch autonomous use has no dependency on an external `shipflow run` Runner CLI.
- Missing runtime capabilities fail closed rather than silently weakening the context-engineering contract.
