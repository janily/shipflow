# Orchestrator contract tests

1. A rough feature request must execute the installed upstream `grill-with-docs`; the orchestrator must not invent its own questionnaire.
2. If an upstream dependency is missing, the orchestrator must stop rather than emulate it.
3. An unconfigured repo must use the installed upstream `setup-matt-pocock-skills`; Local Markdown must follow the upstream tracker conventions.
4. Upstream confirmation questions must still reach the user; after the answer, the orchestrator resumes the same stage and then continues the chain automatically.
5. Review must come from Matt's installed upstream `code-review`; the orchestrator must not add a custom review rubric or severity model.
6. **Regression: runtime without a dedicated Skill tool.** If the runtime says no independent Skill tool is available, ShipFlow must resolve and read the installed upstream `SKILL.md` files and execute them. It must NOT say it will "follow the same checks itself" or use remembered summaries.
7. **Regression: narrow-fix shortcut.** When ShipFlow is explicitly triggered for a small bugfix, it must not skip `grill-with-docs`, `to-spec`, or `to-tickets` merely because the change appears narrow.
8. **Nested dependency resolution.** When an upstream skill references `grilling`, `domain-modeling`, `tdd`, or `code-review`, ShipFlow must resolve the installed dependency using the same native-load-or-read-file protocol rather than reproducing it locally.
9. **Fail closed on missing runtime capability.** If an upstream instruction requires a capability that cannot be provided, ShipFlow must report the gap instead of claiming an improvised substitute is equivalent.
10. **Installed upstream wins.** If ShipFlow wording conflicts with the currently installed Matt Pocock skill, the installed upstream `SKILL.md` takes precedence.
11. **Installer invariant: Codex path.** A project-level Codex installation is successful only when `.agents/skills/shipflow/SKILL.md` exists and is non-empty.
12. **Installer invariant: no CLI dependency for ShipFlow itself.** The installer may use `skills` CLI for Matt's multi-skill repository, but ShipFlow's own single `SKILL.md` must be downloaded and written directly to the target agent skill directory.
13. **Installer invariant: validate before copy.** The downloaded file must contain `name: shipflow` in frontmatter before it replaces the installed file.
14. **Installer invariant: fail closed.** A failed download, invalid frontmatter, missing destination file, or invalid installed file must cause a non-zero installer exit.
15. **Installer regression: stale raw installer.** Public one-click commands should use a cache-busting query string so users behind caching proxies do not repeatedly execute an older `install.sh`.
