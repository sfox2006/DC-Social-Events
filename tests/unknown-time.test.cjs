const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

function context() {
  const ctx = vm.createContext({
    URL, TZ: 'America/New_York',
    ymdFormatter: new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' }),
    fieldText: value => String(value || '').trim(), locationText: () => '',
    speakersLabel: () => '', isSimpleFormat: () => true, formatLabel: value => value,
  });
  for (const name of ['pad2', 'ymdKey', 'parseYmdKey', 'eventYmdInTz', 'addDays', 'timeIsUnknown', 'allDayBounds', 'compactDate', 'toUtcStamp', 'eventEndIso', 'calendarDetails', 'googleCalendarUrl', 'toEtStamp', 'outlookCalendarUrl', 'icsEscape', 'foldIcs', 'icsContent']) {
    const start = code.indexOf(`  function ${name}(`);
    assert(start >= 0, name);
    const next = code.indexOf('\n  function ', start + 1);
    vm.runInContext(code.slice(start, next), ctx);
  }
  return ctx;
}

test('unknown date-only starts retain November 8 and export an honest date placeholder', () => {
  const ctx = context();
  const event = { id: 'unknown', title: 'Unknown performance time', start: '2026-11-08', time_unknown: true, end: null };
  assert.equal(ctx.ymdKey(ctx.eventYmdInTz(event.start)), '2026-11-08');
  assert.equal(ctx.timeIsUnknown(event), true);
  const google = new URL(ctx.googleCalendarUrl(event));
  assert.equal(google.searchParams.get('dates'), '20261108/20261109');
  const outlook = new URL(ctx.outlookCalendarUrl(event));
  assert.equal(outlook.searchParams.get('allday'), 'true');
  assert.equal(outlook.searchParams.get('startdt'), '2026-11-08');
  assert.equal(outlook.searchParams.get('enddt'), '2026-11-09');
  const ics = ctx.icsContent(event).replace(/\r\n /g, '');
  assert.match(ics, /DTSTART;VALUE=DATE:20261108/);
  assert.match(ics, /DTEND;VALUE=DATE:20261109/);
  assert.match(ics, /Start time is unconfirmed/);
  assert(!/DTSTART:\d{8}T/.test(ics));
  assert.equal(event.end, null);
});

test('explicit unknown flags are respected and verified DST times remain timed', () => {
  const ctx = context();
  assert.equal(ctx.timeIsUnknown({ start: '2026-11-08T00:00:00-05:00', time_unknown: true }), true);
  assert.equal(ctx.timeIsUnknown({ start: '2026-11-08T19:00:00-05:00', time_unknown: false }), false);
  const event = { id: 'timed', title: 'Halloween crawl', start: '2026-10-31T19:30:00-04:00', end: '2026-11-01T02:00:00-05:00' };
  const ics = ctx.icsContent(event);
  assert.match(ics, /DTSTART:20261031T233000Z/);
  assert.match(ics, /DTEND:20261101T070000Z/);
  assert(!ics.includes('VALUE=DATE'));
  assert.equal(new URL(ctx.googleCalendarUrl(event)).searchParams.get('dates'), '20261031T233000Z/20261101T070000Z');
});
