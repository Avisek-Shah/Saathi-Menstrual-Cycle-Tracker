# Decision log

Every departure from `REQUIREMENTS.md`, and every assumption made where the spec was silent, gets one entry here. Newest first.

Format:

```
## YYYY-MM-DD — short title
**Spec section:** §x.y (or "unspecified")
**Decision:** what was done
**Reason:** why
**Reversible?** yes / no / costly
```

---

## 2026-08-31 — Routes moved to `src/app/`
**Spec section:** §13
**Decision:** expo-router routes relocated from a root `app/` folder into `src/app/` to match the §13 project structure. Deleted the legacy `App.tsx`, `index.ts`, `index.js`; `package.json` `main` is now `expo-router/entry`. Deleted `app/index.tsx` (a redirect to a non-existent `/home` that also collided with `(tabs)/index`).
**Reason:** §13 places routes at `src/app/`. The root `App.tsx` + `registerRootComponent` entry is the bare-RN template pattern and is wrong for expo-router — nothing mounted the router.
**Reversible?** yes

## 2026-08-31 — Population standard deviation for irregularity
**Spec section:** §5.5
**Decision:** `standardDeviation` in `prediction.ts` divides by N (population), not N−1 (sample).
**Reason:** §5.5 gives the threshold ("> 7 days") but not the estimator. Population SD is deterministic and its maximum-spread bound keeps it consistent with the `max − min ≥ 9` rule. Marked with a `// SPEC:` comment at the function.
**Reversible?** yes

## 2026-08-31 — Cold-start blend for average period length
**Spec section:** §5.4
**Decision:** §5.4 states the 1-cycle blend `round(0.5 × observed + 0.5 × reported)` for cycle length. Period length mirrors it: `round(0.5 × weightedAverage(observed period lengths) + 0.5 × reported_period_length)`.
**Reason:** The table is indexed by "non-outlier cycles available" and says compute period length "the same way", but does not spell out the period-length blend. Marked with a `// SPEC:` comment.
**Reversible?** yes

## 2026-08-31 — `cyclesUsed` capped at 6
**Spec section:** §5.1
**Decision:** `Prediction.cyclesUsed` is `min(non-outlier cycles available, 6)`.
**Reason:** §5.1 calls it "how many real cycles fed the average"; only the most recent 6 are weighted (§5.2), so 6 is the ceiling. Does not affect the §5.4 tier logic (which only cares about ≥ 2 and ≥ 4).
**Reversible?** yes

## 2026-08-31 — `lateState` is a separate exported function, not a `Prediction` field
**Spec section:** §5.1, §5.7
**Decision:** Late-period state (§5.7) is a pure exported `lateState(...)` in `prediction.ts`, returning a discriminated union, rather than new fields on `Prediction`.
**Reason:** §5.1 fixes the `Prediction` shape and must not be extended. §14 still requires the day 1 / day window / day window+1 / day 45 cases to be tested, so the logic must be pure and testable.
**Reversible?** yes

## 2026-08-31 — Dev/test tooling dependencies added
**Spec section:** §2 (hard constraints), BUILD_PLAN M0
**Decision:** Added `babel-preset-expo`, `@babel/core`, `@babel/preset-typescript`, `@babel/plugin-transform-modules-commonjs`, `babel-jest` to devDependencies. Removed `react-dom` and `react-native-web` and the `web` script. Changed `expo-*` ranges from `^` to `~`.
**Reason:** §2 forbids new *runtime/app* dependencies and any data-transmitting SDK; these are build/test tooling. `babel-preset-expo` was only present nested under `expo/` and unresolvable from the root, breaking Metro. `react-native-web`/`react-dom` are not in §2 and web is out of scope (§1, §17). `~` on `expo-*` stops a minor bump from floating off the SDK.
**Reversible?** yes

## 2026-08-31 — `eas.json` reduced to the `preview` profile
**Spec section:** §2, §17, BUILD_PLAN R1
**Decision:** Removed the `production` / `distribution: store` / `app-bundle` profile.
**Reason:** §2 and R1 specify only a `preview` APK profile; §1 says not published to Play Store in v1; §17 lists Play Store release as out of scope.
**Reversible?** yes

## 2026-08-30 — Fertile window disclaimer moved onto the card
**Spec section:** §6.2, §6.7
**Decision:** The "not reliable as birth control" line appears on the fertile window card itself, not only in Settings → About.
**Reason:** The app ships a predicted fertile window based on a fixed 14-day luteal assumption. A disclaimer only in Settings is a disclaimer nobody reads.
**Reversible?** yes

