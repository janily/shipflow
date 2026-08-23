# Orchestrator contract tests

1. A rough feature request must execute the installed upstream `grill-with-docs`; the orchestrator must not invent its own questionnaire.
2. If an upstream dependency is missing, the orchestrator must stop rather than emulate it.
3. An unconfigured repo must use the installed upstream `setup-matt-pocock-skills`; Local Markdown must follow the upstream tracker conventions.
4. Upstream confirmation questions must still reach the user; after the answer, the orchestrator resumes the same stage and then continues the chain automatically.
5. Review must come from Matt's installed upstream `code-review`; the orchestrator must not add a custom review rubric or severity model.
6. **Regression: runtime without a dedicated Skill tool.** If the runtime says no independent Skill tool is available, ShipFlow must resolve and read the installed upstream `SKILL.md` files and execute them. It must NOT say it will "follow the same checks itself" or use remembered summaries.
7. **Regression: narrow-fix shortcut.** When ShipFlow is explicitly triggered for a small bugfix, it must not skip `grill-with-docs`, `to-spec`, or `to-tickets` merely because the change appears narrow.
8. **Nested dependency resolution.** When an upstream skill references `grilling`, `domain-modeling`, `tdd`, or `code-review`, ShipFlow must resolve the installed dependency using the same native-load-or-read-file protocol rather than reproducing it locally.
9. **Fail closed on missing runtime capability.** If an upstream instruction requires a capability that cannot be provided (for example an isolated/parallel sub-agent required by that upstream skill), ShipFlow must report the gap instead of claiming an improvised same-context substitute is equivalent.
10. **Installed upstream wins.** If ShipFlow wording conflicts with the currently installed Matt Pocock skill, the installed upstream `SKILL.md` takes precedence.
11. **Installer regression: Matt-only install is a failure.** For a Codex project install, the installer must not report success unless `.agents/skills/shipflow/SKILL.md` exists or the skills CLI independently confirms `shipflow` is installed.
12. **Installer regression: no repository-discovery dependency for ShipFlow.** Install the ShipFlow orchestrator from its direct `SKILL.md` download URL; do not require `owner/repo` discovery to find the single skill.
13. **Installer regression: stale raw installer.** Public one-click commands should use a cache-busting query string so users behind caching proxies do not repeatedly execute an older `install.sh`.
