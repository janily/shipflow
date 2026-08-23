# ShipFlow

ShipFlow packages and orchestrates [Matt Pocock's](https://github.com/mattpocock) open-source engineering skills into a standard `skills` bundle, plus a small route guide that tells you which workflow boundary comes next.

The bundled route is:

```text
grill-with-docs → to-spec → to-tickets → fresh context → implement
                                                     └→ tdd + code-review
```

The Matt Pocock skills in this repository are mirrored from [`mattpocock/skills`](https://github.com/mattpocock/skills) without modifying their contents. `skills/shipflow` is the only ShipFlow-owned skill.

## Install with the standard skills CLI

### Codex

```bash
npx skills@latest add janily/shipflow --skill '*' -a codex --copy -y
```

### Claude Code

```bash
npx skills@latest add janily/shipflow --skill '*' -a claude-code --copy -y
```

### Cursor

```bash
npx skills@latest add janily/shipflow --skill '*' -a cursor --copy -y
```

### Global Codex install

```bash
npx skills@latest add janily/shipflow --skill '*' -a codex --copy -g -y
```

No custom installer is required. Installation, lock tracking, and updates stay inside the standard `skills` CLI ecosystem.

Verify the install with:

```bash
npx skills list -a codex
```

A project-level Codex install should contain these 10 skills under `.agents/skills/`:

```text
code-review
domain-modeling
grill-with-docs
grilling
implement
setup-matt-pocock-skills
shipflow
tdd
to-spec
to-tickets
```

## First-time repository setup

Run Matt's setup skill once per repository:

```text
/setup-matt-pocock-skills
```

For a local file-based tracker, choose **Local Markdown**. Matt's setup skill owns the tracker conventions and file layout.

## Use ShipFlow v1

ShipFlow v1 is deliberately a workflow guide, not a recursive skill runner.

```text
/shipflow Add refresh-token rotation while preserving current sessions
```

It inspects the current workflow state and returns the next explicit Matt Pocock command, for example:

```text
Current phase: discovery
Next: /grill-with-docs Add refresh-token rotation while preserving current sessions
Reason: the change has not reached shared understanding yet.
```

Why not make the Skill recursively call every stage? Matt's current invocation model treats `grill-with-docs`, `to-spec`, `to-tickets`, and `implement` as user-invoked workflow boundaries. ShipFlow v1 preserves that contract rather than emulating or bypassing it.

## Codex Runner MVP

The `feat/codex-runner-mvp` branch contains the first external runner for true one-trigger execution. It uses the official `@openai/codex-sdk` and keeps Matt's user-invoked skills as explicit top-level Codex turns.

For branch testing:

```bash
git clone https://github.com/janily/shipflow.git
cd shipflow
git checkout feat/codex-runner-mvp
npm install
npm link
```

The target repository still needs the standard ShipFlow skill bundle installed. Run the runner from a feature branch in that target repository:

```bash
shipflow run "Add refresh-token rotation while preserving current sessions" --agent codex
```

The MVP executes:

```text
optional setup thread
        ↓
fresh planning thread
  $grill-with-docs <goal>
  $to-spec
  $to-tickets <spec>
        ↓
close planning context
        ↓
fresh Codex thread per ticket
  $implement <ticket>
  └─ upstream tdd + code-review + commit
```

Human questions remain interactive and continue on the same active Codex thread. Durable orchestration state is stored under `<git-dir>/shipflow/runs/<run-id>.json`, outside the working tree.

Resume a persisted human checkpoint or blocker with:

```bash
shipflow resume <run-id>
```

Safety defaults:

- refuses `main`/`master` unless `--allow-main` is explicit,
- refuses unrelated dirty changes unless `--allow-dirty` is explicit,
- uses Codex `workspace-write` with approval policy `never`,
- disables network access unless `--network` is explicit,
- fails if required skills/spec/tickets are missing or an `implement` stage returns without the upstream-required commit.

The MVP intentionally does not auto-replay a turn interrupted while Codex is actively running; resume is guaranteed only at persisted human/blocker checkpoints. See [`workflows/shipflow-runner.md`](workflows/shipflow-runner.md) for the full contract.

## Upstream mirror

The following directories are exact mirrors from `mattpocock/skills`:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `grilling`
- `domain-modeling`
- `to-spec`
- `to-tickets`
- `implement`
- `tdd`
- `code-review`

The pinned upstream commit is recorded in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT). Matt's original MIT license is preserved in [`MATT_LICENSE`](MATT_LICENSE).

A GitHub Action periodically syncs these directories from Matt's `main` branch. The mirror is verified against the recorded upstream commit so accidental local edits are caught.

## Updating

After this repository syncs a newer Matt upstream version, users can update through the normal CLI:

```bash
npx skills update -y
```

## Acknowledgements

ShipFlow is built on top of the engineering workflow and skills created by [Matt Pocock](https://github.com/mattpocock).

The following skills bundled in this repository are mirrored from [`mattpocock/skills`](https://github.com/mattpocock/skills) and remain Matt's work:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `grilling`
- `domain-modeling`
- `to-spec`
- `to-tickets`
- `implement`
- `tdd`
- `code-review`

Huge thanks to Matt for sharing the workflow, the skills, and the ideas around context engineering that inspired ShipFlow.

ShipFlow does not claim authorship of these upstream skills. Its contribution is the standard multi-skill distribution, workflow routing, upstream synchronization, and the external runner being developed for end-to-end orchestration.

Matt's original MIT license is preserved in [`MATT_LICENSE`](MATT_LICENSE). The exact upstream revision mirrored by this repository is recorded in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT).

## Design principle

> Matt's skills own the engineering method. ShipFlow owns distribution, routing, and the external runner.

ShipFlow does not rewrite Matt's engineering skills.
