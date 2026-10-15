// Checks every colour pair in src/styles/contrast-pairs.json against the tokens in src/styles/tokens.scss, in both
// themes: dark (:root) and light (:root[data-theme='light'] over it). Aliases such as --color-ground: var(--ink-900)
// are resolved. Exits with 1 if any pair is below its minimum.
// Usage: npm run check:contrast
import { readFileSync } from 'node:fs';

const tokensScss = readFileSync(new URL('../src/styles/tokens.scss', import.meta.url), 'utf8');
const { pairs } = JSON.parse(readFileSync(new URL('../src/styles/contrast-pairs.json', import.meta.url), 'utf8'));

const dark = readTokens(block(':root {'));
const themes = { dark, light: { ...dark, ...readTokens(block(":root[data-theme='light'] {")) } };

let failures = 0;
for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`
${theme}`);
  for (const { label, fg, bg, min } of pairs) {
    const ratio = contrastRatio(colour(tokens, fg), colour(tokens, bg));
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)} (min ${min})  ${label}`);
  }
}
console.log(failures ? `\n${failures} pair(s) below their minimum.` : '\nAll pairs pass.');
process.exit(failures ? 1 : 0);

function block(selector) {
  const start = tokensScss.indexOf(selector);
  if (start < 0) throw new Error(`"${selector}" not found in tokens.scss`);
  return tokensScss.slice(start, tokensScss.indexOf('}', start));
}

function readTokens(text) {
  return Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

/** The hex value of a token, following var(--other) aliases. */
function colour(tokens, name, seen = new Set()) {
  const value = tokens[name];
  if (!value || seen.has(name)) throw new Error(`Token ${name} has no hex value in tokens.scss`);
  if (/^#[0-9a-f]{3,6}$/i.test(value)) return value;
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (!alias) throw new Error(`Token ${name} is neither a hex colour nor an alias: ${value}`);
  return colour(tokens, alias[1], seen.add(name));
}

// Same formula as src/app/core/contrast.ts.
function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(hex) {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
