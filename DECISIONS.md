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

## 2026-09-06 — `SAATHI_UIUX_SPEC.md` adopted as the UI/UX authority

**Spec section:** REQUIREMENTS §0 (document precedence); CLAUDE.md rule 1
**Decision:** `SAATHI_UIUX_SPEC.md` — a review-and-rebuild spec for the shipped surface — now governs all screen layout, cycle visualization, colour, user-facing copy, and interaction detail. REQUIREMENTS.md stays authoritative for the domain rules (§3), the data model (§4), the prediction engine (§5 — the UI/UX spec §1 explicitly affirms the engine is correct and is left untouched), notification copy (§7), the PIN (§8), and the BS calendar (§9). Where the two disagree on UI, the UI/UX spec wins. REQUIREMENTS §0/§5.7/§6.2/§11.1/§11.2/§11.5/§16 and BUILD_PLAN §6c were updated to match. The UI/UX spec §13 build order becomes M11–M13.
**Reason:** User instruction 2026-09-06 ("UIUX spec wins; rewrite the rest"), after the conflicts with REQUIREMENTS.md, the CLAUDE.md sensitive-areas list, and prior decisions were enumerated.
**Reversible?** costly — three milestones of UI work follow from it.

## 2026-09-06 — Home ring reverted to cycle-relative, numerals removed

**Spec section:** UI/UX spec §2.2, §2.3, §2.9, §14; supersedes the 2026-09-05 "Home status card replaced with the SVG cycle-day ring", 2026-09-05 "Ring gets per-day numbers", 2026-09-06 "Home ring switched from a last-period cycle to the current calendar month", 2026-09-06 "Cycle-ring round end-caps no longer overshoot", and 2026-09-06 "Ring's predicted-period arc keeps the soft pink" entries
**Decision:** The ring is cycle-relative again: day 1 at 12 o'clock = first day of the current cycle, length = `avgCycleLength`, drawn as a phase band (menstruation / fertile / neutral luteal remainder) + a single ovulation notch + a thin inner elapsed stroke + a today-marker with a background-coloured halo. No day-of-month numbers, no cycle-day numbers, no numerals on the rim — four subtle ticks only (day 1 + phase boundaries). `monthRingDays()` / `currentMonthFor()` in `core/home.ts` / `core/calendar.ts` are replaced by `cycleRingDays()`. Predicted arcs get feathered `linearGradient` ends; the calendar-month layout is gone from Home.
**Reason:** UI/UX spec §2.2 ("cycle-relative, never calendar-synced") and §2.9 ("day numbers 1–30 on the rim — root cause of the current ambiguity"). The 2026-09-06 calendar-month ring was built to a user request that the UI/UX spec review identifies as the core comprehension bug (its §1 items 1–3).
**Reversible?** yes — `cycleRingDays()` is a drop-in swap at one call site; the superseded functions are in git history.

## 2026-09-06 — Fertility palette moved to the blue-violet axis

**Spec section:** REQUIREMENTS §11.2, UI/UX spec §2.8; supersedes the 2026-08-31 "Calendar highlight colours darkened; ovulation gets its own solid fill" entry
**Decision:** `fertile` / `fertileMuted` / `ovulation` / `ovulationFill` (teal-green family) are replaced by `fertile` `#8B9DE8` and `ovulation` `#4A5BAF` (periwinkle / indigo). `primary` becomes an alias of `periodLogged` `#D64C6E`. `periodPredicted` `#F2A9BC`, `neutralTrack` `#E8E1E3`, and `todayMarker` `#1F1A1C` are added. Dark-column values are defined for every token but not yet wired (M13). A two-signal texture/glyph grammar is added — dashed border + droplet-outline on predicted period, diamond on ovulation, dot on logged-no-flow — plus a `color_blind_mode` monochrome scheme. Any value failing its own §2.8 contrast bar is darkened minimally within-hue and recorded here.
**Reason:** UI/UX spec §2.8 — "the current pink-vs-green palette collapses under deuteranopia (~8% of males)". User chose "adopt UIUX blue-violet palette + CB toggle" on 2026-09-06.
**Reversible?** yes — token values only; no schema or algorithm change.

