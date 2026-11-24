(async () => {
  const C = await fetch('config.json', { cache: 'no-store' }).then((r) => r.json());
  const $ = (id) => document.getElementById(id);
  let events = [];
  let updated = null;
  let fetchFailed = false;

  const fmt = (opts) => new Intl.DateTimeFormat(C.locale, { timeZone: C.timeZone, ...opts });
  const timeF = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayKeyF = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayLongF = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
  const clockDateF = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Browser-local time zone (no timeZone option), unlike the event times above.
  const stampF = new Intl.DateTimeFormat(C.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  const dayKey = (d) => dayKeyF.format(d);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function plainText(s) {
    if (!s) return '';
    const doc = new DOMParser().parseFromString(s.replace(/<br\s*\/?>/gi, '\n'), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function trim(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

  const parse = (e) => ({ ...e, s: new Date(e.start), e: new Date(e.end) });
  // Last visible instant (all-day events end at the next midnight, exclusive)
  const lastMoment = (e) => (e.allDay ? new Date(e.e.getTime() - 1) : e.e);

  function dayLabel(d, now) {
    const k = dayKey(d);
    if (k === dayKey(now)) return 'I dag';
    if (k === dayKey(new Date(now.getTime() + 864e5))) return 'I morgen';
    return dayLongF.format(d);
  }

  function whenText(e) {
    const sameDay = dayKey(e.s) === dayKey(lastMoment(e));
    if (e.allDay) {
      return sameDay ? 'Hele dagen' : `${dayLongF.format(e.s)} – ${dayLongF.format(lastMoment(e))}`;
    }
    const range = `${timeF.format(e.s)} – ${timeF.format(e.e)}`;
    return sameDay ? range : `${timeF.format(e.s)} – ${dayLongF.format(e.e)} ${timeF.format(e.e)}`;
  }

  function countdown(ms) {
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} t ${m % 60} min`;
    const d = Math.floor(h / 24);
    return `${d} ${d === 1 ? 'dag' : 'dage'}`;
  }

  function render() {
    const now = new Date();
    
    const upcoming = events.filter((e) => lastMoment(e) > now);
    const live = upcoming.filter((e) => e.s <= now).sort((a, b) => a.e - b.e);
    const future = upcoming.filter((e) => e.s > now);
    const featured = live[0] || future[0];

    const box = $('featured');
    const list = $('list');
    box.replaceChildren();
    list.replaceChildren();

    if (!featured) {
      box.className = 'ev-empty';
      box.textContent = 'Ingen kommende arrangementer';
      return renderStatus(now);
    }

    const isLive = featured.s <= now;
    box.className = 'ev-featured' + (isLive ? ' live' : '');
    if (isLive) box.append(el('div', 'ev-badge', 'Nu'));
    box.append(el('h2', '', featured.title));
    box.append(el('div', 'ev-when', (isLive || dayKey(featured.s) === dayKey(now) ? '' : dayLabel(featured.s, now) + ' · ') + whenText(featured)));
    if (featured.location) box.append(el('div', 'ev-where', plainText(featured.location)));
    box.append(el('div', 'ev-countdown', isLive ? `Slutter om ${countdown(featured.e - now)}` : `Starter om ${countdown(featured.s - now)}`));
    const desc = trim(plainText(featured.description), C.descriptionMaxChars);
    if (desc) box.append(el('div', 'ev-desc', desc));

    const rest = upcoming.filter((e) => e !== featured).sort((a, b) => a.s - b.s).slice(0, C.listSize);
    const tbody = el('tbody');
    let lastDay = null;
    for (const e of rest) {
      const shown = e.s < now ? now : e.s;
      const k = dayKey(shown);
      if (k !== lastDay) {
        const tr = el('tr');
        const th = el('th', 'ev-day', dayLabel(shown, now));
        th.colSpan = 2;
        tr.append(th);
        tbody.append(tr);
        lastDay = k;
      }
      const row = el('tr');
      row.append(el('td', 'ev-time', e.allDay ? 'Hele dagen' : e.s <= now ? 'Nu' : timeF.format(e.s)));
      const name = el('td', 'ev-name', e.title);
      const loc = plainText(e.location);
      if (loc) name.append(el('small', '', loc));
      row.append(name);
      tbody.append(row);
    }
    if (rest.length) {
      const table = el('table', 'default ev-list');
      table.append(tbody);
      list.append(table);
    }
    renderStatus(now);
  }

  function renderStatus(now) {
    const s = $('status');
    // "updated" = when this browser last downloaded events.json successfully.
    // (events.json's own timestamp only changes when events change, so it isn't a useful freshness signal.)
    const stale = fetchFailed;
    s.className = 'ev-status' + (stale ? ' warn' : '');
    s.textContent = updated
      ? `${stale ? 'Kunne ikke hente nye data · ' : ''}Sidst opdateret ${stampF.format(updated)}`
      : 'Henter arrangementer…';
  }

  async function load() {
    try {
      const r = await fetch(`${C.dataUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      events = (j.events || []).map(parse);
      updated = new Date();
      fetchFailed = false;
    } catch (err) {
      fetchFailed = true; // keep showing the last good data
      console.warn('Could not load events', err);
    }
    render();
  }

  $('title').textContent = C.title;
  load();
  setInterval(load, C.fetchEveryMinutes * 60000);
  setInterval(render, C.renderEverySeconds * 1000);
})();
