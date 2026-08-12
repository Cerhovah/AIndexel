# WorkIndex v0.1 — Shared Agent Rules (Codex & Claude Code)

## Source of truth
docs/PRODUCT_SPEC.md is the ONLY source of requirements.
If code and spec disagree, the spec wins. If the spec is ambiguous, STOP and ask the human. Never guess.

## Scope
- Implement only what is needed to pass AC01–AC15 (spec §12).
- NEVER add anything from the frozen list (spec §2.2), even as a "small improvement".
- Do not invent features, screens, options, or dependencies.

## Stack (fixed)
- Frontend: vanilla HTML/CSS/JS, ES modules, zero runtime dependencies, no frameworks, no build step, no CDN scripts.
- Server: one Cloudflare Worker in worker/ (index.js, prompt.js, validate.js).
- Tests: Node built-in runner only (`npm test` → `node --test tests/`). No test frameworks.

## File responsibilities (fixed — spec §9)
- Do not move logic across files. UI code must never touch IndexedDB directly (only via src/db.js).
- src/search.js and worker/validate.js must stay pure (no DOM, no DB, no fetch).

## Secrets & privacy
- Never write MODEL_API_KEY or APP_TOKEN into any tracked file. Local secrets live only in worker/.dev.vars (gitignored).
- Never console.log raw_text or model responses in the Worker.

## Fact-safety
- Never weaken the anti-fabrication rules in worker/prompt.js.
- Any change to the prompt bumps PROMPT_VERSION; any change to the schema bumps SCHEMA_VERSION.

## Error invariant
- On ANY analyze failure, the user's pasted text must remain in the textarea (AC10).

## Workflow (every task)
1. Name the acceptance criterion / spec section you are satisfying.
2. Make the smallest change that satisfies it.
3. Run `npm test`.
4. Report: files changed, AC satisfied, test result. Then stop.

## Commits
At least one commit per milestone, message format: `M<n>: <what>`.