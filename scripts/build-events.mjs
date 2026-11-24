// Downloads the public .ics feed, expands recurring events and writes events.json
// containing only events that are not over yet, within the next HORIZON_DAYS.
// Usage: node scripts/build-events.mjs   (ICS_URL env var overrides the default feed)

// All-day events are "floating" dates; pin the zone so they become Copenhagen midnight.
process.env.TZ = 'Europe/Copenhagen';

import { writeFile } from 'node:fs/promises';
import ical from 'node-ical';

const ICS_URL = process.env.ICS_URL || 'https://fklub.dk/ical/fember.ics';
const HORIZON_DAYS = Number(process.env.HORIZON_DAYS || 90);
const OUT = new URL('../events.json', import.meta.url);

const res = await fetch(ICS_URL, { redirect: 'follow' });
if (!res.ok) throw new Error(`Feed request failed: ${res.status} ${res.statusText}`);
const data = ical.sync.parseICS(await res.text());

const now = new Date();
const horizon = new Date(now.getTime() + HORIZON_DAYS * 864e5);
const lookback = new Date(now.getTime() - 864e5); // catch long/in-progress recurring instances

const text = (v) => (v && typeof v === 'object' ? v.val ?? '' : v ?? '').toString().trim();
const out = [];

function push(ev, start, end) {
  if (ev.status === 'CANCELLED') return;
  const allDay = ev.datetype === 'date';
  end = end || (allDay ? new Date(start.getTime() + 864e5) : start);
  if (end <= now || start >= horizon) return; // already over, or too far ahead
  out.push({
    id: `${ev.uid}@${start.toISOString()}`,
    title: text(ev.summary) || '(uden titel)',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: text(ev.location),
    description: text(ev.description),
  });
}

for (const ev of Object.values(data)) {
  if (ev.type !== 'VEVENT' || !ev.start) continue;
  const duration = ev.end ? ev.end - ev.start : 0;

  if (!ev.rrule) {
    push(ev, new Date(ev.start), ev.end ? new Date(ev.end) : null);
    continue;
  }

  for (const occ of ev.rrule.between(lookback, horizon, true)) {
    const key = occ.toISOString().slice(0, 10);
    const override = ev.recurrences?.[key];
    if (!override && ev.exdate && (ev.exdate[key] || ev.exdate[occ.toISOString()])) continue;
    if (override) {
      push(override, new Date(override.start), override.end ? new Date(override.end) : null);
    } else {
      push(ev, occ, duration ? new Date(occ.getTime() + duration) : null);
    }
  }
}

out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
const seen = new Set();
const events = out.filter((e) => !seen.has(e.id) && seen.add(e.id));

await writeFile(OUT, JSON.stringify({ updated: now.toISOString(), source: ICS_URL, events }, null, 1) + '\n');
console.log(`Wrote ${events.length} events (next ${HORIZON_DAYS} days) to events.json`);
