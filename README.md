# ShipFlow

ShipFlow packages and orchestrates [Matt Pocock's](https://github.com/mattpocock) open-source engineering skills into a standard `skills` bundle, with an autonomous `/shipflow` frontend and an external Codex Runner that manages workflow state and fresh contexts.

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

No custom Skill installer is required. Installation, lock tracking, and Skill updates stay inside the standard `skills` CLI ecosystem.

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

## Use `/shipflow` — autonomous by default

Once the Runner CLI is available, the normal in-Codex entry point is:

```text
/shipflow Add refresh-token rotation while preserving current sessions
```

`/shipflow` does not ask you to manually type `/grill-with-docs`, `/to-spec`, `/to-tickets`, or `/implement`. It starts the external Runner in handoff mode and automatically drives:

```text
/shipflow <goal>
      ↓
Runner planning thread
  $grill-with-docs <goal>
  $to-spec
  $to-tickets <spec>
      ↓
fresh Codex thread per ticket
  $implement <ticket>
  └─ upstream tdd + code-review + commit
```

When an upstream stage needs a real human decision, the Runner persists a checkpoint and returns the exact question to the current Codex conversation. You answer the engineering question normally; `/shipflow` automatically resumes the same run and thread. You do not need to type another ShipFlow or Matt command.

If you explicitly want the old step-by-step experience, ask `/shipflow` for **guided/manual mode**.

The Skill is still not recursively invoking Matt's user-invoked skills. It delegates execution to the external Runner, which sends those Skills as explicit top-level turns in the appropriate Codex threads.

## Codex Runner MVP

The `feat/codex-runner-mvp` branch contains the first external runner for true one-trigger execution. It uses the official `@openai/codex-sdk`.

For branch testing:

```bash
git clone https://github.com/janily/shipflow.git
cd shipflow
git checkout feat/codex-runner-mvp
npm install
npm link
```

Because `main` intentionally still contains the stable guided Skill while this work is under review, update only the target project's `shipflow` Skill from this local feature-branch checkout before testing `/shipflow`:

```bash
# Run from the target repository. Replace the path with your local ShipFlow checkout.
npx skills@latest add /path/to/shipflow --skill shipflow -a codex --copy -y
```

The other nine Matt skills can remain from the normal ShipFlow bundle installation. The direct CLI entry also remains available:

```bash
shipflow run "Add refresh-token rotation while preserving current sessions" --agent codex
```

### Skill handoff protocol

`/shipflow` uses a non-interactive bridge so a nested Runner never blocks waiting for terminal stdin:

```bash
shipflow run "<goal>" --handoff
```

At `waiting_for_user`, `blocked`, or `complete`, the command emits one JSON handoff object containing the run id, stage, status, and message. After the user answers in Codex, the Skill resumes with:

```bash
shipflow resume <run-id> --handoff --answer "<answer>"
```

The Runner then continues automatically until the next human checkpoint or workflow completion.

Durable orchestration state is stored under `<git-dir>/shipflow/runs/<run-id>.json`, outside the working tree.

The direct interactive CLI can also resume a persisted checkpoint or blocker with:

```bash
shipflow resume <run-id>
```

### Codex-native configuration by default

ShipFlow Runner is designed to feel like **Codex running your workflow**, not a replacement coding agent.

By default the Runner does not choose a model, reasoning effort, sandbox mode, approval policy, network policy, or web-search mode. It creates the Codex SDK client without config overrides and only supplies the thread working directory plus ShipFlow's structured control output. The underlying Codex CLI therefore continues to use the user's normal Codex environment and configuration.

That means settings normally owned by Codex remain owned by Codex, including configured model/reasoning defaults and configured MCP servers, subject to the capabilities available through Codex exec / the TypeScript SDK.

ShipFlow itself still owns workflow safety:

- refuses `main`/`master` unless `--allow-main` is explicit,
- refuses unrelated dirty changes unless `--allow-dirty` is explicit,
- fails if required skills/spec/tickets are missing,
- fails if an `implement` stage returns without the upstream-required commit,
- keeps planning and implementation contexts separate.

### Optional Codex overrides

Use overrides only when a particular ShipFlow run should differ from your normal Codex configuration:

```bash
shipflow run "Build feature" --model <model> --reasoning high
shipflow run "Build feature" --sandbox workspace-write --approval never
shipflow run "Build feature" --network --web-search live
shipflow run "Build feature" --add-dir ../shared
shipflow run "Build feature" --codex-config 'some.codex.key=value'
```

`--add-dir` and `--codex-config` are repeatable. `--network` and `--no-network` explicitly override the inherited network setting.

For the conservative execution preset, use:

```bash
shipflow run "Build feature" --safe
```

`--safe` applies `workspace-write`, approval policy `never`, and network off unless an explicit flag overrides one of those values.

One current SDK boundary matters: the TypeScript SDK's exec event stream does not expose an interactive approval request/response event. If an inherited approval policy requires a human approval that cannot be satisfied through the SDK run, ShipFlow fails closed. In that case use a compatible explicit policy for the run (for example `--safe` / `--approval never`) or run the stage directly in the Codex TUI.

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

ShipFlow does not claim authorship of these upstream skills. Its contribution is the standard multi-skill distribution, workflow routing, upstream synchronization, and the external runner for end-to-end orchestration.

Matt's original MIT license is preserved in [`MATT_LICENSE`](MATT_LICENSE). The exact upstream revision mirrored by this repository is recorded in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT).

## Design principle

> Matt's skills own the engineering method. Codex owns the coding-agent capabilities. ShipFlow owns distribution, routing, context boundaries, durable workflow state, and orchestration.

ShipFlow does not rewrite Matt's engineering skills or reimplement Codex.
