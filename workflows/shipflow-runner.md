# ShipFlow Runner v2

## Purpose and owner

ShipFlow Runner is the external orchestration layer for executing Matt Pocock's user-invoked engineering workflow across real agent sessions without changing the upstream skills. ShipFlow owns the runner; Matt's installed skills own each engineering stage.

## Trigger

Explicit manual start:

```bash
shipflow run "<development goal>" --agent <codex|claude-code|cursor>
```

## Required inputs and access

- A Git repository working tree.
- A supported agent CLI installed and authenticated.
- The ShipFlow multi-skill bundle installed through `npx skills`.
- Repository write access for specs, tickets, code, tests, and commits.
- Repository workflow configuration from `setup-matt-pocock-skills`, or permission to run setup interactively.

## Ordered actions

1. **Preflight.** Verify the repository, agent CLI, installed skills, Git state, and workflow configuration. Record a run ID and current Git fixed point.
2. **Setup checkpoint.** If repository workflow configuration is missing, launch the setup skill and wait for the user's tracker/domain choices.
3. **Planning session.** Launch one interactive agent session and explicitly invoke `grill-with-docs` with the goal. Preserve every upstream human question.
4. After grilling completes, explicitly invoke `to-spec` in the same planning session. Capture the published spec reference.
5. Explicitly invoke `to-tickets` with that spec reference. Capture the created ticket references and dependencies.
6. **Context boundary.** Persist only durable references and terminate the planning session. Do not carry the full planning transcript into implementation.
7. **Implementation session.** Launch a fresh agent context and explicitly invoke `implement` with the approved spec/tickets. Let upstream `implement` own TDD, verification, review, and commits.
8. If upstream implementation reports a blocker requiring human input, pause the run and resume the same stage after the answer.
9. **Completion.** Verify that required tickets are complete, the expected review ran, tests/verification required by upstream passed, and the Git state is recorded.

## Human checkpoints

- Questions and decisions raised by `grill-with-docs`.
- Setup choices when repository conventions are missing.
- Any approval explicitly requested by `to-spec` or `to-tickets`.
- Runtime blockers or irreversible decisions surfaced by the upstream skills.

The runner never answers these decisions on the user's behalf.

## Durable state

Store runner state outside the model context, for example under `.shipflow/runs/<run-id>.json`, containing only:

- current stage,
- goal,
- fixed point,
- spec reference,
- ticket references,
- active agent/session identifier when resumable,
- last successful checkpoint,
- blocker requiring user input.

Do not use this state file to duplicate Matt's specs or ticket content.

## Retry and idempotency

- A completed stage is not rerun unless its upstream artifact is missing or the user explicitly requests a restart.
- Re-running after interruption resumes from the last durable checkpoint.
- A failed agent launch may be retried without advancing the stage.
- The implementation stage must not be marked complete solely because the agent process exited successfully.

## Failure behavior

Stop with a concrete error when:

- a required skill is missing,
- the selected agent cannot be launched,
- an upstream artifact cannot be resolved,
- a required runtime capability cannot be provided,
- the repository changes unexpectedly outside the recorded run.

Never substitute a home-grown version of an upstream skill after a failure.

## Observability

A successful run proves:

- which upstream skill/version bundle was installed,
- which upstream commit was mirrored,
- the spec and ticket references used,
- the planning context was closed before implementation,
- the implementation session started fresh,
- the final Git fixed point and verification result.

## Acceptance criteria

- One external command can coordinate the full route while still surfacing all upstream human checkpoints.
- No Matt skill body is copied into runner logic.
- User-invoked skills are invoked by the runner as explicit top-level agent commands, never recursively by another user-invoked Skill.
- Planning and implementation use distinct contexts.
- Interrupted runs resume from durable state without replaying completed stages.
- A run cannot report success unless the upstream implementation/review completion conditions are met.
