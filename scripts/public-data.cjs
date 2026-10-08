const fs = require('node:fs');
const path = require('node:path');

// Only whole, labelled private provenance segments may be removed. Public
// references and event facts must survive unchanged; ambiguous input fails.
const MAIL_SEGMENT = /^(?:mail|email|gmail|mailbox)\s*:\s*(?:[a-z0-9_-]{8,}|https?:\/\/(?:mail|inbox)\.google\.com\S*)\s*$/i;
const GMAIL_SEGMENT = /^gmail\s+(?:msg|message|thread)\s+[a-z0-9_-]{8,}\b/i;
const PRIVATE_LABEL = /\b(?:mail|email|gmail|mailbox)\s*:\s*[a-z0-9_-]{8,}(?=[\s|,;)]|$)|\b(?:gmail[_ -]?)?(?:message|thread)[_ -]?id\s*[:=]\s*\S|\b(?:gmail|personal|private)\s+inbox\b|\bgmail\s+(?:msg|message|thread)\s+[a-z0-9_-]{8,}\b/i;
const INBOX_URL = /(?:mail|inbox)\.google\.com(?:[/:?#\s]|$)/i;
const MAIL_ID = /\b[0-9a-f]{16,}\b/i;
const PRIVATE_KEY = /^(?:(?:gmail|mailbox)[_-]?)?(?:message|thread)[_-]?ids?$|^(?:gmail|mailbox)[_-]?(?:id|ids|url)$/i;

function assertPublicData(data) {
  const problems = [];
  function visit(value, field) {
    if (typeof value === 'string') {
      if (PRIVATE_LABEL.test(value) || INBOX_URL.test(value) ||
          (/\.(?:source_ref|provenance|notes?)(?:\[\d+\])?$/.test(field) &&
           MAIL_ID.test(value.replace(/https?:\/\/[^\s|]+/gi, ''))) ) {
        problems.push(field);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${field}[${index}]`));
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (PRIVATE_KEY.test(key)) problems.push(`${field}.${key}`);
        visit(item, `${field}.${key}`);
      }
    }
  }
  visit(data, 'data');
  // Never include offending values in logs or public CI output.
  if (problems.length) throw new Error(`Private mailbox metadata in public data at: ${problems.join(', ')}`);
  return data;
}

function sanitizePublicData(data) {
  const result = structuredClone(data);
  for (const event of result.events || []) {
    if (typeof event.source_ref !== 'string') continue;
    const segments = event.source_ref.split(' | ');
    event.source_ref = segments.filter(segment => {
      const text = segment.trim();
      return !MAIL_SEGMENT.test(text) && !(GMAIL_SEGMENT.test(text) && !/https?:\/\//i.test(text));
    }).join(' | ');
    if (!event.source_ref && segments.some(segment => segment.length) && /^https?:\/\//i.test(event.url || '')) event.source_ref = event.url;
  }
  return assertPublicData(result);
}

if (require.main === module) {
  const mode = process.argv[2] || '--check';
  if (!['--check', '--sanitize'].includes(mode)) {
    console.error('Usage: node scripts/public-data.cjs [--check|--sanitize] [events.json]');
    process.exit(1);
  }
  const filename = process.argv[3] || path.join(__dirname, '../data/events.json');
  try {
    const original = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const result = mode === '--sanitize' ? sanitizePublicData(original) : assertPublicData(original);
    if (mode === '--sanitize') fs.writeFileSync(filename, JSON.stringify(result, null, 2) + '\n');
    console.log(`Public-data privacy check passed (${result.events.length} events).`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { assertPublicData, sanitizePublicData };
