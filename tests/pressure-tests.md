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
11. **Installer invariant: exact target root.** Project-level Codex and Cursor installs target `.agents/skills`; Claude Code targets `.claude/skills`; global installs use the documented user-level roots.
12. **Installer invariant: current upstream source.** Every install downloads the current `mattpocock/skills` source archive rather than embedding Matt's skill bodies in ShipFlow.
13. **Installer invariant: exact name resolution.** Each required upstream skill is located by an exact `name:` match in its `SKILL.md`; zero or multiple matches must fail the install.
14. **Installer invariant: preserve upstream directory.** Installing a Matt skill copies its complete source directory, not just `SKILL.md`, so references/scripts/agent metadata are preserved.
15. **Installer invariant: required upstream set.** Installation must produce `setup-matt-pocock-skills`, `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `implement`, `tdd`, and `code-review`.
16. **Installer invariant: ShipFlow included.** The same installation must also produce `shipflow` in the same target skill root.
17. **Installer invariant: frontmatter verification.** All 10 installed skills must have a non-empty `SKILL.md` whose `name:` matches the destination skill name.
18. **Installer invariant: no partial success.** Missing Matt skills or missing ShipFlow must result in a non-zero exit; the installer must never report success for a partial set.
19. **Installer invariant: visible final state.** The installer must print the final skill root and installed `SKILL.md` paths before reporting success.
20. **Installer regression: no npm/skills CLI dependency.** The one-click installer must not depend on `npx skills` behavior to create the final filesystem state.
21. **Installer regression: stale installer.** Public one-click examples fetch `install.sh` through GitHub's Contents API rather than relying on a potentially stale Raw CDN response.
