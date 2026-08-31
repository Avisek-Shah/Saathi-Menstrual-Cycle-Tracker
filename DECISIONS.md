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
