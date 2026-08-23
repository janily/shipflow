---
name: shipflow
description: Use when a developer wants to follow Matt Pocock's standard feature-development route and needs the next explicit workflow command for the current repository state.
disable-model-invocation: true
---

# ShipFlow

ShipFlow is a route guide over the bundled Matt Pocock engineering skills. It does not replace their instructions and it does not invoke another user-invoked skill on the user's behalf.

## Route

Use repository state and the current conversation to choose exactly one next command:

1. If Matt's repository workflow is not configured, route to `/setup-matt-pocock-skills`.
2. If the change is still fuzzy or shared understanding has not been established, route to `/grill-with-docs <goal>`.
3. If the grill is complete and the conversation contains the agreed design but no published spec, route to `/to-spec`.
4. If a spec exists but implementation tickets do not, route to `/to-tickets <spec-reference>`.
5. If approved tickets exist, recommend starting a fresh context/session and route to `/implement <spec-or-ticket-reference>`.
6. `implement` owns its upstream `tdd` and `code-review` behavior. Do not add a separate ShipFlow implementation or review process.

When the tracker is Local Markdown, inspect the conventions written by `setup-matt-pocock-skills` rather than inventing a ShipFlow layout.

## Output

When invoked, report only:

- the current phase,
- the exact next command,
- one short reason that this is the next boundary.

Do not perform the routed user-invoked stage inside ShipFlow. The installed Matt Pocock skill is the source of truth for that stage.

If the user asks for one-trigger autonomous execution across all stages, explain that the Skill-only v1 intentionally preserves Matt's user-invoked boundaries. The external ShipFlow Runner is the planned automation layer for cross-session orchestration.

Completion criterion: there is one unambiguous next user-invoked command, or a concrete missing prerequisite is identified.
