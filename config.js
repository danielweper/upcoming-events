// UI settings – edit freely.
window.CONFIG = {
  title: 'Kommende arrangementer',
  locale: 'da-DK',
  timeZone: 'Europe/Copenhagen',
  dataUrl: 'events.json',
  fetchEveryMs: 5 * 60 * 1000,   // re-download events.json
  renderEveryMs: 15 * 1000,      // re-evaluate "now" (drops ended events, rolls the featured one)
  listSize: 7,                   // events shown in the list (besides the featured one)
  descriptionMaxChars: 220,
};
