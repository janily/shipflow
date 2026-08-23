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
11. **Installer invariant: absolute project root.** Project-level destination paths must be derived from the captured startup working directory, not from a later child-process working directory.
12. **Installer invariant: ShipFlow first.** ShipFlow must be installed and verified before invoking Matt's multi-skill installer, so an upstream CLI failure cannot silently prevent ShipFlow from being attempted.
13. **Installer invariant: official direct-download copy path.** ShipFlow should first use `skills add <SKILL.md URL> --copy`, matching the official direct-download installation path.
14. **Installer invariant: deterministic fallback.** If the CLI exits non-zero or returns without creating the expected file, the installer must download the validated `SKILL.md` directly into the agent's standard skill directory.
15. **Installer invariant: Codex path.** A project-level Codex installation is successful only when `.agents/skills/shipflow/SKILL.md` exists, is non-empty, and contains `name: shipflow`.
16. **Installer invariant: post-upstream verification.** After Matt's skills are installed, ShipFlow must be checked again and restored if it disappeared.
17. **Installer invariant: visible final state.** The installer must print the final skill root and discovered `SKILL.md` files before reporting success.
18. **Installer invariant: fail closed.** A failed CLI install plus failed fallback, invalid frontmatter, or missing final file must produce a non-zero exit.
19. **Installer regression: stale installer.** Public one-click examples should use GitHub's Contents API for `install.sh` instead of relying on a potentially stale Raw CDN response.