## 2026-08-30 — Core modules use date-fns with date-only strings
**Spec section:** §2, §3
**Decision:** `src/core/*` do all date arithmetic through `src/core/dates.ts`, which wraps `date-fns` and works entirely in `YYYY-MM-DD` local-time strings. Functions never read the current time — `today` is passed in.
**Reason:** §2 lists date-fns; §3 requires local-time, date-only arithmetic and forbids storing anything but Gregorian date strings. CLAUDE.md rule 7 forbids `new Date()` inside core functions.
**Reversible?** yes

## 2026-08-31 — M5 Calendar / §6.3, §9, §11.2 / Spec sections / BS grid re-grids to Nepal month lengths (29–32) via dateConfigMap positional indexing (library keys "Asar" differ from §9 "Ashadh"). / Reason: `yearConfig["Ashadh"]` undefined; `Object.values` ordered Baisakh→Chaitra fixes. / Reversible? yes — swap back to name-key when library aligns.
## 2026-08-31 — M5 Calendar renderBsPattern / §9 transliteration / Single-pass regex `replace` instead of chained `.replace()`. / Reason: month names "Ashadh"/"Mangsir" contain `d`; chained `d→date` would corrupt them. / Reversible? yes.
## 2026-08-31 — M5 Calendar MonthGrid BS label / §9 display layer / `label` prop on `DayCell` passes `NepaliDate.fromAD(...).getBS().date`; grid never relabels Gregorian month. / Reason: avoids relabelling trap. / Reversible? yes.

## 2026-08-31 — M10 UX pass adds no new dependency
**Spec section:** §2
**Decision:** Safe areas, gestures, motion, and the cycle ring use `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-svg`, all already in `package.json`. A native date picker (`@react-native-community/datetimepicker`) was considered for the onboarding date step and rejected; the in-app month grid is built from the existing `getMonthGrid`.
**Reason:** CLAUDE.md rule 3 forbids dependencies outside §2 without asking. Adding one for a date picker would also mean a new APK rather than an OTA update, for a control the app can already draw.
**Reversible?** yes

## 2026-08-31 — Three new settings keys for the UX pass
**Spec section:** §4.3
**Decision:** Added `onboarding_seed_range` (JSON `{start,end}`), `log_explainer_seen` (boolean), and `quick_log_enabled` (boolean, default true).
**Reason:** Editing the last period start date later needs to know exactly which days onboarding seeded, otherwise it cannot tell the app's flow entries from the user's. The other two gate the one-time log explainer and let a user hide the Home quick-log row.
**Reversible?** yes — `schema_version` stays 1; unknown keys already fall back to defaults in `getSettings`.

## 2026-08-31 — Re-seed rule for a changed last-period date
**Spec section:** §6.7, §10.10
**Decision:** Changing the anchor clears flow only on days inside `onboarding_seed_range` that carry no mood, symptom, or note, then seeds the new range and recomputes. It confirms before writing.
**Reason:** The alternative — clearing the whole old period range — would delete flow the user entered by hand. Rule 10 ("never auto-log a period the user did not enter") is preserved: the seed is her own onboarding answer being corrected, behind an explicit confirmation.
**Reversible?** yes

## 2026-08-31 — Journal lives inside Insights, not a fifth tab
**Spec section:** §6.5, §6
**Decision:** The journal timeline is a fourth card in Insights, below cycle history. The tab bar stays at four tabs.
**Reason:** §6 fixes the tab set at Home · Calendar · Insights · Settings. A fifth tab narrows every other target on a small phone, and the journal is a review surface, which is what Insights already is.
**Reversible?** yes

## 2026-08-31 — One shared screen wrapper owns safe areas
**Spec section:** §11.6
**Decision:** Every screen renders through `src/components/ui/Screen.tsx`, which applies `useSafeAreaInsets()`. Screens do not apply insets themselves.
**Reason:** The unreachable onboarding Next button came from per-screen padding with no inset awareness. One wrapper makes the failure impossible to reintroduce screen by screen, and makes the tab-bar and modal inset rules a single edit.
**Reversible?** yes

## 2026-08-31 — Log modal reframed without touching the enums
**Spec section:** §6.4, §4.2
**Decision:** Flow becomes the primary control; mood, symptoms, and note move behind an "Add more" disclosure; a one-time explainer states what logging affects. The `Mood` and `Symptom` enums are unchanged, and every value stays reachable.
**Reason:** The confusion reported was about what logging is *for*, not about which symptoms exist. Trimming the taxonomy would have made old rows unreadable and lost data the user already entered.
**Reversible?** yes

