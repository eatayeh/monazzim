# Daily Checklist — project notes for Claude

A personal, mobile-first daily checklist (PWA). The owner uses it on their phone for routines like
tongue/throat exercises for sleep apnea, plus any habits they add. Checkboxes reset every day; history is kept.

## Stack & constraints
- Plain HTML/CSS/JS. **No build step, no framework, no dependencies.** Keep it that way unless asked.
- Hosted as static files (GitHub Pages works). Must keep working offline after first load.
- All data is local to the device (`localStorage`). There is no backend and no account.
- Mobile first: 44px tap targets, 16px inputs (prevents iOS zoom), safe-area insets, light + dark mode.

## Files
- `index.html` — shell: header with progress ring, tabs (Today / History / Settings), `<dialog>` for edits, toast.
- `styles.css` — all styles. CSS variables at the top; dark mode via `prefers-color-scheme`.
- `app.js` — all logic in one IIFE: state, persistence, rendering (template strings → innerHTML), actions.
- `sw.js` — service worker, network-first with cache fallback. **Bump `CACHE` when changing any cached file.**
- `manifest.webmanifest`, `icons/` — install metadata and icons.

## Data model (localStorage key `daily-checklist:v1`)
```js
{
  version: 1,
  sections: [{                 // a "routine"
    id, name, note,
    goalDays,                  // 0 = no program; else shows "Day X of N"
    startDate,                 // 'YYYY-MM-DD' local
    items: [{ id, name, detail, target }]   // target = times per day (>=1)
  }],
  log: { 'YYYY-MM-DD': { [itemId]: count } } // only non-zero counts stored
}
```
- Dates are **local** `YYYY-MM-DD` via `keyOf()`; never use `toISOString()` (UTC shifts the day).
- Tapping a check cycles `0 → 1 → … → target → 0`.
- Day progress = Σ min(count, target) / Σ target over the **current** items (deleted items don't count in history).
- Streak = consecutive 100% days; an unfinished today doesn't break it.
- If you change the schema, bump `version` and add a migration in `load()`; never drop existing `log` data.

## Conventions
- Escape all user text with `esc()` before putting it in HTML.
- Don't use `alert/confirm/prompt`; use `ask()` / `confirmBox()` (the `<dialog>`).
- Destructive actions get an Undo toast or a confirm.
- Keep `app.js` readable over clever; it's a personal app the owner may edit.

## Testing
- Run locally: `python3 -m http.server 8000` then open http://localhost:8000
- Phone on same Wi-Fi: http://<computer-ip>:8000 (service worker needs https or localhost, so offline mode only works once hosted).
- Check: tick/untick, multi-round items, edit/add/delete/reorder, undo, day rollover, history heatmap, backup copy/restore, dark mode, 360px width.

## Ideas backlog (not built yet)
- Daily reminder notifications (needs push or a native wrapper; iOS PWAs support Web Push from 16.4 when installed).
- Weekday-only items (e.g. "Mon/Wed/Fri").
- Rest-timer / hold-countdown for "hold 5 s" exercises.
- Notes per day (e.g. how I slept, snoring reported).
- Charts of completion over the 90-day program.
- Optional sync (e.g. export to a file, or a small backend) — ask the owner first.
