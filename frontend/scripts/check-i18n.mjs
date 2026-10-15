// Fails when a pair of translation files doesn't have exactly the same keys, or a value is empty:
// the public site (src/app/i18n/{pl,en}.json) and the admin (src/app/features/admin/i18n/admin.{pl,en}.json).
// Usage: npm run i18n:check
import { readFileSync } from 'node:fs';

const LANGS = ['pl', 'en'];
const SETS = [
  { name: 'site', file: (lang) => `../src/app/i18n/${lang}.json` },
  { name: 'admin', file: (lang) => `../src/app/features/admin/i18n/admin.${lang}.json` },
];

const problems = [];
const counts = [];

for (const set of SETS) {
  const keys = Object.fromEntries(
    LANGS.map((lang) => [lang, flatten(JSON.parse(readFileSync(new URL(set.file(lang), import.meta.url), 'utf8')))]),
  );
  for (const lang of LANGS) {
    for (const other of LANGS.filter((l) => l !== lang)) {
      for (const key of Object.keys(keys[lang])) {
        if (!(key in keys[other])) problems.push(`${set.name} ${key}: in ${lang}, missing in ${other}`);
      }
    }
    for (const [key, value] of Object.entries(keys[lang])) {
      if (typeof value !== 'string' || value.trim() === '') problems.push(`${set.name} ${key}: empty or not a string in ${lang}`);
    }
  }
  counts.push(`${Object.keys(keys.pl).length} ${set.name} keys`);
}

if (problems.length) {
  console.error(`i18n check failed:\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n check passed: ${counts.join(', ')} in ${LANGS.join(' and ')}.`);

function flatten(object, prefix = '') {
  return Object.entries(object).reduce((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? { ...all, ...flatten(value, path) } : { ...all, [path]: value };
  }, {});
}
