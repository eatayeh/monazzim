# Daily Checklist

A simple phone app for daily routines. Tick things off, and it resets every morning while keeping your history.

Comes pre-loaded with a **Tongue & throat** routine (myofunctional exercises for sleep apnea, 3 rounds a day,
90-day program tracker) and a **Daily habits** routine. Edit, add or remove anything from **Edit list**.

## Features
- Daily checkboxes, including "3× a day" items (tap to count rounds)
- Routines with an optional program length ("Day 12 of 90")
- Progress ring, streak, and a 12-week history heatmap (tap a day to view or fix it)
- Add / edit / reorder / delete items and routines, with undo
- Works offline and installs to your home screen
- Backup and restore (copy/paste)

## Run it
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Put it on your phone (free, ~5 minutes)
1. Create a GitHub repo and push this folder.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root → Save.
3. Open the `https://<you>.github.io/<repo>/` link on your phone.
4. **iPhone:** Safari → Share → *Add to Home Screen*. **Android:** Chrome menu → *Install app*.

Your data stays on your phone. Use **Settings → Copy backup** occasionally.

## Keep building with Claude Code
```bash
cd daily-checklist
claude
```
`CLAUDE.md` explains the structure and data model, and lists ideas to build next.
