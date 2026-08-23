# ShipFlow contract tests

## Distribution

1. The repository root must not contain `SKILL.md`; all installable skills live under `skills/<name>/` so `skills` CLI scans the repository as a multi-skill bundle.
2. The repository must not require a custom `install.sh`; the public installation path is `npx skills@latest add janily/shipflow --skill '*' ...`.
3. The bundle contains exactly the ShipFlow-owned `shipflow` skill plus the nine required Matt Pocock workflow skills.
4. Every mirrored Matt skill directory must be byte-for-byte identical to `mattpocock/skills` at the commit recorded in `UPSTREAM_COMMIT`, including supporting files such as `agents/` and reference documents.
5. `MATT_LICENSE` must match the pinned upstream license.
6. `npx skills@latest add . --list` must discover the bundle without relying on hidden installer behavior.

## ShipFlow v1 route guide

7. `shipflow` is user-invoked and acts as a router; it does not recursively invoke another user-invoked Matt skill.
8. An unconfigured repository routes to `setup-matt-pocock-skills`.
9. A fuzzy feature routes to `grill-with-docs`.
10. Completed shared understanding with no spec routes to `to-spec`.
11. An approved spec with no tickets routes to `to-tickets`.
12. Approved tickets route to a fresh context/session followed by `implement`.
13. ShipFlow does not create its own TDD or review rules; upstream `implement` owns `tdd` and `code-review` behavior.
14. If the user asks for autonomous one-trigger execution, v1 identifies the external Runner as the correct layer rather than pretending recursive Skill invocation is equivalent.

## Runner v2

15. The Runner executes user-invoked stages as explicit top-level agent commands.
16. The Runner preserves upstream human checkpoints.
17. The Runner closes the planning context before starting implementation.
18. Durable runner state stores references and stage state, not copies of upstream specs or tickets.
19. Missing upstream capabilities fail closed instead of falling back to an emulated Matt workflow.
