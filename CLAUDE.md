# Rules for this repository

`REQUIREMENTS.md` is the specification. `BUILD_PLAN.md` is the order of work. Read both before starting anything.

## Non-negotiable

1. **REQUIREMENTS.md is the specification.** Do not deviate from it. If you believe it is wrong, stop and say so — do not silently improve it.
2. **Work one milestone at a time.** Do not start M(n+1) until M(n) is committed and its checklist passes.
3. **No new dependencies** beyond those listed in REQUIREMENTS.md §2 without asking first.
4. **No network calls anywhere** except the Expo updates check. No analytics, no crash reporting, no telemetry, no font CDN, no remote images.
5. **No SQL outside `src/db/repositories/`.**
6. **No user-facing string literals in components** — all strings go in `src/i18n/en.ts`.
7. **`src/core/*.ts` must be pure:** no DB access, no React, no `new Date()` inside functions. Pass `today` in as a parameter.
8. **TypeScript strict.** No `any`. No `@ts-ignore`. No non-null assertions to silence the compiler.
9. **Never store a Bikram Sambat date.** BS is display-layer only.
10. **Never auto-log a period the user did not enter.**

## Working method

Before writing code for a milestone, respond with:

- The list of files you will create or modify
- Any ambiguity you found in the spec sections involved
- Any assumption you intend to make

Then wait for confirmation.

After finishing a milestone, report:

- What you built
- What you did **not** finish
- Any `// SPEC:` assumptions you added
- Test and lint results

## Assumptions

Where the spec is silent, prefer fewer dependencies, simpler state, and behaviour that fails visibly rather than silently. Mark the decision with a `// SPEC:` comment at the point in the code where you made it, and add a dated line to `DECISIONS.md`.

## Things that look like bugs but are not

- Two periods with a 1–2 day gap merging into one — this is §4.5 behaviour.
- A cycle of 50 days showing in history but not affecting the average — this is §5.3 outlier exclusion.
- The fertile window card showing a disclaimer even for a high-confidence user — this line is permanent by design (§6.2).
- Notification text that never mentions periods — this is the privacy requirement (§7), not vague copy.

## Sensitive areas — flag, don't guess

If a change touches any of these, stop and ask rather than deciding:

- The wording of anything shown when cycles are irregular (§5.6)
- The fertile window disclaimer text (§6.2)
- Notification title or body text (§7)
- PIN storage or the no-recovery warning (§8)
- Anything that would send data off the device
