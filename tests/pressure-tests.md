# ShipFlow contract tests

## Distribution

1. The repository root must not contain `SKILL.md`; all installable skills live under `skills/<name>/` so `skills` CLI scans the repository as a multi-skill bundle.
2. The repository must not require a custom `install.sh`; the public installation path is `npx skills@latest add janily/shipflow --skill '*' ...`.
3. The bundle contains exactly the ShipFlow-owned `shipflow` skill plus the nine required Matt Pocock workflow skills.
4. Every mirrored Matt skill directory must be byte-for-byte identical to `mattpocock/skills` at the commit recorded in `UPSTREAM_COMMIT`, including supporting files such as `agents/` and reference documents.
5. `MATT_LICENSE` must match the pinned upstream license.
6. `npx skills@latest add . --list` must discover the bundle without relying on hidden installer behavior.

## Autonomous ShipFlow

7. `/shipflow <goal>` is autonomous by default; it does not merely print the next Matt command.
8. The main-branch workflow must not require an external `shipflow run` executable, Node Runner, `npm link`, or custom installer.
9. Normal autonomous use must not require the user to manually invoke `grill-with-docs`, `to-spec`, `to-tickets`, `implement`, or `code-review`.
10. Matt's installed skills remain the source of truth. ShipFlow must not copy, paraphrase, or emulate their engineering instructions.
11. Every user-invoked Matt stage is started as an explicit top-level skill task inside its own appropriate agent/session boundary.
12. After repository setup and before feature planning, ShipFlow pins one Git fixed point for the whole-feature final review.
13. `grill-with-docs`, `to-spec`, and `to-tickets` share one isolated planning context so agreed planning context is preserved through ticket publication.
14. The planning context is not reused for implementation. Only durable goal/fixed-point/spec/ticket/repository references cross the boundary.
15. Every implementation ticket starts in a genuinely fresh agent/session context and invokes upstream `implement` as the top-level task.
16. Upstream `implement` owns TDD, verification, its per-ticket `code-review`, and commit behavior; ShipFlow does not create parallel home-grown implementation rules.
17. All tickets being complete is not sufficient for ShipFlow completion.
18. After all required tickets complete, ShipFlow creates a new independent final-review context whose top-level task is upstream `code-review` with the original feature fixed point and originating spec reference.
19. Final `code-review` preserves upstream's separate Standards and Spec axes; ShipFlow must not replace, merge, or paraphrase that review method.
20. A concrete spec miss/wrong behavior or hard documented-standard violation from final review blocks ShipFlow completion.
21. Blocking final-review findings are repaired through a fresh upstream `implement` context using the relevant ticket/spec reference plus review feedback, then reviewed again in another fresh final-review context.
22. Every final-review retry uses the same original feature fixed point so review scope cannot shrink after repair commits.
23. A baseline smell finding labelled as a judgement call does not automatically block completion unless upstream review identifies a concrete required change.
24. ShipFlow reports `COMPLETE` only after the final whole-feature `code-review` has no blocking findings.
25. Human questions from any upstream stage are surfaced to the user and the answer is returned to the same active stage automatically; the user does not need to type another workflow command.
26. On Codex, ShipFlow prefers native multi-agent capabilities and may fall back to native `codex exec` / `codex exec resume` sessions; neither path is a separate ShipFlow Runner product dependency.
27. Codex CLI fallback must preserve normal user configuration and must not use `--ephemeral` for a session that may need resume.
28. The final review on Codex CLI fallback uses a brand-new `codex exec` session rather than resuming an implementation session.
29. If the runtime cannot provide a genuinely isolated planning, implementation, or final-review context, ShipFlow fails closed instead of claiming that one long conversation is a fresh context.
30. Re-invoking `/shipflow` inspects durable upstream artifacts and skips completed stages rather than replaying work just to reconstruct model context.
31. If tickets are complete but the current completed HEAD has no valid final review against the pinned fixed point, resume starts at final review rather than reporting completion.
32. Guided/manual mode exists only when the user explicitly requests it.
