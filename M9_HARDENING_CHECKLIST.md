# M9 — Hardening (§10 checklist, verified 2026-08-31, commit 4295b92)

| Case | §10 / BUILD_PLAN | Status | Evidence / Code | Reversible? |
|---|---|---|---|---|
| 4.5 | 1–2 day gap → merge into one period | DONE | core/periods grouping threshold handles | yes — threshold configurable |
| 5.3 | 50-day cycle shows in history, excluded from avg | DONE | core/prediction excludes outliers from weighted avg | yes |
| 6.2 | Fertile disclaimer always shown (permanent by design) | DONE | FertileCard.tsx line 42–44 (never dismissible) | no — by spec |
| 6.3 | BS = re-grid, not relabel (32-day months) | DONE | calendar.ts getMonthGridBs via dateConfigMap; MonthGrid.tsx | yes |
| 7 | Notification text never names period/app | DONE | en.ts: "Reminder" / "Something's coming" / "Your window" — no cycle terms | yes — edit en.ts |
| 8 | PIN storage + no-recovery warning | SKIPPED (confirmed with user) | No PIN implemented; no recovery text written (would need your word choice per CLAUDE.md) | — |
| 9 | Never store a BS date | DONE | calendar stores AD ISO only; BS only in format/render layer | yes |
| 10 | Never auto-log a period the user didn't enter | DONE | saveLog requires explicit call; no auto-log path exists | yes |

Sensitive areas confirmed with user (no guesses):
- §5.6 irregular-cycle wording → untouched (existing copy)
- §6.2 disclaimer text → untouched (permanent by design)
- §7 notification text → kept existing (§7-compliant)
- §8 PIN / no-recovery → skipped (user confirmed "skip PIN")
- Data off-device → none added (local only)
