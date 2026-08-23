# ShipFlow

ShipFlow packages Matt Pocock's proven engineering workflow into a standard `skills` bundle, plus a small route guide that tells you which workflow boundary comes next.

The bundled route is:

```text
grill-with-docs → to-spec → to-tickets → fresh context → implement
                                                     └→ tdd + code-review
```

The Matt Pocock skills in this repository are mirrored from `mattpocock/skills` without modifying their contents. `skills/shipflow` is the only ShipFlow-owned skill.

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

## ShipFlow Runner v2

True one-trigger execution belongs one level above Skills. The planned external runner will coordinate agent sessions and context boundaries while invoking the original user-facing skills in sequence:

```text
shipflow run <goal>
    ↓
planning session
  grill-with-docs
  to-spec
  to-tickets
    ↓
close planning context
    ↓
fresh implementation session
  implement
  └─ tdd + code-review
```

See [`workflows/shipflow-runner.md`](workflows/shipflow-runner.md) for the implementation contract.

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

## Design principle

> Matt's skills own the engineering method. ShipFlow owns distribution, routing, and—later—the external runner.

ShipFlow does not rewrite Matt's engineering skills.
