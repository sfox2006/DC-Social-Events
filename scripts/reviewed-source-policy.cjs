const fs = require('node:fs');
const path = require('node:path');
const review = require('../research/source-review-2026-10-08.json');
const { assertPublicData } = require('./public-data.cjs');

function assertReviewedSources(data) {
  const excluded = new Set(review.excluded_records.map(event => event.id));
  for (const event of data.events) {
    if (excluded.has(event.id)) throw new Error(`Reviewed excluded programme reintroduced: ${event.id}`);
    const correction = review.host_corrections.find(item => item.id === event.id);
    if (correction && (event.org !== correction.org || event.url !== correction.url || event.source_ref !== correction.url)) {
      throw new Error(`Reviewed presenter correction missing: ${event.id}`);
    }
  }
  return assertPublicData(data);
}

function applyReviewedSources(data) {
  const result = structuredClone(data);
  result.events = result.events.filter(event => {
    const excluded = review.excluded_records.find(item => item.id === event.id);
    if (!excluded) return true;
    if (event.org !== excluded.org || event.url !== excluded.url) {
      throw new Error(`Excluded programme changed since review; recheck before applying: ${event.id}`);
    }
    return false;
  });
  for (const event of result.events) {
    const correction = review.host_corrections.find(item => item.id === event.id);
    if (!correction) continue;
    if (!['Sixth & I', correction.org].includes(event.org) ||
        ![correction.previous_url, correction.url].includes(event.url)) {
      throw new Error(`Programme presenter changed since review; recheck before applying: ${event.id}`);
    }
    event.org = correction.org;
    event.url = correction.url;
    event.source_ref = correction.url;
  }
  return assertReviewedSources(result);
}

if (require.main === module) {
  const mode = process.argv[2] || '--check';
  const filename = process.argv[3] || path.join(__dirname, '../data/events.json');
  try {
    if (!['--check', '--apply'].includes(mode)) throw new Error('Usage: node scripts/reviewed-source-policy.cjs [--check|--apply] [events.json]');
    const input = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const result = mode === '--apply' ? applyReviewedSources(input) : assertReviewedSources(input);
    if (mode === '--apply') fs.writeFileSync(filename, JSON.stringify(result, null, 2) + '\n');
    console.log(`Reviewed source policy passed (${result.events.length} public events).`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { assertReviewedSources, applyReviewedSources };
