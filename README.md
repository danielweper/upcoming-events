# Upcoming events

A static page that shows upcoming events from a public Google Calendar: a featured event (the one happening now, otherwise the next one) and a chronological list of the events after it.

## How it works
1. A GitHub Action (`.github/workflows/update.yml`) runs about every 10 minutes. It downloads the calendar's `.ics` feed, expands recurring events and builds `events.json` with the events of the coming `horizonDays` days.
2. The Action deploys the page and `events.json` to GitHub Pages. `events.json` is never committed.
3. In the browser, `app.js` reloads `events.json` every `fetchEveryMinutes` minutes and re-renders every `renderEverySeconds` seconds.

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
| `horizonDays` | How many days ahead events are included. |
| `title` | Heading shown in the header. |
| `locale` | Language and format for dates and times. |
| `timeZone` | Time zone used for event times and the clock. |
| `dataUrl` | Where the page loads events from. |
| `fetchEveryMinutes` | How often the page reloads `events.json`. |
| `renderEverySeconds` | How often the page updates the clock, countdown and featured event. |
| `featureActiveEvent` | If `true`, an event that is happening now is the featured event. If `false`, the featured event is always the next one that has not started, and running events appear in the list marked "Nu". |
| `listSize` | Number of events in the list, besides the featured one. |
| `descriptionMaxChars` | Maximum length of the featured event's description. |

The Action's schedule is set in `update.yml` (`cron`). The logo is `logo.svg`.

## Running locally
The page must be served over HTTP; opening `index.html` directly from disk doesn't work.

```
npm install
npm run build:events    # creates events.json
npm run serve           # serves the page locally
```
