---
name: shipflow
description: Use when a user wants one entry point for Matt Pocock's standard engineering workflow instead of manually invoking each upstream skill.
disable-model-invocation: true
---

# ShipFlow

ShipFlow is a **thin runtime orchestrator** for Matt Pocock's installed engineering skills.

It MUST NOT recreate, paraphrase, replace, or extend the internal workflow of the upstream skills. The installed upstream `SKILL.md` files are the source of truth.

## Required upstream skills

The following skills from `mattpocock/skills` must be installed and available:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `to-spec`
- `to-tickets`
- `implement`
- `code-review`

Their transitive dependencies must also be installed because upstream skills may reference them:

- `grilling`
- `domain-modeling`
- `tdd`

If any required skill cannot be resolved, STOP and tell the user which upstream skill is missing. Never emulate a missing skill from memory.

## Runtime skill-resolution protocol

For every upstream skill ShipFlow needs, resolve it by **exact skill name** using this protocol:

1. **Prefer native runtime skill loading/invocation when available.** If the runtime exposes a supported way to load or invoke an installed skill by name, use it.
2. **Otherwise resolve the installed `SKILL.md` file.** Use the runtime's installed-skill registry or filesystem roots exposed to the agent. Common project roots include `.agents/skills/<skill-name>/SKILL.md` and agent-specific skill roots; global installs may live in the corresponding user-level skill directory.
3. **Read the complete upstream `SKILL.md` before executing that stage.** Execute its current instructions faithfully. Do not rely on a remembered or summarized version.
4. **Resolve nested skill references the same way.** If an upstream skill instructs the agent to use another skill such as `grilling`, `domain-modeling`, `tdd`, or `code-review`, resolve and read that installed skill rather than reproducing its behavior locally.
5. **Fail closed.** If neither native skill loading nor the installed `SKILL.md` can be accessed, STOP. Report the capability or installation gap and do not substitute a custom workflow.

The absence of a dedicated `Skill` tool is **not** permission to skip a stage or imitate it. Reading and executing the installed upstream `SKILL.md` is the required fallback.

## Repository setup

Before starting the build chain, check whether Matt's repository configuration exists, including the issue-tracker configuration expected by the upstream skills.

If setup is missing, resolve and execute the installed `setup-matt-pocock-skills` skill using the protocol above.

For ShipFlow's default local workflow, choose **Local Markdown** when the user has not already configured another tracker. Do not invent a storage layout; the upstream setup and tracker instructions own those conventions.

## Orchestration state machine

Once ShipFlow is explicitly triggered, run the full upstream chain in order:

```text
grill-with-docs
    ↓
to-spec
    ↓
to-tickets
    ↓
implement
    ↓
code-review
```

Do not collapse the chain into a direct code fix merely because the requested change appears small or narrow. ShipFlow means the workflow is being requested.

### Stage 1 — `grill-with-docs`

Resolve and execute the installed `grill-with-docs` skill with the user's development goal and current repository context.

Let the upstream skill run exactly as currently installed, including any interaction, repository exploration, and nested skills it requires. Do not shorten its interview, answer product decisions on the user's behalf, or substitute a custom discovery phase.

When it completes, advance automatically to `to-spec`.

### Stage 2 — `to-spec`

Resolve and execute the installed `to-spec` skill using the context produced by the completed grill.

The upstream skill owns repository exploration, test-seam decisions, spec structure, user confirmations, and publishing to the configured tracker. Do not create a second spec format or alternate spec directory.

When it completes, advance automatically to `to-tickets`.

### Stage 3 — `to-tickets`

Resolve and execute the installed `to-tickets` skill, passing the created spec reference when available.

The upstream skill owns ticket slicing, blocking edges, user approval, tracker publication, and Local Markdown file layout. Do not combine the tickets into a ShipFlow-specific schema.

When ticket publication completes, advance to implementation.

### Stage 4 — `implement`

Work the ticket frontier defined by the upstream tickets.

For each implementation unit that is ready, resolve and execute the installed `implement` skill with the relevant spec/ticket reference.

Do not reproduce TDD, verification, commit, or review rules in ShipFlow. If `implement` references `tdd` or `code-review`, resolve those installed skills using the same runtime skill-resolution protocol.

If an upstream instruction requires a runtime capability such as isolated/parallel sub-agents and that capability truly is unavailable, surface the capability gap instead of silently replacing the required behavior with a self-review or improvised approximation.

Continue until the requested ticket set is complete or an upstream skill reports a blocker requiring the user.

### Stage 5 — `code-review`

The installed `implement` skill may already execute the installed `code-review` skill as part of its completion path. If that upstream review ran successfully, count it as this stage and do not create a second custom review.

If implementation completes without the required upstream review, resolve and execute the installed `code-review` skill directly and let it request any fixed point or spec reference it requires.

Never add a ShipFlow-specific review rubric, severity model, repair loop, or merged review axis.

## Interaction and resume rule

"One trigger" means the user does not manually invoke each stage. It does **not** mean bypassing user decisions required by upstream skills.

If an upstream skill asks the user a question or requests approval:

1. preserve the question's intent,
2. wait for the user's answer,
3. resume the same upstream stage,
4. then continue automatically to the next stage when that skill completes.

Do not restart the chain from the beginning unless the upstream instructions require it.

## Prohibited fallbacks

ShipFlow MUST NOT say or behave like any of the following:

- "There is no Skill tool, so I'll follow the same checks myself."
- "This is a narrow fix, so I'll skip spec/tickets and implement directly."
- "I know what `to-spec` does, so I'll generate an equivalent spec."
- "Sub-agents are unavailable, so I'll perform the independent review in the same context and call it equivalent."

When a runtime limitation appears, use the installed `SKILL.md` fallback where possible; otherwise fail closed and explain the exact missing capability.

## Source-of-truth rule

If ShipFlow conflicts with any installed upstream Matt Pocock skill, **the installed upstream skill wins**.

Never copy Matt's upstream skill bodies into this repository. ShipFlow owns only stage ordering, resolution, and resume behavior. Matt's installed skills own the engineering method.
