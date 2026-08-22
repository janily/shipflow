# Orchestrator contract tests

1. A rough feature request must invoke upstream `grill-with-docs`; the orchestrator must not invent its own questionnaire.
2. If an upstream dependency is missing, the orchestrator must stop rather than emulate it.
3. An unconfigured repo must use upstream `setup-matt-pocock-skills`; Local Markdown must follow the upstream `.scratch/` convention.
4. Upstream confirmation questions must still reach the user; after the answer, the orchestrator resumes the chain automatically.
5. Review must come from Matt's upstream `code-review`; the orchestrator must not add a custom review rubric or severity model.
