# ShipFlow

ShipFlow is a one-trigger orchestrator for Matt Pocock's validated AI coding workflow:

```text
grill-with-docs → to-spec → to-tickets → implement → code-review
```

ShipFlow does **not** reimplement those skills. Matt Pocock's installed upstream skills remain the source of truth; ShipFlow only coordinates them so you don't have to invoke each stage manually.

## One-click install

The install command includes a cache-busting query so proxies/CDNs do not serve an older installer.

### Claude Code

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash
```

### Codex

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --agent codex
```

### Cursor

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --agent cursor
```

### Global install

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --global
```

The installer:

1. installs Matt Pocock's required upstream skills from `mattpocock/skills`;
2. installs ShipFlow from the direct `SKILL.md` download URL rather than relying on repository discovery;
3. verifies that the actual ShipFlow file exists (for Codex project installs: `.agents/skills/shipflow/SKILL.md`) before reporting success.

A current installer run starts with something like:

```text
ShipFlow installer 1.0.1
```

If you already have Matt's upstream skills and only want ShipFlow, install the single skill directly:

```bash
npx skills@latest add "https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md?ts=$(date +%s)" -a codex -y
```

The `skills` CLI officially supports direct `SKILL.md` download URLs, so this avoids an unnecessary repository-discovery step.

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

Different coding agents expose Skills differently. Some runtimes may provide a native way to load/invoke another installed skill; others, including some Codex environments, may not expose a dedicated `Skill` tool.

ShipFlow handles both cases:

```text
1. Prefer native skill loading/invocation when the runtime supports it.
2. Otherwise resolve the installed upstream SKILL.md file.
3. Read the complete current upstream instructions.
4. Execute those instructions faithfully.
5. Resolve nested skill references the same way.
```

For example, a Codex project installation exposes the workflow skills under paths such as:

```text
.agents/skills/grill-with-docs/SKILL.md
.agents/skills/to-spec/SKILL.md
.agents/skills/to-tickets/SKILL.md
.agents/skills/implement/SKILL.md
.agents/skills/code-review/SKILL.md
.agents/skills/shipflow/SKILL.md
```

**Important:** if a runtime has no dedicated Skill tool, ShipFlow must not imitate Matt's workflow from memory. It must read the installed upstream `SKILL.md`. If an upstream skill cannot be resolved, ShipFlow fails closed and reports the missing dependency/capability.

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

ShipFlow also does **not** downgrade a full ShipFlow request into a direct "narrow fix" just because the change looks small. Triggering ShipFlow means the upstream workflow is requested.

## Design principle

ShipFlow is deliberately thin:

> Matt's skills own the engineering method. ShipFlow owns only resolution, ordering, and resume behavior.

If ShipFlow conflicts with an installed upstream Matt Pocock skill, the installed upstream skill wins.
