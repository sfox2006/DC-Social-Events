const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/events.json');
test('reviewed theatre performances preserve precise starts and unknown ends and fees', () => {
  assert.equal(new Set(data.events.map(event=>event.id)).size,data.events.length);
  const performances=data.events.filter(event=>event.url==='https://www.studiotheatre.org/handle-with-care');
  assert.equal(performances.length,10);
  assert.equal(new Set(performances.map(event=>event.start)).size,10);
  for(const event of performances) {
    assert.equal(event.end,null);
    assert.match(event.start,/T(?:14|20):00:00-04:00$/);
    assert.match(event.rsvp_url,/handle-with-care\?id=\d+$/);
    assert.match(event.description,/Exact end time is not stated/);
    if(event.start.startsWith('2026-10-14')) assert.match(event.cost,/\$37.*fees not verified/);
    else assert.equal(event.cost,'Unknown');
  }
});
test('Pickle Bash distinguishes free festival entry from paid purchases', () => {
  const event=data.events.find(item=>item.id==='merry-pin-dc-pickle-bash-2026-10-10');
  assert(event);
  assert.equal(event.tags.free_entry,true);
  assert.equal(event.tags.free_food,null);
  assert.equal(event.tags.free_drinks,null);
  assert.equal(event.age,'all_ages');
  assert.match(event.cost,/optional paid passes and purchases/);
});
