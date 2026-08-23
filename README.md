# ShipFlow

ShipFlow is a one-trigger orchestrator for Matt Pocock's validated AI coding workflow:

```text
grill-with-docs → to-spec → to-tickets → implement → code-review
```

ShipFlow does **not** reimplement those skills. Matt Pocock's installed upstream skills remain the source of truth; ShipFlow only coordinates them so you don't have to invoke each stage manually.

## One-click install

To avoid stale `raw.githubusercontent.com` installer caches, the examples below fetch `install.sh` through GitHub's Contents API.

### Codex

```bash
curl -fsSL \
  -H 'Accept: application/vnd.github.raw+json' \
  'https://api.github.com/repos/janily/shipflow/contents/install.sh?ref=main' \
  | bash -s -- --agent codex
```

### Claude Code

```bash
curl -fsSL \
  -H 'Accept: application/vnd.github.raw+json' \
  'https://api.github.com/repos/janily/shipflow/contents/install.sh?ref=main' \
  | bash
```

### Cursor

```bash
curl -fsSL \
  -H 'Accept: application/vnd.github.raw+json' \
  'https://api.github.com/repos/janily/shipflow/contents/install.sh?ref=main' \
  | bash -s -- --agent cursor
```

### Global Codex install

```bash
curl -fsSL \
  -H 'Accept: application/vnd.github.raw+json' \
  'https://api.github.com/repos/janily/shipflow/contents/install.sh?ref=main' \
  | bash -s -- --agent codex --global
```

A current run starts with:

```text
ShipFlow installer 1.2.0
```

## How installation works

The installer is intentionally defensive:

1. Capture the absolute project root before running any child commands.
2. Install **ShipFlow first**.
3. Prefer the official `skills` CLI using a direct `SKILL.md` URL with `--copy`.
4. Immediately verify that the expected ShipFlow file exists and contains `name: shipflow`.
5. If the CLI path fails or returns without producing the file, fall back to downloading `SKILL.md` directly into the agent's standard skill directory.
6. Install Matt Pocock's required upstream skills with the official `skills` CLI.
7. Verify ShipFlow again after the upstream install and restore it if necessary.
8. Print every installed `SKILL.md` under the final skill root before reporting success.

For a project-level Codex install the required final file is:

```text
.agents/skills/shipflow/SKILL.md
```

The `skills` CLI itself documents Codex's project path as `.agents/skills/` and supports both direct `SKILL.md` downloads and the `--copy` installation mode.

If you already have Matt's upstream skills and only want to install ShipFlow for Codex:

```bash
npx skills@latest add \
  'https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md' \
  --copy -a codex -y
```

If that command is blocked by your local network/runtime, the deterministic fallback is:

```bash
mkdir -p .agents/skills/shipflow && \
  curl -fL 'https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md' \
  -o .agents/skills/shipflow/SKILL.md
```

## What gets installed

From `mattpocock/skills`:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `grilling`
- `domain-modeling`
- `to-spec`
- `to-tickets`
- `implement`
- `tdd`
- `code-review`

From this repository:

- `shipflow`

The upstream skill bodies are not copied, forked, or modified here.

## How ShipFlow executes upstream skills

Different coding agents expose Skills differently. Some runtimes provide a native way to load or invoke another installed skill; others may not expose a dedicated Skill tool.

ShipFlow handles both cases:

```text
1. Prefer native skill loading/invocation when available.
2. Otherwise resolve the installed upstream SKILL.md file.
3. Read the complete current upstream instructions.
4. Execute those instructions faithfully.
5. Resolve nested skill references the same way.
```

For Codex project installs the workflow is available under paths such as:

```text
.agents/skills/grill-with-docs/SKILL.md
.agents/skills/to-spec/SKILL.md
.agents/skills/to-tickets/SKILL.md
.agents/skills/implement/SKILL.md
.agents/skills/code-review/SKILL.md
.agents/skills/shipflow/SKILL.md
```

**Important:** if a runtime has no dedicated Skill tool, ShipFlow must not imitate Matt's workflow from memory. It must read the installed upstream `SKILL.md`. If an upstream skill cannot be resolved, ShipFlow fails closed and reports the missing dependency or capability.

## Repository setup

Matt's workflow relies on repository-level configuration. In each repository, run:

```text
/setup-matt-pocock-skills
```

For local file-based tracking, choose **Local Markdown**. ShipFlow follows Matt's tracker conventions rather than inventing its own storage format.

## Use

Once setup is complete:

```text
/shipflow Add refresh-token rotation while preserving current sessions.
```

ShipFlow coordinates:

```text
1. grill-with-docs
2. to-spec
3. to-tickets
4. implement
5. code-review
```

"One trigger" means you don't manually invoke the next stage. It does **not** bypass confirmation points required by Matt's upstream skills. If an upstream skill asks a question, answer it and ShipFlow resumes that stage before continuing automatically.

## Design principle

ShipFlow is deliberately thin:

> Matt's skills own the engineering method. ShipFlow owns only resolution, ordering, and resume behavior.

If ShipFlow conflicts with an installed upstream Matt Pocock skill, the installed upstream skill wins.
