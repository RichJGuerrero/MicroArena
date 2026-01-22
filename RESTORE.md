# MicroArenaClaude — Restored Working Baseline

This is a clean restore of the current MicroArena feature set (clickable user cards → `/users/:id`, self-click redirects to `/profile`, invite-only clans with inbox flow, match board endpoints, and the yellow Founder badge styling).

## Run it

From the folder that contains `package.json`:

```bash
npm install
npm run dev
```

If you get a weird Rollup/Vite native-module error (or anything else dependency-related), do a clean reinstall:

**Windows (PowerShell):**
```powershell
rmdir /s /q node_modules
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

**macOS/Linux:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Git cleanup (if you accidentally committed build junk)

```bash
git rm -r --cached node_modules .svelte-kit build dist data
```

Then commit and push.

If your repo is fully cursed, the simplest path is:
1) Clone fresh into a new folder.
2) Copy this project’s `src/`, `static/`, and config files into the fresh clone.
3) Commit + push.
