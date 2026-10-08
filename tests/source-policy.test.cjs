const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../data/events.json');
const review = require('../research/source-review-2026-10-08.json');
const { assertPublicData } = require('../scripts/public-data.cjs');
const { assertReviewedSources, applyReviewedSources } = require('../scripts/reviewed-source-policy.cjs');

test('public catalogue obeys the 13 reviewed exclusions and two presenter corrections', () => {
  assert.equal(review.excluded_records.length, 13);
  assert.equal(review.host_corrections.length, 2);
  assertReviewedSources(data);
  for (const correction of review.host_corrections) {
    const event = data.events.find(item => item.id === correction.id);
    assert(event);
    assert.equal(event.venue, 'Sixth & I');
    assert.equal(event.address, '600 I Street NW, Washington, DC 20001');
  }
});

test('historical research is retained with public provenance only', () => {
  assertPublicData(review);
  for (const event of review.excluded_records) assert(event.title && event.url && event.start);
});

test('future imports cannot restore reviewed records or lose presenter corrections', () => {
  for (const event of review.excluded_records) {
    assert.throws(() => assertReviewedSources({events:[event]}), /reintroduced/);
    assert.deepEqual(applyReviewedSources({events:[event]}), {events:[]});
  }
  for (const correction of review.host_corrections) {
    const input = {events:[{id:correction.id, org:'Sixth & I', url:correction.previous_url, venue:'Sixth & I', description:'Preserve this fact'}]};
    assert.throws(() => assertReviewedSources(input), /correction missing/);
    const result=applyReviewedSources(input);
    assert.equal(result.events[0].org,correction.org);
    assert.equal(result.events[0].venue,'Sixth & I');
    assert.equal(result.events[0].description,'Preserve this fact');
    assert.deepEqual(applyReviewedSources(result), result);
  }
});

test('changed reviewed records require fresh review, while venue-only or unresolved programmes survive', () => {
  const changed={...review.excluded_records[0],org:'Different presenter'};
  assert.throws(() => applyReviewedSources({events:[changed]}), /changed since review/);
  const unresolved=data.events.filter(event => event.org==='Sixth & I');
  assert.equal(unresolved.length,6);
  assert.deepEqual(applyReviewedSources({events:unresolved}), {events:unresolved});
});
