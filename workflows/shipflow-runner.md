# ShipFlow Runner — Codex MVP

## Purpose and owner

ShipFlow Runner is the external orchestration layer for executing Matt Pocock's user-invoked engineering workflow across real Codex threads without changing the upstream skills. ShipFlow owns stage ordering, durable checkpoints, and context boundaries; Matt's installed skills own each engineering stage; Codex owns coding-agent capabilities and user-level configuration.

`/shipflow <goal>` is the primary in-Codex frontend. The direct `shipflow run` CLI remains available for terminal-first usage.

## Trigger

In-Codex autonomous start:

```text
/shipflow <development goal>
```

Direct CLI start:

```bash
shipflow run "<development goal>" --agent codex
```

Safe checkpoint resume:

```bash
shipflow resume <run-id>
```

The MVP supports Codex only.

## Required inputs and access

- A Git repository working tree on a feature branch.
- Node.js 18+.
- A working Codex installation/authentication usable by `@openai/codex-sdk`.
- The complete ShipFlow multi-skill bundle installed for Codex.
- The external ShipFlow Runner CLI available to `/shipflow`.
- Repository write access for specs, tickets, code, tests, and commits.
- Repository workflow configuration from `setup-matt-pocock-skills`, or permission to run that setup interactively.

The runner checks all ten bundled skill names before starting. It refuses `main`/`master` and unrelated dirty working-tree changes by default. Those safeguards can be explicitly overridden with `--allow-main` and `--allow-dirty`.

## Codex transport and configuration ownership

The MVP uses `@openai/codex-sdk` rather than scraping terminal output.

- New workflow contexts use `Codex.startThread()`.
- Human answers within an active stage stay on the same thread.
- Persisted safe checkpoints use the Codex thread id and `Codex.resumeThread()`.
- Each turn uses structured output to return a small ShipFlow control envelope.
- By default ShipFlow creates `Codex` without config overrides and passes only `workingDirectory` as a thread option.
- Model, reasoning effort, sandbox, approval policy, network, web search, MCP configuration, and other normal Codex settings therefore remain owned by the user's Codex configuration unless explicitly overridden for the run.

ShipFlow exposes opt-in thread overrides for `model`, `modelReasoningEffort`, `sandboxMode`, `approvalPolicy`, `networkAccessEnabled`, `webSearchMode`, and `additionalDirectories`, plus repeatable raw Codex `key=value` config overrides. Omitted values are not sent to the SDK.

For a conservative execution preset, `--safe` applies:

```text
sandboxMode = workspace-write
approvalPolicy = never
networkAccessEnabled = false
```

An explicit override wins over the preset.

One runtime limitation is intentional: the current TypeScript SDK exec event stream has no interactive approval request/response event. If the inherited Codex policy requires a human approval that cannot be satisfied in the SDK turn, the runner fails closed. It does not emulate Codex's approval UI. The operator can rerun with a compatible explicit policy or execute that stage in the Codex TUI.

The control envelope contains only:

```text
status: waiting_for_user | stage_complete | blocked
message: full user-facing stage output/questions
artifacts: durable spec/ticket/other references only
```

It is orchestration metadata, not a replacement for Matt's skill output or tracker artifacts.

## Ordered actions

1. **Preflight.** Resolve the repository, branch, Git fixed point, installed skills, dirty state, and workflow configuration. Create a run id and persistent state store.
2. **Setup context, when needed.** Start a dedicated Codex thread and send `$setup-matt-pocock-skills`. Preserve every upstream human choice. End this thread when setup completes.
3. **Planning context.** Start a fresh Codex thread and send `$grill-with-docs <goal>` as a top-level user turn.
4. Continue the same planning thread until `grill-with-docs` reaches its own completion criterion, preserving human questions.
5. On that same planning thread, send `$to-spec`. Persist the durable published spec reference returned by the stage.
6. On that same planning thread, send `$to-tickets <spec-reference>`. Persist every durable ticket reference in dependency-safe publication order.
7. **Close the planning context.** Do not carry its transcript into implementation; retain only durable references and the recorded planning thread id.
8. **Fresh implementation context per ticket.** For each ticket in dependency-safe order, start a new Codex thread and send `$implement <ticket-reference>` plus the originating spec reference.
9. Let the installed `implement` skill own TDD, verification, `code-review`, and the commit. After stage completion, independently verify that Git `HEAD` changed; otherwise fail closed.
10. After all tickets complete, record final Git `HEAD`, completed ticket/thread/commit tuples, and mark the run complete.

## `/shipflow` handoff protocol

A Skill invocation cannot safely block a nested Runner process waiting for terminal stdin. `/shipflow` therefore uses Runner handoff mode.

Start:

```bash
shipflow run "<goal>" --handoff
```

In handoff mode the Runner executes automatically until one of four externally meaningful states and emits exactly one JSON object on stdout:

```text
complete
waiting_for_user
blocked
failed
```

The handoff object includes the run id, active stage, message, state path, durable artifact counts, and final Git head when available.

