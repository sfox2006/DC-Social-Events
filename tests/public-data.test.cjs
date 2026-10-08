const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertPublicData, sanitizePublicData } = require('../scripts/public-data.cjs');

// Synthetic values only. Never put actual mailbox identifiers in fixtures.
const fakeId = '0123456789abcdef';
const publicRef = 'https://www.sixthandi.org/events/';

test('published event data contains no private mailbox metadata', () => {
  assertPublicData(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/events.json'), 'utf8')));
});

test('sanitization preserves event facts, order, metadata, and public references', () => {
  const input = { generated: '2026-10-07T13:03:09-04:00', events: [
    { id: 'sample', title: 'Friday Night Services', category: 'services', source_ref: `${publicRef} | mail: ${fakeId} | social: https://partiful.com/e/public-event | alt url: https://example.org/register` },
    { id: 'second', source_ref: 'https://gatherdc.org/events/' },
  ] };
  const snapshot = structuredClone(input);
  const result = sanitizePublicData(input);
  const expected = structuredClone(input);
  expected.events[0].source_ref = `${publicRef} | social: https://partiful.com/e/public-event | alt url: https://example.org/register`;
  assert.deepEqual(result, expected);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(sanitizePublicData(result), result);
});

test('checker rejects private labels, bare provenance IDs, inbox URLs, and metadata keys', () => {
  for (const text of [`mail: ${fakeId}`, `Gmail: ${fakeId}`, 'gmail: opaque_message_reference', 'personal inbox provenance', `Gmail msg ${fakeId} – public@example.org – Newsletter`, `email: ${fakeId}`, `gmail_message_id=${fakeId}`, fakeId, 'https://mail.google.com/mail/u/0/#inbox/synthetic', 'https://inbox.google.com/']) {
    assert.throws(() => assertPublicData({ events: [{ source_ref: text }] }), /Private mailbox metadata/);
  }
  for (const key of ['gmail_message_id', 'message_id', 'threadId', 'gmail_url']) {
    assert.throws(() => assertPublicData({ events: [{ [key]: fakeId }] }), /Private mailbox metadata/);
  }
  assert.throws(() => assertPublicData({ events: [{ description: 'Open https://mail.google.com/mail/u/0/#inbox/synthetic' }] }), /Private mailbox metadata/);
});

test('checker allows public URLs including public calendar and social references', () => {
  assertPublicData({ events: [{ id: '6bc8c7e24dfc', source_ref: `${publicRef} | social: https://linktr.ee/theaterj`, url: 'https://calendar.google.com/calendar/render?action=TEMPLATE', notes: 'Public contact: events@example.org' }] });
});

test('public organiser email addresses and mailto links remain unchanged', () => {
  const input = { events: [{ source_ref: 'https://example.org/events/ | email: events@example.org', notes: 'Public contact: mailto:events@example.org' }] };
  assertPublicData(input);
  assert.deepEqual(sanitizePublicData(input), input);
});

test('ambiguous private data fails without leaking identifiers into error output', () => {
  assert.throws(() => sanitizePublicData({ events: [{ source_ref: `${publicRef} | social: message_id=${fakeId}` }] }), error => {
    assert(!error.message.includes(fakeId));
    return /data.events\[0\].source_ref/.test(error.message);
  });
});

test('newsletter mailbox provenance is replaced by the existing public event URL', () => {
  const input = { events: [{ url: 'https://example.org/event/', source_ref: `Gmail msg ${fakeId} – public@example.org – Newsletter` }] };
  assert.deepEqual(sanitizePublicData(input), { events: [{ url: input.events[0].url, source_ref: input.events[0].url }] });
});

test('ambiguous newsletter provenance with a public URL fails instead of deleting it', () => {
  assert.throws(() => sanitizePublicData({ events: [{ source_ref: `Gmail msg ${fakeId} https://example.org/event/` }] }), /Private mailbox metadata/);
});

test('public URL tokens are not mistaken for private mailbox identifiers', () => {
  assertPublicData({ events: [{ source_ref: 'https://example.org/event/6ab5ac0370520c9ab749d519' }] });
  assert.throws(() => assertPublicData({ events: [{ notes: fakeId }] }), /Private mailbox metadata/);
});

test('empty public references remain unchanged', () => {
  const input = { events: [{ source_ref: '', url: 'https://example.org/event/' }] };
  assert.deepEqual(sanitizePublicData(input), input);
});
