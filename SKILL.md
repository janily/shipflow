---
name: shipflow
description: Use when a user wants one entry point for Matt Pocock's standard engineering workflow instead of manually invoking each upstream skill.
disable-model-invocation: true
---

# ShipFlow

This is a **thin orchestrator** for Matt Pocock's upstream engineering skills.

It MUST NOT recreate, paraphrase, replace, or extend the internal workflow of the upstream skills. The upstream skills are the source of truth.

## Required upstream skills

The following skills from `mattpocock/skills` must be installed and available:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `to-spec`
- `to-tickets`
- `implement`
- `code-review`

Their transitive dependencies must also be installed because the upstream skills invoke them:

- `grilling`
- `domain-modeling`
- `tdd`

If any required skill is unavailable, stop and tell the user to install the upstream dependencies. Do not emulate the missing skill.

## Repository setup

Before starting the build chain, check whether Matt's repo configuration exists (for example `docs/agents/issue-tracker.md` and `docs/agents/domain.md`).

If it is missing, invoke the upstream `setup-matt-pocock-skills` skill first.

For this orchestrator's default workflow, select **Local Markdown** as the issue tracker unless the repository is already configured differently by the user. Do not invent another storage layout. The upstream setup skill owns the tracker conventions.

## Orchestration

The only workflow this skill coordinates is:

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

### 1. Invoke `grill-with-docs`

Call the Skill tool for `grill-with-docs`, passing the user's development goal and the current repository context.

Let `grill-with-docs` run exactly as defined upstream, including any interaction it requires. Do not shorten its interview, answer its questions on the user's behalf, or substitute a custom discovery phase.

When it completes, continue automatically to the next stage. The user should not need to type `/to-spec` manually.

### 2. Invoke `to-spec`

Call the Skill tool for `to-spec` using the context produced by the completed grill.

Let the upstream skill decide how to explore the repository, define test seams, structure the spec, and publish it to the configured issue tracker.

Do not create a second spec format or alternate spec directory.

When it completes, continue automatically to `to-tickets`.

### 3. Invoke `to-tickets`

Call the Skill tool for `to-tickets`, pointing it at the spec created by `to-spec` when a reference is available.

Let the upstream skill own ticket slicing, blocking edges, user approval of the breakdown, tracker publication, and Local Markdown file layout.

Do not combine tickets into a custom `tickets.md` file and do not invent a second ticket schema.

When ticket creation is complete, continue to implementation.

### 4. Invoke `implement`

Work the ticket frontier using Matt's existing ticket dependencies.

For each ready implementation unit, invoke the upstream `implement` skill with the relevant spec/ticket reference. Preserve the fresh-context boundary expected by the upstream workflow when the runtime supports sub-agents or isolated contexts.

Do not reproduce TDD, verification, commit, or review rules here. `implement` owns those rules upstream and itself invokes `tdd` and `code-review` as required.

Continue until the requested ticket set is complete or an upstream skill reports a blocker that requires the user.

### 5. `code-review`

`implement` is expected to invoke the upstream `code-review` skill as part of its own completion flow. Treat that upstream review as the code-review stage of this orchestrated chain.

Do not add a second custom review rubric, severity model, or repair loop. Do not merge the Standards and Spec axes defined by Matt's `code-review` skill.

If `implement` completes without running `code-review` because the runtime could not invoke it, explicitly invoke the upstream `code-review` skill using the fixed point required by that skill. Do not implement review logic locally.

## Interaction rule

"One trigger" means the user does not manually invoke the five stages. It does **not** mean skipping user decisions requested by the upstream skills.

If `grill-with-docs`, `to-spec`, `to-tickets`, or another upstream skill asks the user to confirm a decision, surface that question unchanged in intent, wait for the answer, then resume the chain automatically from the same stage.

## Source-of-truth rule

If this orchestrator conflicts with any installed upstream skill, **the upstream Matt Pocock skill wins**.

Never copy upstream skill bodies into this repository. Keeping them as external dependencies ensures `npx skills update` can pick up Matt's validated improvements without this orchestrator drifting into a fork.