At `waiting_for_user`, the Runner has already persisted the active Codex thread and upstream question. It exits without reading stdin. `/shipflow` presents that exact engineering decision in the current Codex conversation. After the user replies, `/shipflow` resumes automatically:

```bash
shipflow resume <run-id> --handoff --answer "<answer>"
```

The supplied answer is sent to the same active Codex thread. The Runner then continues through later stages automatically until the next human checkpoint or completion.

At `blocked`, the same mechanism preserves the blocker and run id. The user supplies only the information or environment change required to unblock the recorded stage, then `/shipflow` resumes the same run.

Handoff mode never falls back to the old behavior of telling the user to manually invoke another Matt Skill.

## Human checkpoints

In direct interactive CLI mode, a stage that returns `waiting_for_user` prints the upstream question and reads the answer from stdin.

In `/shipflow` handoff mode, the same checkpoint is persisted and returned to the parent Skill instead. The parent Skill presents the question to the user and supplies the answer through `shipflow resume --handoff --answer ...`.

In both modes the runner never answers product, testing-seam, ticket-granularity, setup, or irreversible decisions on the user's behalf. `:abort` stops an interactive run.

This human checkpoint mechanism is separate from Codex tool/shell approval. ShipFlow handles Matt workflow decisions; it does not implement a replacement approval UI for Codex exec.

## Durable state

Store state outside the working tree under:

```text
<git-dir>/shipflow/runs/<run-id>.json
```

This avoids making the project dirty merely because the runner checkpoints itself.

Persist only orchestration data:

- run id and goal,
- repository root, branch, fixed point and final head,
- current stage/status/checkpoint,
- setup/planning/active/implementation Codex thread ids,
- pending human/blocker message,
- spec reference,
- ticket references and next ticket index,
- current ticket and its starting Git head,
- completed ticket/thread/commit tuples,
- blocker/failure text.

Do not duplicate Matt's spec or ticket bodies into runner state.

## Retry and idempotency

- Completed stages are not replayed.
- `shipflow resume` is guaranteed only for a persisted `waiting_for_user` or `blocked` checkpoint.
- A resumed human checkpoint continues the same Codex thread and active stage.
- After a resumed implementation ticket completes, the next ticket still gets a fresh thread.
- A process interruption while an agent turn is actively running is **not** automatically replayed in the MVP; the runner fails closed and asks the operator to inspect the recorded thread before retrying.
- Stage completion is never inferred only from process exit; it requires a valid structured control response and stage-specific durable evidence.

## Failure behavior

Stop with a concrete error when:

- the Runner CLI required by `/shipflow` is unavailable,
- a required skill is missing or its `name:` frontmatter does not match,
- the current branch is protected without an explicit override,
- unrelated working-tree changes exist without an explicit override,
- Codex cannot start or resume a thread,
- inherited Codex configuration requires an interaction unavailable through the SDK transport,
- Codex returns malformed orchestration control output,
- `to-spec` completes without exactly one durable spec reference,
- `to-tickets` completes without durable ticket references,
- an upstream stage reports a blocker,
- `implement` reports completion but has not created the commit required by the upstream skill,
- a resume is attempted from a different repository/branch or from a non-safe checkpoint.

Never substitute a home-grown version of a Matt skill or Codex capability after a failure.

## Observability

A completed run proves:

- the required skill bundle was available,
- the starting branch and Git fixed point,
- which Codex planning/setup thread ids were used,
- the durable spec and ticket references,
- each implementation ticket ran in its own fresh Codex thread,
- the commit produced for each ticket,
- the final Git head and workflow-complete checkpoint.

Handoff mode additionally proves that human checkpoints can leave the nested Runner process, survive as durable state, and resume the same active Codex thread without manual Skill commands.

Intermediate Codex command executions and file changes may be printed in direct CLI mode, but raw hidden reasoning is not surfaced.

## Acceptance criteria

- `/shipflow "<goal>"` is autonomous by default and does not instruct the user to manually type another Matt Skill command.
- `shipflow run "<goal>" --agent codex` can drive the same full route in direct CLI mode.
- `--handoff` returns a single machine-readable JSON object and never waits on stdin.
- A `waiting_for_user` handoff persists the exact message, run id, active stage, and thread; `resume --handoff --answer` continues that same thread.
- A blocked handoff preserves the blocker and remains resumable.
- No Matt skill body is copied into runner logic.
- User-invoked Matt skills are sent as explicit top-level Codex skill commands, never recursively invoked from the ShipFlow skill.
- Setup has an isolated context; grill/spec/tickets share one planning context; every implementation ticket has a fresh context.
- By default the runner does not override normal Codex model/reasoning/sandbox/network/web/MCP configuration.
- Explicit Codex options alter only the requested settings; `--safe` restores the conservative MVP preset.
- Durable state lives outside the working tree and supports safe checkpoint resume without replaying completed stages.
- Missing artifacts, blockers, malformed control responses, unsupported approval interactions, or missing implementation commits fail closed.
- Public Runner and handoff behavior are covered by tests at the workflow/CLI seam rather than tests coupled to private implementation functions.
