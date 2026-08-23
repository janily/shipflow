# ShipFlow

ShipFlow is a one-trigger orchestrator for Matt Pocock's validated AI coding workflow:

```text
grill-with-docs → to-spec → to-tickets → implement → code-review
```

ShipFlow does **not** reimplement those skills. Matt Pocock's installed upstream skills remain the source of truth; ShipFlow only coordinates them so you don't have to invoke each stage manually.

## One-click install

The installer is fetched through GitHub's Contents API to avoid stale Raw CDN caches.

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
ShipFlow installer 2.0.0
```

## How installation works

The installer deliberately avoids making the final filesystem state depend on the behavior of another installer CLI.

1. Capture the absolute project root.
2. Download the current `mattpocock/skills` `main` source archive once.
3. Locate each required upstream Skill by its YAML frontmatter `name:`.
4. Copy the **entire original Skill directory** into the selected agent's standard skill root. Supporting files such as references, scripts and agent metadata are preserved.
5. Download the current ShipFlow `SKILL.md` from this repository.
6. Verify all 10 required Skills by checking both the file and its `name:` frontmatter.
7. Print the final installed `SKILL.md` paths before reporting success.

No Matt Pocock Skill body is embedded or rewritten in ShipFlow. Every install pulls the current upstream files directly from `mattpocock/skills`.

For a project-level Codex install, the expected result is:

```text
.agents/skills/
├── code-review/
├── domain-modeling/
├── grill-with-docs/
├── grilling/
├── implement/
├── setup-matt-pocock-skills/
├── shipflow/
├── tdd/
├── to-spec/
└── to-tickets/
```

Each directory contains its own `SKILL.md`; Matt's Skill directories may also contain their original supporting files.

To update ShipFlow **and** Matt's upstream Skills, rerun the same one-click installer.

## What gets installed

From the current `mattpocock/skills` upstream source:

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

For Codex project installs the workflow is available at paths such as:

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
