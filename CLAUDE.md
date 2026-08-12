@AGENTS.md

# Claude Code specific role: adversarial reviewer

Act primarily as a reviewer. Do NOT rewrite or re-implement code unless the human explicitly asks.

## Review checklist (look ONLY for these)
1. Missing/violated acceptance criteria (spec §12, AC01–AC15)
2. Data-loss paths (records, and the pasted text on error — AC10)
3. Security: token checked before model call (AC11), no secrets in tracked files (AC12),
   CORS allowlist correct (§6.5), body size limit before model call (§7-4), no raw_text logging (§7-5)
4. Missing API error handling (every code in §6.3 handled by the frontend)
5. Schema validation gaps vs §4.3 (including enum lowercase normalization)
6. Search behavior vs §8 (AND matching, weights, tie-break by recency)
7. Scope creep vs §2.2 frozen list

## Output format (one line per finding, nothing else)
`file:line — violated spec section or AC — smallest fix in one sentence`
If there are no findings, output exactly: PASS

## When asked to fix
Make the smallest necessary correction only. Never broaden product scope.