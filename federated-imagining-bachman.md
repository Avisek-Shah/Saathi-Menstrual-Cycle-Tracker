# Saathi — performance, correctness, config & docs pass

## Context

Saathi is an offline Expo SDK 57 / RN 0.86 period tracker (Expo Router, expo-sqlite, zustand, pure `src/core`). It is feature-complete through M10 but has never had a performance or hygiene pass. A full read-only audit of every screen, component, store, repository, core module, config file and doc found three compounding problems plus one build blocker:

- **The tree does not build from a clean checkout.** `expo-video` is imported at `src/app/_layout.tsx:9` and plugged in at `app.json:26`, but is not in `package.json` — while `package-lock.json:24` still lists it. EAS Build runs `npm ci`, which hard-fails on that mismatch. Local dev hides it because the package is still on disk.
- **Render amplification.** All three tab screens subscribe to the whole cycle store, and expo-router keeps visited tabs mounted — so one quick-log tap re-renders Home, Calendar and Insights, twice (optimistic `set`, then `refresh`'s `set`). The heavy derivations on those screens run in the render body: the 21–45-day cycle ring, the 42-cell month grid (42 `NepaliDate` conversions in BS mode), the journal grouping.
- **Write amplification.** Every flow write rebuilds the whole derived `periods` table from a full-table scan; onboarding and anchor-change do that once per seeded day in a serial loop.
- **Docs drift.** BUILD_PLAN marks built things unbuilt, DECISIONS contradicts itself, the palette in the code no longer matches the spec, and Settings shows the wrong version number.

Outcome wanted: the app builds from clean, does the work it actually needs, and the docs stop lying — with no new runtime dependency and no change to any spec-sensitive wording.

## Decisions already taken

1. **Keep `primaryMuted: '#050505ff'`** (near-black) as intentional. Therefore the _text_ rule must be fixed at **five** sites, not two — it is used both as a fill behind dark text and as a chip/card background.
2. **Remove the video splash** rather than restore `expo-video`.
3. **Scope is everything** — perf, correctness, config, docs.
4. **Android package id `com.yourname.saathi` stays for now.** Called out below as a must-fix before the first real build.

## Corrections to the raw audit (verified against the tree)

- `.claude/skills/react-native-best-practices/` **is** tracked; `skills-lock.json` is fine. The actual hygiene issue is the reverse: `.agents/skills/caveman/*.md` stay tracked despite `.gitignore:45`.
- Only **three** "unused" deps are actually removable — `expo-notifications`, `expo-secure-store`, `react-native-gifted-charts`. `expo-constants`/`expo-font` are dependencies of `expo` itself (and `expo-font` is peer-required by `@expo/vector-icons`, which _is_ used); `expo-linking` and `@testing-library/react-native` are peers of `expo-router`.
- `idx_daily_logs_flow` is not dead — it is unused by a query that should use it. `core/periods.ts:38` already filters `flow !== 'none'` in JS, so the scan in `dailyLogs.ts:46-48` can take `WHERE flow != 'none'` with identical output and _use_ the index. Dropping it would need a v2 migration for negative value.
- `MonthGrid.tsx:53-54`'s `onLayout` → `setState` is deliberate and documented in DECISIONS. Leave it.

## Phase 1 — no approval needed (steps 1–12, safe to run straight through)

**1. Remove the video splash; make `npm ci` work.** `src/app/_layout.tsx` (drop the `expo`/`expo-video` imports, `AnimatedSplashOverlay` :32-69, the two timeout constants, `introDone`, the overlay JSX, the `StyleSheet` block), `app.json:26`, delete `assets/splash_animation.mp4`, regenerate the lockfile with `npm install`.
**Trap:** `_layout.tsx:16` calls `preventAutoHideAsync()` and the only `hideAsync()` lives inside the deleted overlay — without a replacement the app hangs on the native splash forever. Add `useEffect(() => { if (hydrated) void SplashScreen.hideAsync(); }, [hydrated])`.

**2. Version string from `expo-constants`.** `settings.tsx:178` hardcodes `'1.0.0'` while the app is 1.1.0. Use `Constants.expoConfig?.version`; the fallback string goes in `src/i18n/en.ts` (no literal in the component).

**3. Narrow the three whole-store subscriptions.** `index.tsx:42`, `calendar.tsx:36`, `insights.tsx:48` → one `useCycleStore((s) => s.field)` per field, copying the existing correct pattern at `settings.tsx:97-98`. **No object- or array-returning selector** — the repo has none today, and one without `useShallow` is an infinite render loop. Store actions are defined once in `create()` and never replaced, so existing `useCallback` deps stay stable.

**4. Insights: pagination survives tab switches, and `today` stops going stale.** `insights.tsx:55-65` `loadFirstPage` discards loaded pages on focus (N rows → 20); refetch `max(PAGE_SIZE, rows.length)` instead, and cap the unbounded "Load more" at `:72`. Same commit: hold `today` in state, refresh on focus + `AppState`, as Home and Calendar already do (`index.tsx:55-64`). **Required by step 3**, not optional — narrowing the selectors removes the incidental re-renders that were hiding the stale clock read.

**5. Calendar month-log staleness.** `calendar.tsx:96-103` keys only on `[rangeStart, rangeEnd]`, has no focus guard, and duplicates `reloadMonthLogs` (`:91`). Log a day on Home → switch to Calendar → the cell renders white, because `dayCellState` (`core/home.ts:91`) needs both `loggedFlow` and a containing period. Add a `reloadToken` bumped from `useFocusEffect` and from `handleSelectFlow`; call the existing callback instead of duplicating it.

**6. Memoize the pure render-body derivations.** `DatePickerGrid.tsx:45` (`getMonthGrid` — `calendar.tsx:87` already memoizes the identical call) and both callers' inline `isSelectable` arrows; onboarding `index.tsx:149-162,201` (lazy `useState(() => …)` for `today`/`thisYear` — also stops the seed range shifting across midnight mid-flow); `calendar.tsx:65-66` (`current`/`end` — load-bearing: it makes `goMonth`'s `[end]` dep real and lets `:45-48`'s `setCursor` bail on `Object.is`); `calendar.tsx:131-137` (hoist the fallback `Prediction` to module scope — the current `as Prediction` cast is a lie, it omits six required fields); `index.tsx:139` `cycleRingDays`.

**7. Store hygiene.** `useCycleStore.ts` — `weekLogs` is written on every refresh and read by nothing (WeekStrip was deleted per DECISIONS:195). Removing it deletes the 7-day `getRange` entirely; the two remaining reads become one `Promise.all`. Keep `weekStripDays` in `core/home.ts` (§6.2-named export with tests).

**8. MonthGrid.** `:103` runs 42 `NepaliDate.fromAD` conversions that `getMonthGrid` already did — `cell.day` holds the BS day-of-month; pass it through and delete the block (verify against `core/calendar.test.ts` first; the `MonthCell.day` doc comment at `core/calendar.ts:126` is stale about fill cells). `:110` wraps `DayCell`'s own `Pressable` in a second one — an **accessibility** bug (two nested button roles, 84 focusable nodes, no label on the outer), not an FPS one; keep one. Hoist the legend array at `:148-154`. Then `React.memo(DayCell)` — it cannot hit until steps 3 and 6 stop `prediction` and the cell style changing identity every render.

**9. Migration transactionality.** `db/migrate.ts:16-39` is safe today (all `CREATE ... IF NOT EXISTS`) and unsafe the moment the `if (current < 2)` seam at `:31` is used. Wrap the version blocks and the `schema_version` write in one transaction while v1 is still the only version; keep `PRAGMA journal_mode = WAL` (`client.ts:17`) outside it. Also `settings.ts:53` hardcodes `schema_version: 1` — import `SCHEMA_VERSION` from `schema.ts`.

**10. Write-path atomicity.** Wrap `dailyLogs.upsert`'s write + `refreshPeriods()` (`:84-101`) in one transaction, same for `deleteByDate`/`deleteAll`, and move `clearFlowForDates`'s `refreshPeriods()` (`:150`) inside the transaction at `:129-149`. Make `useSettingsStore.ts:40-49` and `:70-87` single units.
**Trap:** `replaceAllPeriods` (`periods.ts:33-45`) opens its own `withTransactionAsync`, and expo-sqlite does not nest them — split out an inner non-transactional variant for the composed path.

**11. Write-path cost.** Narrow the scan to `WHERE flow != 'none'`; add `upsertMany` so the seed loop and `changeAnchor` rebuild `periods` **once** instead of N times; have `upsert` return the recomputed `Period[]` so `refresh` can skip `getAllPeriods()`. **This is the one item that needs a real before/after number** — seed with `scripts/seed.ts` and time `saveLog` with `performance.now()`. §4.5 merge behaviour is derived from this table, so `core/periods.test.ts` plus the manual 1–2-day-gap merge case both have to pass.

**12. Prediction recompute on settings change.** `useCycleStore.ts:41` reads settings via `getState()`, so changing cycle length at `settings/profile.tsx:90-108` leaves the prediction stale until Home's next focus refresh. Call `refresh(todayIso())` after each `update()` in that screen — keeps the clock read at the screen boundary, as the rest of the app does.

## Phase 2 — hard stop, each item needs its own yes

| #   | Item                                                                                                                                                                                                  | Why it needs approval                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | **`primaryMuted` text rule, 5 sites** — `DayCell.tsx:52`, `CycleRing.tsx:42-46`, `DaySheet.tsx:158`, `log/[date].tsx:80,191`. Add one `onPrimaryMuted` token in `colors.ts` rather than five guesses. | Edits REQUIREMENTS.md §11.2 palette table (`:479`) and the day-cell-states sentence; records `#050505ff` as an intentional deviation                                                                                                                  |
| 14  | **Splash background** — deleting the overlay moves the seam rather than removing it: native `#f8e4cd` → `colors.bg` `#FFF9FB`. Pick one.                                                              | Visual identity call; `assets/splash-icon.png` was composited on the cream                                                                                                                                                                            |
| 15  | **§5.6 notice-reset relocation** — `index.tsx:67-72` depends on the whole `prediction` object and writes DB state from a render effect                                                                | §5.6 is on CLAUDE.md's flag-don't-guess list — _when_ the notice reappears is §5.6 behaviour                                                                                                                                                          |
| 16  | **`versionCode` 1 → 2 + `cli.appVersionSource: "local"`** in `eas.json`                                                                                                                               | Amends DECISIONS:39-43. Android refuses an APK whose versionCode is not greater than the installed one — a 1.1.0 APK at versionCode 1 fails on a tester's phone with "app not installed". **Also the last cheap moment to fix `com.yourname.saathi`** |
| 17  | **Drop `expo-notifications`, `expo-secure-store`, `react-native-gifted-charts`** (+ the `POST_NOTIFICATIONS` declaration, + `app.json:16`'s inert `expo-font` plugin entry)                           | Contradicts REQUIREMENTS §2 and defers M6/M7. Measure the APK before quoting a saving                                                                                                                                                                 |
| 18  | **ESLint + Prettier** (4 devDeps)                                                                                                                                                                     | New dependencies. Payoff already earned: `calendar.tsx:47` carries a `react-hooks/exhaustive-deps` suppression for a linter that isn't installed. Land the config only; fix findings in follow-ups                                                    |
| 19  | **`noUncheckedIndexedAccess`**                                                                                                                                                                        | Blast radius is ~14 sites, and CLAUDE.md forbids `!` — every one needs a real guard. **Spike first** (turn it on, count errors), then decide                                                                                                          |

## Phase 3 — documentation

- **BUILD_PLAN.md**: `:259` the SVG cycle ring **is** built (`CycleRing.tsx` → `CycleRingCard.tsx:8` → `index.tsx:18`); `:260` reduce-motion ≤200 ms is **partly** built (`CycleRing.tsx:107-113`); `:193` `src/components/charts/` is no longer empty; `:73`'s ESLint claim is true only if step 18 lands.
- **Duplicate `article-5.md`** — `src/content/articles/` (22-line draft) and `src/content/learn/` (7-line finished); neither is imported, REQUIREMENTS:588 names `articles/` canonical. **The draft's irregular-cycle wording is §5.6 — needs the user.**
- **DECISIONS.md**: `:23` "both splash backgrounds are `#FBE4CE`" was never true; mark the video entry superseded; `:153`'s hex; `:189` is superseded by `:195` but sits _above_ it in a newest-first file, so it needs an inline marker. New dated entries for every change that lands.
- **M9_HARDENING_CHECKLIST.md:9** — §7 is marked DONE on the copy alone; nothing schedules a notification.
- **REQUIREMENTS.md** _(spec edit → needs approval)_: `:56`'s "every library in this table is already installed" is false; `:352`'s shortest/longest stats are not rendered and `en.ts` has no keys for them — build it or record the gap.
- **README** — none exists; BUILD_PLAN:340-349 already drafts the sideload guide.
- **Repo hygiene** — `git rm --cached .agents/skills/caveman/*.md`, or drop the `.agents` ignore rule so it agrees with the deliberately-tracked `.claude/skills/`.

## Deliberately not doing

- **No FlatList/SectionList for the journal yet.** At 20–40 rows × ~25 views it is real but not obviously janky, and `Screen`'s ScrollView (`ui/Screen.tsx:63`) means virtualizing requires restructuring Insights (`scroll={false}` + stats into `ListHeaderComponent`). Do the cheap half first — `React.memo` the row, `StyleSheet.create` the `Tag`, `useMemo` `groupByMonth` at `:54`, cap pagination — then measure. Half-virtualizing is worse than not.
- **No `anchorStart`/`cycleDay` on `Prediction`.** REQUIREMENTS:179-198 defines that interface as a literal code block, and the saving is a map+filter+sort over a handful of rows. Memoize at the screen instead.
- **No blanket memoization**, no FlashList (new dep), no changes to `src/core` logic, no changes to §5.6/§6.2/§7/§8 wording.
- **Not selling step 6 as the cure for a slow tap.** 45 `addDays` calls is ~1 ms on Hermes; if a tap feels slow, step 11 is why.

## Verification

Per commit: `npx tsc --noEmit` (clean today, must stay clean) and `npm test` (8 core suites).

On device, after Phase 1:

- Cold launch from a killed app reaches Home (or onboarding) — the splash hide is the one change that can brick startup.
- Quick-log a chip on Home → switch to Calendar → the day is filled immediately.
- Load 3+ journal pages → switch tabs → back → still 3 pages; edit a day from the journal → returns updated.
- Swipe months in both AD and BS; check a 32-day BS month's corner fill cells; every cell still taps.
- Change cycle length in Settings → My cycle → Home's next-period date moves immediately.
- §4.5 regression: two periods 1–2 days apart still merge into one.

Step 11 additionally needs a measured before/after on a seeded DB; step 17 needs a measured APK size.
