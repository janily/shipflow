---
name: shipflow
description: Use when a developer wants ShipFlow to autonomously run Matt Pocock's feature-development workflow from one goal, preserving human checkpoints and fresh Codex contexts through the external ShipFlow Runner.
disable-model-invocation: true
---

# ShipFlow

ShipFlow is the autonomous in-Codex frontend to the external ShipFlow Runner. The Runner owns workflow state, Codex thread boundaries, resume, and verification. The installed Matt Pocock skills remain the source of truth for every engineering stage.

## Start

Treat `/shipflow <goal>` as autonomous mode unless the user explicitly asks for guided/manual mode.

1. Take the text after `/shipflow` as the development goal.
2. From the current repository, use the environment's command-execution tool to run the equivalent of:

   ```text
   shipflow run <goal-as-one-argument> --handoff
   ```

   Pass the goal as one shell argument using the platform's safe argument/quoting mechanism. Do not splice unescaped user text into a shell command.
3. Parse stdout as the Runner's single JSON handoff object.
4. Continue according to `status` below. Do not route the user to a manual `/grill-with-docs`, `/to-spec`, `/to-tickets`, or `/implement` command.

If the `shipflow` executable is unavailable, stop with one concrete prerequisite: the ShipFlow Runner CLI must be installed or linked. Do not fall back to reimplementing Matt's skills or to the old manual router behavior.

## Handoff loop

### `complete`

Report that the autonomous workflow completed. Include the final Git head and completed ticket count when present. Do not rerun a completed stage.

### `waiting_for_user`

Present the JSON `message` to the user as the active upstream question or decision. Preserve its substance; do not answer it on the user's behalf.

When the user replies, continue the same run automatically by executing the equivalent of:

```text
shipflow resume <runId> --handoff --answer <user-reply-as-one-argument>
```

Pass the answer as one safely quoted argument. Parse the returned JSON and continue this handoff loop. The user should only answer the engineering question; they should not need to type another ShipFlow or Matt skill command.

### `blocked`

Present the blocker from `message` and the run id. Ask only for the information or environment change needed to unblock the recorded stage. After the user provides it, automatically resume the same run with `--handoff --answer ...` and continue the loop.

### `failed`

Report the concrete Runner error and stop. Keep the run id when one is returned. Never substitute a home-grown implementation of the failed Matt stage.

## Ownership

The execution path is:

```text
/shipflow <goal>
    ↓
ShipFlow Skill frontend
    ↓
shipflow run --handoff
    ↓
Runner-managed Codex threads
    ↓
$grill-with-docs → $to-spec → $to-tickets
    ↓ fresh context per ticket
$implement
    └→ upstream tdd + code-review + commit
```

This Skill does not recursively invoke Matt's user-invoked skills itself. It delegates cross-session orchestration to the Runner, which sends those skills as explicit top-level turns in the appropriate Codex threads.

## Guided mode

Only when the user explicitly asks for guided/manual mode, inspect repository state and report the single next Matt command without executing it. Autonomous mode is the default for `/shipflow`.

Completion criterion: the Runner reaches `complete`, or a durable `waiting_for_user`, `blocked`, or `failed` handoff has been surfaced with its run id and exact next human action.
