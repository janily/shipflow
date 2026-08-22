# ShipFlow

ShipFlow is a one-trigger orchestrator for Matt Pocock's validated AI coding workflow:

```text
grill-with-docs → to-spec → to-tickets → implement → code-review
```

ShipFlow does **not** reimplement those skills. Matt Pocock's upstream skills remain the source of truth; ShipFlow only coordinates them so you don't have to invoke each stage manually.

## One-click install

### Claude Code

```bash
curl -fsSL https://raw.githubusercontent.com/janily/shipflow/main/install.sh | bash
```

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/janily/shipflow/main/install.sh | bash -s -- --agent codex
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/janily/shipflow/main/install.sh | bash -s -- --agent cursor
```

### Global install

```bash
curl -fsSL https://raw.githubusercontent.com/janily/shipflow/main/install.sh | bash -s -- --global
```

The installer installs the required skills directly from `mattpocock/skills`, then installs ShipFlow from this repository.

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

## Repository setup

Matt's workflow relies on repository-level configuration. In each repository, run:

```text
/setup-matt-pocock-skills
```

For local file-based tracking, choose **Local Markdown**. ShipFlow follows Matt's canonical layout, such as:

```text
.scratch/<feature-slug>/spec.md
.scratch/<feature-slug>/issues/<NN>-<slug>.md
```

## Use

Once setup is complete:

```text
/shipflow Add refresh-token rotation while preserving current sessions.
```

ShipFlow automatically coordinates:

```text
1. grill-with-docs
2. to-spec
3. to-tickets
4. implement
5. code-review
```

"One trigger" means you don't manually invoke the next stage. It does **not** bypass the confirmation points required by Matt's upstream skills. If an upstream skill asks a question, answer it and ShipFlow resumes the chain.

## Design principle

ShipFlow is deliberately thin:

> Matt's skills own the engineering method. ShipFlow owns only the orchestration.

If ShipFlow ever conflicts with an installed upstream Matt Pocock skill, the upstream skill wins.
