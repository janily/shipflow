# ShipFlow

ShipFlow packages and orchestrates [Matt Pocock's](https://github.com/mattpocock) open-source engineering skills into a standard `skills` bundle with one autonomous entry point:

```text
/shipflow <development goal>
```

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

No custom installer and no separate ShipFlow Runner are required. Installation, lock tracking, and updates stay inside the standard `skills` CLI ecosystem.

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

## Use ShipFlow — autonomous by default

In Codex, run one command:

```text
/shipflow Add refresh-token rotation while preserving current sessions
```

ShipFlow automatically drives the installed upstream workflow:

```text
/shipflow <goal>
      ↓
isolated planning context
  $grill-with-docs <goal>
  $to-spec
  $to-tickets <spec>
      ↓
close planning context
      ↓
fresh implementation context per ticket
  $implement <ticket>
  └─ upstream tdd + code-review + commit
```

You do **not** manually type `/grill-with-docs`, `/to-spec`, `/to-tickets`, or `/implement` during normal autonomous use.

When an upstream skill needs a genuine human decision, ShipFlow surfaces that question in the current conversation. Answer the engineering question normally; ShipFlow continues the same active stage and then advances automatically.

### No external Runner

ShipFlow is intentionally Skill-first. The main branch does not require `shipflow run`, `npm link`, or a separate Node workflow engine.

To preserve real context boundaries, the ShipFlow skill uses the host agent's own isolated-agent/session capability:

1. Prefer native multi-agent/sub-agent tools when the runtime exposes them.
2. On Codex, fall back to Codex's native `exec` / `resume` session primitives when needed.
3. If the runtime cannot create a genuinely isolated context, fail closed instead of pretending one long conversation is a fresh context.

For Codex execution details, see [`skills/shipflow/CODEX-AUTONOMY.md`](skills/shipflow/CODEX-AUTONOMY.md). The workflow contract is documented in [`workflows/shipflow-autonomous.md`](workflows/shipflow-autonomous.md).

### Why this still respects Matt's skills

ShipFlow does not copy Matt's engineering instructions into its own prompt logic. Each user-invoked Matt skill is started as the explicit top-level task inside the appropriate planning or implementation agent/session.

That keeps the ownership split clear:

```text
Matt skills  → engineering method
Codex/agent  → coding + isolated contexts
ShipFlow     → ordering + context boundaries + human handoff
```

### Guided/manual mode

Autonomous mode is the default. If you explicitly ask `/shipflow` for guided/manual mode, it will only report the next Matt command instead of executing it.

## Codex context strategy

The planning stages share one context because `to-spec` and `to-tickets` need the shared understanding created by grilling:

```text
planning context
  grill-with-docs
  to-spec
  to-tickets
```

Implementation deliberately starts fresh:

```text
planning transcript
      X
      │ not copied
      ▼
Ticket 01 → fresh context
Ticket 02 → another fresh context
Ticket 03 → another fresh context
```

Only durable artifacts cross that boundary: the goal, published spec reference, ticket references/dependencies, and repository state.

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

ShipFlow does not claim authorship of these upstream skills. Its contribution is the standard multi-skill distribution, upstream synchronization, and autonomous orchestration across real agent/session boundaries.

Matt's original MIT license is preserved in [`MATT_LICENSE`](MATT_LICENSE). The exact upstream revision mirrored by this repository is recorded in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT).

## Design principle

> Matt's skills own the engineering method. The host agent owns coding capabilities and isolated contexts. ShipFlow owns distribution and orchestration.

ShipFlow does not rewrite Matt's engineering skills and does not reimplement Codex.