## 2026-08-31 — Calendar opening month is derived, never constant
**Spec section:** §6.3
**Decision:** The calendar computes its opening month from `today` through `currentBsYear`/`currentBsMonth` (BS) or `date-fns` (AD). The hardcoded `2083/5` and `2026/8` constants are removed, along with the hardcoded "current BS month" used for the current + 3 cap.
**Reason:** With a constant, BS mode opened on the wrong month, today's ring was never on screen, and the forward cap was wrong. Every later month calculation inherited the error.
**Reversible?** no — the constants were a defect, not a choice.

## 2026-08-31 — Three numeric choices §6.2/§6.5 left unspecified
**Spec section:** §6.2, §6.5
**Decision:** The quick-log flow chip sets `medium` specifically (`core/quickLog.ts`); the recent-symptom sample for ranking is the last 30 days (`app/(tabs)/index.tsx`); the journal page size is 20 rows (`app/(tabs)/insights.tsx`).
**Reason:** §6.2 names "the flow level" and "most-used recent symptoms" without a value or window; §6.5 says the journal "loads a page at a time" without a size. Picked the simplest defensible number in each case — a representative flow level, one cycle's worth of history, a few weeks per page — and marked each at its `// SPEC:` comment.
**Reversible?** yes

## 2026-08-31 — §3 fertile-window day count corrected; algorithm validated against medical sources
**Spec section:** §3, §5.2, §5.5
**Decision:** Fixed a documentation-only bug: §3 described the fertile window (ovulation−5 … ovulation+1) as "6 days inclusive"; the correct count is 7, and `core/prediction.ts` was already computing 7 — only the prose was wrong. Researched the underlying numbers against medical sources before touching anything: 14-day luteal assumption matches Cleveland Clinic/Mayo Clinic Press; the 7-day fertile window matches Hopkins Medicine's consumer guidance (ASRM's stricter clinical figure is 6 days, ending at ovulation — both exist in the literature, kept the 7-day one already in code); the §5.5 irregularity thresholds (sd>7, range≥9) already match ACOG's own "varies by more than 7 to 9 days" definition. Added citations inline in §3/§5.5. No algorithm values changed — the existing numbers were already authentic, not guessed.
**Reason:** User asked that predictions be verified against real medical guidance, not assumed. Per CLAUDE.md rule 1, flagged the discrepancy and confirmed with the user before editing rather than silently rewriting the spec.
**Reversible?** yes — corrects a description to match already-shipped, now-verified behaviour; no user-facing number changed.

## 2026-08-31 — Cycle overview card added to Insights (§6.5)
**Spec section:** §6.5
**Decision:** New `CycleOverviewCard` at the top of Insights showing last period, next period, ovulation, and fertile window together, sourced from the same `Period[]`/`Prediction` Home already uses — no new calculation. Placed in Insights (not a new Home card, not a full Insights-as-dashboard redesign) per the user's explicit choice between the three options offered.
**Reason:** User's stated goal for the app is that last/next period, fertile window, ovulation, and cycle stats be clearly visible in one place; before this, ovulation date and last-period dates existed nowhere as an explicit line, only implied across Home's status card and the fertile card.
**Reversible?** yes

## 2026-08-31 — Calendar month-nav buttons redone as `MonthNavButton`
**Spec section:** §6.3, §11.6
**Decision:** The prev/next month controls (calendar tab and the onboarding/profile date picker) are now a filled circular button with a border and shadow, not a bare small glyph on the background. Extracted as a shared `components/ui/MonthNavButton.tsx` so both surfaces match.
**Reason:** User reported the controls read as too small/unclear to be buttons on a real device, despite already meeting the 44×44 touch-target minimum — the touch target was fine, the visual affordance was not.
**Reversible?** yes

## 2026-08-31 — BUILD_PLAN corrected: M6, M7, M8 are not built
**Spec section:** BUILD_PLAN §6b
**Decision:** Recorded in BUILD_PLAN that Insights charts (M6), the notification/PIN/export services (M7), and five of the six Learn articles (M8) do not exist in the repository despite commits describing them as complete. Settings rows for unbuilt features render disabled.
**Reason:** The plan asserted work that the tree does not contain, and §15 acceptance depends on it. A disabled row is honest; a row that silently does nothing is not.
**Reversible?** no — this is a correction of the record.
