# Upcoming events

A static page that shows upcoming events from a public Google Calendar: a featured event (the one happening now, otherwise the next one) and a chronological list of the events after it.

## How it works
1. A GitHub Action (`.github/workflows/update.yml`) runs about every 10 minutes. It downloads the calendar's `.ics` feed, expands recurring events and builds `events.json` with the events of the coming `daysAhead` days.
2. `scripts/build-site.mjs` builds a self-contained `index.html` (CSS, JS, logo, config and the current events are inlined) and the Action deploys it to GitHub Pages together with `events.json`. Showing the page therefore takes a single request, which matters for screens that reload it often. A small service worker (`sw.js`) lets the browser reuse its saved copy of the page and `events.json` for 5 minutes without contacting GitHub, so a screen that reloads the page every few seconds doesn't hit GitHub's rate limit. `events.json` is never committed.
3. In the browser, `app.js` reloads `events.json` every `reloadEventsEveryMinutes` minutes and re-renders every `refreshDisplayEverySeconds` seconds.

Calendar changes typically show up on the page within 10–20 minutes.

## Setup
1. Push this repository to GitHub.
2. Set `icsUrl` in `config.json` to your calendar's public `.ics` address.
3. Under **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Run **Actions → Update events → Run workflow**. The site is then available at `https://<user>.github.io/<repo>/`.

## Configuration
All settings are in `config.json`.

| Setting | Description |
|---|---|
| `icsUrl` | Public `.ics` feed of the calendar (required). |
| `daysAhead` | How many days ahead events are included (default 90). |
| `pageTitle` | Heading shown in the header. |
| `locale` | Language and format for dates and times. |
| `timeZone` | Time zone used for event times and the clock. |
| `eventsFile` | File the page loads events from. The Action always writes `events.json`, so only change this if you change the build script too. |
| `reloadEventsEveryMinutes` | How often the page reloads `events.json`. |
| `refreshDisplayEverySeconds` | How often the page updates the clock, countdown and featured event. |
| `featureActiveEvent` | If `true`, an event that is happening now is the featured event. If `false`, the featured event is always the next one that has not started, and running events appear in the list marked "Nu". |
| `allUpcomingEvents` | Required, `true` or `false`. If `true`, the list shows as many upcoming events as fit on the screen without scrolling, and `upcomingEventLimit` is ignored. |
| `upcomingEventLimit` | Number of events in the list, besides the featured one. Required when `allUpcomingEvents` is `false`, ignored otherwise. |
| `featuredDescriptionMaxChars` | Maximum length of the featured event's description. |

The Action's schedule is set in `update.yml` (`cron`). The logo is `logo.svg`.

## Running locally
The page must be served over HTTP; opening `index.html` directly from disk doesn't work.

```
npm install
npm run build:events    # creates events.json
npm run serve           # serves the page from the sources (it fetches config.json and events.json)
npm run build:site      # optional: builds the self-contained page in _site/, as the Action does
```
