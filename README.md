# ShipFlow

ShipFlow is a one-trigger orchestrator for Matt Pocock's validated AI coding workflow:

```text
grill-with-docs → to-spec → to-tickets → implement → code-review
```

ShipFlow does **not** reimplement those skills. Matt Pocock's installed upstream skills remain the source of truth; ShipFlow only coordinates them so you don't have to invoke each stage manually.

## One-click install

### Codex

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --agent codex
```

### Claude Code

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash
```

### Cursor

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --agent cursor
```

### Global install

```bash
curl -fsSL "https://raw.githubusercontent.com/janily/shipflow/main/install.sh?ts=$(date +%s)" | bash -s -- --agent codex --global
```

A current run starts with:

```text
ShipFlow installer 1.1.0
```

## How installation works

The installer deliberately uses two different mechanisms:

1. **Matt Pocock's multi-skill repository** is installed with the official `skills` CLI.
2. **ShipFlow itself is a single `SKILL.md` file**, so the installer downloads it directly to the target agent's standard skill directory.
3. The installer validates the downloaded frontmatter and verifies the final file before reporting success.

For a Codex project install the final file must be:

```text
.agents/skills/shipflow/SKILL.md
```

This is intentional. The `skills` CLI ultimately installs Codex project skills under `.agents/skills/<skill-name>`. ShipFlow avoids an unnecessary repository-discovery layer and writes its single file directly to that standard location.

If you already have Matt's upstream skills and only need ShipFlow for Codex, you can install it directly:

```bash
mkdir -p .agents/skills/shipflow && \
  curl -fL "https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md?ts=$(date +%s)" \
  -o .agents/skills/shipflow/SKILL.md
```

To update ShipFlow, simply rerun the installer. Matt's upstream skills continue to be managed by the `skills` CLI.

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
