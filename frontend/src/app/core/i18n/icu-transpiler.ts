import { Injectable } from '@angular/core';
import { DefaultTranspiler, TranspileParams, getValue, setValue } from '@jsverse/transloco';

type Params = Record<string, unknown>;

/**
 * The ICU MessageFormat subset the translation files use: `{name}`, `{n, plural, =0 {…} one {…} other {…}}` (with
 * `#`), `{x, select, a {…} other {…}}` and apostrophe quoting (`'{name}'` is literal text, `''` is an apostrophe).
 * Plural categories come from `Intl.PluralRules`, so Polish one/few/many work. It replaces
 * @messageformat/core, which compiles messages with `new Function` and would force `'unsafe-eval'` into the CSP.
 */
export function formatIcu(message: string, params: Params, locale: string, count?: number): string {
  let out = '';
  for (let i = 0; i < message.length; i++) {
    const c = message[i];
    if (c === "'") {
      const next = message[i + 1];
      if (next === "'") {
        out += "'";
        i++;
      } else if (next === '{' || next === '}' || (next === '#' && count !== undefined)) {
        const end = message.indexOf("'", i + 1);
        const stop = end === -1 ? message.length : end;
        out += message.slice(i + 1, stop);
        i = stop;
      } else {
        out += c;
      }
    } else if (c === '#' && count !== undefined) {
      out += new Intl.NumberFormat(locale).format(count);
    } else if (c === '{') {
      const end = closing(message, i);
      out += argument(message.slice(i + 1, end), params, locale);
      i = end;
    } else {
      out += c;
    }
  }
  return out;
}

/** Index of the brace that closes the one at `open`. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return text.length;
}

function argument(body: string, params: Params, locale: string): string {
  const [name, type, ...rest] = body.split(',');
  const key = name.trim();
  const value = params[key];
  if (type === undefined) {
    return value === undefined || value === null ? `{${key}}` : String(value);
  }
  const options = choices(rest.join(','));
  if (type.trim() === 'plural') {
    const n = Number(value);
    const chosen =
      options.get(`=${n}`) ??
      options.get(new Intl.PluralRules(locale).select(n)) ??
      options.get('other') ??
      '';
    return formatIcu(chosen, params, locale, n);
  }
  if (type.trim() === 'select') {
    return formatIcu(options.get(String(value)) ?? options.get('other') ?? '', params, locale);
  }
  return value === undefined ? '' : String(value);
}

/** "one {a} few {b} other {c}" → Map(one → a, few → b, other → c). */
function choices(text: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open === -1) break;
    const selector = text.slice(i, open).trim();
    const end = closing(text, open);
    map.set(selector, text.slice(open + 1, end));
    i = end + 1;
  }
  return map;
}

/** Transloco transpiler: Transloco's own `{{ }}` and key references first, then the ICU subset above. */
@Injectable()
export class IcuTranspiler extends DefaultTranspiler {
  private locale = 'pl';

  override transpile({ value, params = {}, translation, key }: TranspileParams): unknown {
    if (!value) return value;
    if (typeof value === 'object' && !Array.isArray(value)) {
      let result = value as Params;
      for (const p of Object.keys(params)) {
        const transpiled = super.transpile({
          value: getValue(result, p),
          params: getValue(params, p),
          translation,
          key,
        });
        const nested = (params as Params)[p] as Params;
        result = setValue(result, p, formatIcu(String(transpiled), nested ?? {}, this.locale));
      }
      return result;
    }
    if (typeof value !== 'string') return value;
    const transpiled = super.transpile({ value, params, translation, key });
    return typeof transpiled === 'string'
      ? formatIcu(transpiled, params as Params, this.locale)
      : transpiled;
  }

  onLangChanged(lang: string): void {
    this.locale = lang;
  }
}
