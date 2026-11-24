# Upcoming events

Static page that shows a featured event (the one happening now, otherwise the next one) plus a chronological list, from a public Google Calendar feed.

## How it works
1. A GitHub Action (`update.yml`) runs every ~10 min, downloads the `.ics` feed, expands recurring events and builds `events.json` (next 90 days). The file is never committed: it is generated fresh and deployed straight to Pages, so the repo history stays clean.
2. The page (`index.html` + `app.js`) re-fetches `events.json` every 5 min and re-renders every 15 s.

Expect calendar edits to show up on the TV after roughly 10–20 minutes.

## Setup
1. Create a GitHub repo and push this folder.
2. **Settings → Pages → Source: GitHub Actions.**
3. Optional: set repo variable `ICS_URL` (Settings → Secrets and variables → Actions → Variables) to use another feed. Default: `https://fklub.dk/ical/fember.ics`.
4. Run **Actions → Update events → Run workflow** once. The site appears at `https://<user>.github.io/<repo>/`.
5. Replace `logo.svg` with your logo (keep the filename, or update `index.html`).

## Showing it on a TV
It's an ordinary responsive webpage (light theme). Open it full-screen (F11) in any browser on the TV; it stays up to date by itself. Sizes scale with window width, so phones, laptops and big screens all work.

## Local use
```
npm install
npm run build:events    # refresh events.json
npm run serve           # http://localhost:3000
```
Tweak titles, list size and timings in `config.js`.