## 2026-09-06 — 14-day linear strip replaces WeekStrip on Home; three stat cards deleted

**Spec section:** UI/UX spec §2.6, §3; supersedes the 2026-09-05 "Ring gets per-day numbers; `WeekStrip` removed from Home" entry (the WeekStrip-removal half)
**Decision:** A horizontally-scrollable 14-day strip (today at ~35% from the left, one status glyph + a log dot per column, tap opens that day's log sheet) sits directly beneath the ring, restoring in a new form the one-tap "log a day other than today" affordance the 2026-09-05 change removed. The three Home stat cards (`MiniStatCard` — cycle day / next period / ovulation) are deleted: cycle day is the ring eyebrow, next period is the hero, ovulation is on the ring and strip. Insights → Cycle overview stays the single place all values are listed together.
**Reason:** UI/UX spec §3 ("Delete the three stat cards … a third redundant encoding") and §2.6 ("This is where dates live — it makes the ring's abstraction safe").
**Reversible?** yes — `MiniStatCard.tsx` and the old `WeekStrip.tsx` are in git history.

## 2026-09-06 — Late-period model unified; day-45 recalc card retired (A1)

**Spec section:** REQUIREMENTS §5.7, UI/UX spec §2.5, §2.7 D–E
**Decision:** Late-period state tiers on days past `nextPeriodStart`: 1..`predictionWindow` = "Expected around now" (ring normal); `predictionWindow`+1..7 = "No period logged yet" (marker parks at the day-1 boundary, dashed overflow arc grows daily; a once-only day-2 inline "Did your period start? [Yes, log it] [Not yet]" prompt); 8+ = "Predictions paused until you log your next period." (ring frozen); 60+ days since any logged flow = one re-anchor card "It's been a while. When did your last period start?". The former day-45 `RecalcCard` ("My cycle has changed — recalculate") is removed — the 8-day pause plus the 60-day re-anchor cover it. `lateState()` in `prediction.ts` gains the new tiers; no `Prediction` field changes.
**Reason:** UI/UX spec §2.7 D–E is more specific and more careful than the single §5.7 "N days later than expected" line. User confirmed A1 on 2026-09-06.
**Reversible?** yes — `lateState()` logic and copy keys only.

## 2026-09-06 — Notifications section hidden until M7; app lock stays disabled

**Spec section:** UI/UX spec §7, §13 sprint 1 items 5–6; REQUIREMENTS §7, §8
**Decision:** The four notification toggles (which write settings but schedule nothing — no `services/notifications.ts` exists) are removed from the Settings screen entirely, along with the "Saved now; scheduled reminders arrive with a later update" caption. App lock stays a single disabled row. No new dependencies are added this pass — `expo-notifications`, `expo-secure-store`, and `expo-local-authentication` all stay absent. Local scheduling and the PIN remain M7 scope and are still required for §15 acceptance.
**Reason:** UI/UX spec §7 offers "implement OR hide"; the fake toggles are called out there as "the worst pattern in the app — it silently trains distrust". User chose "hide both until a later pass" on 2026-09-06.
**Reversible?** yes — the toggle rows are in git history; re-adding the dependencies is the real M7 task.

## 2026-09-06 — Seed / re-anchor writes rebuild `periods` once, not once per day

**Spec section:** §4.4 / §4.5 step 6 (derived `periods` rebuild); CLAUDE.md rule 10 (never overwrite the user's own entries)
**Decision:** `useSettingsStore.completeOnboarding` and `changeAnchor` no longer call `dailyLogs.upsert` in a loop. `completeOnboarding` now writes the whole reported-period seed with one `dailyLogs.upsertMany(...)`. `changeAnchor` reads the seed date range once (`getRange`) to carry any existing mood/symptom/note forward, then does `clearFlowForDates(plan.clear)` followed by one `upsertMany(seedEntries)`. `upsertMany` already existed (added in the hardening pass) but had no caller outside `upsert` itself. Final `daily_logs` / `periods` state is byte-identical to the old loop — only the write count changes: `completeOnboarding` goes from N transactions + N full `recomputePeriods()` scans to one of each; `changeAnchor` from `1 + 2N` round-trips and `1 + N` rebuilds to 3 round-trips and 2 rebuilds. Safe because `reseedPlan` guarantees `plan.clear` and `plan.seed` are disjoint, so reading the seed rows before the clear cannot miss a write.
**Reason:** Plan steps 10–11 ("write-path atomicity" / "write-path cost"). A 5-day seed was 5 serial transactions each doing a full-table flow scan and a `DELETE FROM periods` + re-insert; onboarding did this on the critical first-run path.
**Reversible?** yes — revert `useSettingsStore.ts` to the per-day loop; `upsertMany` can stay unused.

## 2026-09-06 — Redundant `article-5.md` copy and stray tracked skill files removed

**Spec section:** unspecified (repo hygiene); REQUIREMENTS §"content" names `src/content/articles/` canonical
**Decision:** Deleted the tracked-but-already-removed `src/content/learn/article-5.md` (a shorter finished draft that duplicated `src/content/articles/article-5.md`); `articles/` is the canonical path per REQUIREMENTS and is the copy kept. Neither file is imported anywhere. The `articles/` copy is still marked DRAFT — its irregular-cycle wording is §5.6 sensitive and is left for a human pass, not touched here. Also `git rm --cached .agents/skills/caveman/{README,SKILL}.md`: they were tracked despite `.gitignore` ignoring `.agents/`, unlike `.claude/skills/` which is deliberately tracked.
**Reason:** Plan Phase 3 documentation / repo-hygiene items.
**Reversible?** yes — both are `git checkout` away; the skill files remain on disk.

## 2026-09-06 — Ring's predicted-period arc keeps the soft pink; calendar's stays near-black

**Spec section:** §11.2 ("predicted period — `primaryMuted` fill") — deviation, ring surface only
**Decision:** `CycleRing.colorForState()` returns a local constant `RING_PREDICTED_FILL = '#F9D4DC'` (the pre-M10 `primaryMuted`) for the `predictedPeriod` state instead of the current `colors.primaryMuted` (`#050505ff`). `textColorForState()` now gives that state a dark number (`colors.text`) instead of white (`colors.onPrimaryMuted`). `colors.primaryMuted` itself is unchanged, so the calendar grid (`DayCell`) still renders the §11.2-mandated darkened fill with white text. Every other ring fill remains the shared token.
**Reason:** `primaryMuted` was darkened to near-black in M10 for *calendar grid-cell* legibility. The Home ring only started showing predicted-period days once it became a full calendar month (same day, entry above) — before that the arc sat past the end of the cycle ring and was never drawn. Against the ring's mint/pink pastel arcs on a pale track the near-black block read as a rendering error; the user asked to restore the previous highlight colour, "just [the] highlight color". Dark text on `#F9D4DC` is ~9.6:1 (WCAG AA pass). The split is deliberate: the two surfaces have different legibility needs and the ring is BUILD_PLAN "visual polish", not a §11.2-enumerated day-cell surface.
**Reversible?** yes — one constant and one branch in `CycleRing.tsx`; delete both to fall back to the shared token.

## 2026-09-06 — Home ring switched from a last-period cycle to the current calendar month

**Spec section:** BUILD_PLAN §"visual polish" ("SVG cycle-day ring"); supersedes the 2026-09-05 "Home status card replaced with the SVG cycle-day ring" and "Ring gets per-day numbers" entries
**Decision:** The Home hero ring no longer draws one cycle of `avgCycleLength` days from the last-period anchor with cycle-day numbers (1..N). It now draws the current calendar month in the active calendar system (AD or BS): one slot per real day of that month, each labelled with its day-of-month, and the period / predicted-period / fertile / ovulation arcs painted on their actual dates. BS months run 29–32 days, so the ring has 29–32 slots in BS mode (this is why the user asked for "32 days"). New pure `monthRingDays()` in `core/home.ts` replaces `cycleRingDays()`; it takes `getMonthGrid(...).cells`, drops the previous/next-month fill cells, and maps each real day through the existing `ringDayState()` precedence. New `currentMonthFor(system, today)` in `core/calendar.ts` returns the (year, month) containing today; the identical screen-local helper in `app/(tabs)/calendar.tsx` was deleted in favour of it. `CycleRing.tsx` no longer wraps its cap logic modulo `days.length` — the last day of a month is not adjacent to the first, so both ends of the arc set are open and get a rounded cap at the 12 o'clock seam. Side effect: today is now always on the ring (it was off-ring for a user more than `avgCycleLength` days past their anchor).
**Reason:** User asked for "the ring of 32 days … sync with calendar days in month" and, when offered a fixed count vs. a month-driven count, chose the current month with the month's own day count.
**Reversible?** yes — `monthRingDays()` is a drop-in swap for `cycleRingDays()` at one call site; the old function is in git history. No data model or stored value touched.

## 2026-09-06 — Cycle-ring round end-caps no longer overshoot onto the neighbouring day number

**Spec section:** unspecified (BUILD_PLAN §"visual polish" — `CycleRing.tsx`; follows the 2026-09-05 ring entries)
**Decision:** In `src/components/charts/CycleRing.tsx` the rounded arc ends were a filled disc of radius `strokeWidth/2` centred *on* the seam between a coloured segment and the empty track. That disc reaches `strokeWidth/2` (~12px) past the seam, and at a 30-day `avgCycleLength` the next day-number's centre is only ~14px past that seam, so the number just outside each arc — 30 and 8 either side of the predicted-period arc, 11 and 19 either side of the fertile arc — got a coloured blob drawn over it. Fix: the butt-capped main stroke is now pulled *in* by `strokeWidth/2` of arc length at every end that borders `none`, and the disc is re-centred that same distance inside the seam so its outer edge stops exactly at the true seam. Same rounded silhouette; nothing crosses the seam. Ends that meet another colour (the fertile → ovulation → fertile joins) are untouched — still flush butt joins, no disc.
**Reason:** User reported dates 30 / 8 / 11 / 19 overlapping the red (predicted-period) and green (fertile) highlights on the Home ring.
**Reversible?** yes — rendering-only change to one component; no data model, no spec value touched.

## 2026-09-06 — Hardening pass: dependency pruning, build config, ESLint, `primaryMuted` text rule

**Spec section:** §2 (dependency list), §11.2 (palette), BUILD_PLAN §8
**Decision:** (1) Removed `expo-notifications`, `expo-secure-store`, and `react-native-gifted-charts` from `package.json` — all three were listed but had no imports in the codebase. Regenerated lockfile. (2) Bumped `android.versionCode` `1 → 2` in `app.json`; added `"appVersionSource": "local"` to `eas.json` so EAS reads version from `app.json` unconditionally. (3) Added ESLint v10 flat config (`eslint.config.js`) with `@typescript-eslint/parser` and Prettier integration; added `"lint": "eslint ."` script. (4) Added `onPrimaryMuted: '#FFFFFF'` token to `colors.ts` and applied it at 5 sites — `DayCell.tsx`, `CycleRing.tsx`, `DaySheet.tsx`, `log/[date].tsx` — where text sat on the near-black `primaryMuted` (#050505ff) background with insufficient contrast. (5) Spiked `noUncheckedIndexedAccess` — 38 errors, reverted; will address with targeted non-null guards if/when the spec requires it.
**Reason:** `primaryMuted` was darkened from #F9D4DC to #050505ff in M10 for calendar legibility (§11.2), but the text-colour rules at 5 rendering sites still assumed a pale background. `colors.text` (#2E2A2C) achieves only 1.1:1 on #050505ff — invisible. `colors.onPrimaryMuted` (#FFFFFF, 21:1) fixes all 5 sites in one token.
**Reversible?** yes — additive token; existing callers of `primaryMuted` that use white already pass through unchanged.

## 2026-09-06 — Video splash removed; `expo-video` dropped

**Spec section:** unspecified (supersedes 2026-09-05 splash entry)
**Decision:** Removed the `AnimatedSplashOverlay` component and all `expo-video` imports from `_layout.tsx`. The video asset `assets/splash_animation.mp4` is deleted. Native splash stays as-is (`#f8e4cd`, `splash-icon.png`). `SplashScreen.hideAsync()` is now called from a `useEffect` that fires once `hydrated` is true.
**Reason:** `expo-video` was imported in `_layout.tsx` and listed in `app.json` plugins, but was absent from `package.json` — `npm ci` (which EAS Build runs) hard-fails on this mismatch. Removing the feature is the correct fix; restoring `expo-video` to `package.json` would reintroduce a user-approved dependency that no longer has a use.
**Reversible?** yes — overlay code lives in git history.

---

## 2026-09-05 — [Superseded] Video splash screen (new dependency), fixed Android launcher icon

**Spec section:** unspecified (splash/launch presentation, §2 dependency list)
**Decision:** Added `expo-video` (user-approved, asked before adding per rule §2 — no network/analytics behavior, purely local asset playback) and swapped `AnimatedSplashOverlay` in `src/app/_layout.tsx` from a Reanimated bloom-fade over `assets/splash-icon.png` to playing `assets/splash_animation.mp4` via `useVideoPlayer`/`VideoView`, fading the overlay out on the player's `playToEnd` event. Separately, `android.adaptiveIcon` in `app.json` was pointing at `assets/android-icon-foreground.png`/`android-icon-background.png`/`android-icon-monochrome.png` — leftover default Expo template assets (the blue arrow logo) never swapped out when `assets/app-icon-period-tracker.png` was added as the real icon. This is why the launcher showed the wrong icon on Android. Fixed by pointing `foregroundImage` directly at `app-icon-period-tracker.png` with a white `backgroundColor`, and deleting the three stale template PNGs.
**Reason:** User supplied a splash video and reported the Android home-screen icon didn't match the app's actual icon.
**Reversible?** yes — `expo-video` is additive and isolated to one overlay component; the icon fix is a config + asset swap with no data model impact.

**Follow-up, same day — launch read as three separate screens.** Three causes, all fixed. (1) `assets/splash-icon.png`, the image the native splash draws, was another leftover Expo template asset (a grey grid with concentric circles), so launch showed a placeholder graphic before the branded clip. Regenerated it from `app-icon-period-tracker.png`: the white disc and drop, circle-masked onto transparency at 512px, so it composites on the splash background with no second nested shape. (2) The native splash was hidden on overlay _mount_, before the player could paint — the mark vanished and a bare background frame sat there until the clip's first frame. It now hides on the player's `statusChange` reaching `readyToPlay` (or `error`), capped at 1500ms. (3) The overlay cross-faded out over 300ms, which blended the clip's last frame with the home screen already mounted underneath and read as two screens stacked; it now cuts. (Note: the claim that both backgrounds were #FBE4CE was incorrect). Added a 4500ms hard cap on the whole overlay so a clip that never reports `playToEnd` cannot strand the user on the splash.

## 2026-09-04 — Fixed batched double-tap skipping past the §6.3 month cap

**Spec section:** §6.3 ("cannot scroll past current month + 3")
**Decision:** `goMonth` in `src/app/(tabs)/calendar.tsx` used to guard forward navigation with `if (delta > 0 && !canNext) return c;`, where `canNext` was a boolean computed once per render from the _outer_ `cursor` state. Two `goMonth(1)` calls landing in the same React batch (a fast double-tap, or a swipe firing right after a button press) both closed over that same stale `canNext`: the first call legitimately advanced `c` to the cap month, the second call re-ran against the real updated `c` but still checked the old (pre-advance) `canNext`, so the guard passed again and the cursor landed one month past the cap. Replaced the check with one computed from `next` — itself derived from the true intermediate `c` inside the updater — compared against `end` (the cap), which is stable per render since it depends only on `today`/`system`, not `cursor`.
**Reason:** User reported the calendar "automatically increases" past the last allowed month. Root cause was the stale-closure guard above, reproducible with a rapid double-tap on the next-month arrow at the cap.
**Reversible?** yes — logic-only change to one function; no data model or spec-cap change.

## 2026-09-04 — Month grid renders explicit 7-column rows instead of `flexWrap`

**Spec section:** §6.3 (month grid), §11.4 (44px minimum touch target)
**Decision:** `MonthGrid` no longer relies on `flexWrap` to break the 42-cell list into weeks. The cells are chunked into six rows of seven, each row a `flexDirection: 'row'` `View`, and both the weekday header and the day cells size their columns to `(width - padding * 2) / 7` from `useWindowDimensions`. `DayCell` gained an optional `size` prop (default `MIN_TOUCH_TARGET`) so the circle can follow the measured column width. Horizontal padding is now computed rather than fixed at `spacing.md`: it shrinks toward 0 before the day cells are allowed to fall under 44px.
**Reason:** The old grid combined `flexWrap` with a hardcoded 44px cell width. Wrapping happens on measured width, so on a 393pt screen the row fit eight cells, not seven — every week was shifted and the day numbers no longer lined up with the S/M/T/W/T/F/S header (Bhadra 19 2083, a Friday, rendered in the Wednesday column). `src/core/calendar.ts` was correct throughout; this was purely a layout bug. The header's `justifyContent: 'space-around'` was separately misaligned from the cells and is now column-aligned to the same width.
**Reversible?** yes — presentation only; no change to `src/core/calendar.ts`, the grid data, or storage.

**Follow-up, same day:** the first version of this fix sized columns as `(windowWidth - padding * 2) / 7`, which ignored the `paddingHorizontal: spacing.lg` that `Screen` already applies. The row came out 32pt wider than its container and hung off the right edge. Columns are now `flex: 1` — they divide whatever container they are given into seven, so no width arithmetic can disagree with the real layout — and the container is measured with `onLayout` purely to pick the circle diameter. `MonthGrid`'s title, grid and legend, and the calendar screen's month-arrow row, dropped their own horizontal padding so every element shares `Screen`'s single inset and lines up on one left edge.

## 2026-09-01 — Version bumped to 1.1.0; `versionCode` left at 1

**Spec section:** BUILD_PLAN §8 "Versioning"
**Decision:** `package.json`, `app.json` (`expo.version`), and `package-lock.json` bumped 1.0.0 → 1.1.0 (minor — the M10 UX pass and the calendar-highlight fix are new user-facing behaviour, not just a patch). `app.json`'s `android.versionCode` left at `1`.
**Reason:** BUILD_PLAN's rule is "bump `versionCode` by 1 on every APK build without exception" — tied to an actual EAS build, not to every semver bump. No APK has been built under this version yet, so bumping it now would be a guess at a number with nothing behind it. It must be bumped at the next real `eas build`.
**Reversible?** yes

**Superseded (2026-09-06):** `versionCode` was bumped to `2` as part of the hardening pass. The original reasoning (wait for a real EAS build) was correct at the time; the bump now was taken together with the dependency pruning that fixes the CI mismatch, making it the first realistic build moment.

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
**Reason:** §2 forbids new _runtime/app_ dependencies and any data-transmitting SDK; these are build/test tooling. `babel-preset-expo` was only present nested under `expo/` and unresolvable from the root, breaking Metro. `react-native-web`/`react-dom` are not in §2 and web is out of scope (§1, §17). `~` on `expo-*` stops a minor bump from floating off the SDK.
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
**Reason:** The confusion reported was about what logging is _for_, not about which symptoms exist. Trimming the taxonomy would have made old rows unreadable and lost data the user already entered.
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

## 2026-08-31 — [Partly Superseded] Calendar highlight colours darkened; ovulation gets its own solid fill

**Spec section:** §11.2, §11.4
**Decision:** `primaryMuted` #F9D4DC→#F0A0B6 and `fertileMuted` #D6E9E4→#9FD0C2 (darker, same hue family). Added `ovulationFill` #3A6A5F: the ovulation day now renders as a solid fill with white text — the same treatment `loggedPeriod` gets — instead of sharing `fertileMuted` with fertile days and being told apart only by a thin ring. The legend's ovulation swatch and border/ring logic updated to match.
**Reason:** User reported the calendar's highlight colours read as too light to be informational. Investigating turned up a real gap alongside it: fertile-window days and the single ovulation day were visually identical except for a 2px ring, which is a weak signal for the one date that matters most for conception timing. Confirmed the direction with the user (three options offered) before touching §11.2's mandated hex values, per CLAUDE.md rule 1. Every new/changed colour was checked against WCAG AA 4.5:1 for its actual text pairing (`ovulationFill` specifically — the naive choice of reusing `#4E8D80` only reaches 3.86:1 against white and would have shipped a contrast failure).
**Reversible?** yes — token values only, no schema or algorithm change.

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

## 2026-09-04 — App icon config + animated splash handoff (off-plan, not a BUILD_PLAN milestone)

**Spec section:** none (REQUIREMENTS.md has no icon/splash visual-identity section); §2 tech stack
**Decision:** Added `expo-splash-screen` (new dependency, not in §2's table — user explicitly approved before it was added). Configured native splash via the plugin in `app.json` (image `assets/splash-icon.png`, `backgroundColor` `#FFF9FB` matching `colors.bg`) instead of the legacy top-level `splash` key. `src/app/_layout.tsx` now freezes the native splash, hides it the instant a same-look JS overlay mounts, then runs a Reanimated bloom/fade using the already-installed `react-native-reanimated` — no `lottie-react-native` added. Existing hydration/onboarding-redirect logic in that file was preserved, not replaced.
**Reason:** User asked for a discreet icon + animated splash workflow. Neither is a BUILD_PLAN milestone and M6/M7/M8 are still incomplete per the 2026-08-31 carryover note; user explicitly chose to do this now as standalone work anyway, and explicitly approved the one new dependency required (there is no way to control native-splash freeze/hide without `expo-splash-screen`).
**Reversible?** yes — config-only plus one additive file change; no data model or domain-rule impact.

## 2026-09-05 — Home status card replaced with the SVG cycle-day ring (BUILD_PLAN "visual polish" carryover)

**Spec section:** BUILD_PLAN §"Step 8 — visual polish" (checklist item "Status card hero with an SVG cycle-day ring — not built"); §11.2, §11.7
**Decision:** `StatusCard` is deleted; Home now renders `CycleRingCard`, which draws one full cycle (`avgCycleLength` days from the last-period anchor) as an `react-native-svg` ring — a coloured arc per day state (logged period / predicted period / fertile / ovulation, same fills `DayCell` uses) plus a marker on today — with the existing headline/date-line copy centred inside it instead of stacked above it. Three new `MiniStatCard` tiles (Cycle day, Next period, Ovulation) sit below, reusing the `overviewCycleDayLabel`/`overviewNextPeriod`/`overviewOvulation` labels already in `en.ts` for the Insights cycle-overview card — no new i18n strings. New pure `cycleRingDays()` in `core/home.ts` computes the per-day states; it does not consult per-day flow logs (Home only loads the current week's logs), so unlike the calendar/month grid it cannot show the `loggedNoFlow` dot — a day inside a `Period` range is shown as `loggedPeriod` on the period record alone. The ring fades in once (`≤200ms`, opacity only, `ReduceMotion.System`) and is not interactive; `WeekStrip` is unchanged and still does the tap-to-log job.
**Reason:** This exact visual was already an acknowledged gap in BUILD_PLAN, with `react-native-svg` installed specifically for it — no new dependency, no new scope. User's mockup asked for a circular chart + concise centre summary + small stat cards below; the centre summary reuses the spec-owned headline copy verbatim (rule 6 forbids literals, and that copy is tested at the §5.7 late-state boundaries) rather than adopting the mockup's own wording.
**Reversible?** yes — additive component swap; no data model, prediction, or copy change.

## 2026-09-05 — Ring gets per-day numbers; `WeekStrip` removed from Home (deviation from §6.2 item 4)

**Spec section:** §6.2 item 4 ("This week strip — 7 day-circles ... tappable to open the log modal")
**Decision:** `CycleRing` now labels every day with its cycle-day number (white on the two solid fills, dark on the pale washes and empty track — same contrast rule `DayCell` uses), and the today marker changed from a filled dot to a hollow ring so the number under it stays legible. Per explicit user instruction, `WeekStrip` (and its component file) was removed from Home entirely, not just visually decluttered.
**Reason:** User directed both changes directly. Flagged before applying: `WeekStrip` was a named §6.2 requirement and the only remaining one-tap "log a day other than today" affordance on Home (the ring is decorative, not tappable) — the calendar tab still covers logging any date, just with an extra tap to leave Home.
**Reversible?** yes — deleted file is in git history; no data model impact.
