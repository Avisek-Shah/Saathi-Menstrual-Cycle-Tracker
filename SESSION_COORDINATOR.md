# SESSION COORDINATOR — Saathi

Read this and `CLAUDE.md` + `REQUIREMENTS.md` + `BUILD_PLAN.md` before touching code.
Last updated: 2026-08-31.

## 1. Ground truth

- Working directory: `e:\saathi` (spec files and `src/` both at repo root).
- Branch: `main`. Remote `origin`: https://github.com/Avisek-Shah/Saathi-Menstrual-Cycle-Tracker.git
- Commits: `fe05b6c "first commit"` (pushed) + a large **uncommitted** fix pass in the working tree (see §3). Nothing from the fix pass is committed yet — review the diff before committing.
- expo-router routes live at `src/app/` (per §13). There is no root `app/`, no `App.tsx`.
- Entry point: `package.json` `main` = `expo-router/entry`.

## 2. Work rules (from CLAUDE.md / BUILD_PLAN)

- One milestone at a time. Do not start M(n+1) until M(n) is committed and its checklist passes.
- No new app dependencies beyond REQUIREMENTS §2 without asking. No network calls except the Expo updates check.
- TypeScript strict: no `any`, no `@ts-ignore`, no `!` to silence the compiler.
- `src/core/*` pure: no DB, no React, no current-time reads — pass `today` in.
- All user-facing strings in `src/i18n/en.ts`. All SQL only in `src/db/repositories/`.
- Never store a BS date. Never auto-log a period the user did not enter.
- Every spec assumption: `// SPEC:` comment at the point of decision + a dated block in `DECISIONS.md`.
- Sensitive areas (flag, do not guess): irregular-cycle wording (§5.6), fertile disclaimer (§6.2), notification copy (§7), PIN storage / no-recovery warning (§8), anything leaving the device.

## 3. Milestone status

| M | Scope | Status |
|---|---|---|
| M0 | Scaffold: Expo + TS + expo-router + theme + tab shell | Routing fixed, `src/app/` layout, theme tokens (`colors`/`typography`/`spacing`), `babel.config.js` added. **Not done:** ESLint + Prettier + `npm run lint` (needs `npm install`), tab-bar icons. |
| M1 | DB: client, schema, migration runner, repositories, seed | `client.ts` (memoised, single migration path), `migrate.ts` (one runner), repos `dailyLogs` / `periods` / `settings` (typed, §4.3 defaults), `scripts/seed.ts` (3 §14 fixtures via repos). **Not done:** throwaway row-count screen; repo integration tests (need an expo-sqlite mock). |
| M2 | Engine: `dates.ts`, `periods.ts`, `prediction.ts` — pure + tested | Rewritten per §5. `npx tsc --noEmit` clean. `npx jest` = 44 tests passing across the §14 boundary list. |
| M3 | Onboarding (5 steps, write settings + seed logs, gate) | Not started. `src/app/onboarding/index.tsx` is a placeholder; the `_layout.tsx` redirect gate is a TODO comment. |
| M4–M9 | Home+logging / Calendar / Insights / Settings+notifs+PIN / Learn / hardening | Not started. Screens are i18n-wired placeholders. |

## 4. Known gaps / follow-ups

- `npm install` must be run (reconciles the dependency changes: `babel-preset-expo` + babel/jest tooling added, `react-dom` + `react-native-web` removed). Done once already in this environment via `--offline`.
- `app.json`: `android.package` / `ios.bundleIdentifier` are still `com.yourname.saathi`. Set the real, permanent id **before** the first `eas build` (BUILD_PLAN R2 — a later rename means every sideload user loses all data).
- `src/content/articles/article-5.md`: reworded to drop "standard deviation" (§6.6 tone). Touches §5.6 wording — needs human sign-off (BUILD_PLAN M8 says write article 5 by hand).
- No `calendar.ts` yet (M5) — its §14 AD↔BS tests come with that milestone.

## 5. Next action

Review the working-tree diff, run `npx tsc --noEmit` and `npx jest`, then commit M0/M1/M2 as separate commits. After that, start M3 per the CLAUDE.md working method (list files + ambiguities + assumptions, wait for confirmation).
