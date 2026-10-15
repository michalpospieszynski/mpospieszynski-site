import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import DOMPurify from 'isomorphic-dompurify';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

// Common languages only, to keep the bundle small (docs/CONVENTIONS.md, Markdown).
Object.entries({ bash, java, json, sql, typescript, xml, yaml }).forEach(([name, language]) =>
  hljs.registerLanguage(name, language),
);

const markdown = new Marked(
  { gfm: true },
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight: (code, lang) =>
      hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : code,
  }),
);

/** Anchor id for a heading: lowercase ASCII, Polish letters folded ("Pliki cookies" → "pliki-cookies", "Zmiany" → "zmiany"). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Markdown → sanitised HTML; runs in SSR and the browser, and renders previews in the admin.
 * `headingIds` gives every h2 an id from its text (for a table of contents).
 */
export function renderMarkdown(source: string, options: { headingIds?: boolean } = {}): string {
  let html = markdown.parse(source ?? '', { async: false });
  if (options.headingIds) {
    html = html.replace(/<h2>(.*?)<\/h2>/g, (_, inner: string) => `<h2 id="${slugify(inner.replace(/<[^>]+>/g, ''))}">${inner}</h2>`);
  }
  // Code blocks may scroll sideways: keyboard users need to be able to focus them (WCAG 2.1.1).
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }).replace(/<pre>/g, '<pre tabindex="0">');
}

/**
 * Content Markdown with prose typography and code highlighting. Set `lang` when the text is a fallback in
 * another language than the page (e.g. Polish text on an English page).
 */
@Component({
  selector: 'ui-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-markdown prose', '[attr.lang]': 'lang()' },
  template: `<div [innerHTML]="html()"></div>`,
  styles: `
    .ui-markdown {
      display: block;
    }
    .ui-markdown pre {
      overflow-x: auto;
      padding: var(--space-5);
      border: 1px solid var(--color-line);
      border-radius: var(--radius-input);
      background: var(--color-raised);
      font-size: var(--step-small);
    }
    .ui-markdown :not(pre) > code {
      padding: 0 0.3em;
      border-radius: 6px;
      background: var(--color-raised-2);
    }
    .ui-markdown img {
      border-radius: var(--radius-panel);
    }
    .ui-markdown table {
      border-collapse: collapse;
    }
    .ui-markdown th,
    .ui-markdown td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-line);
      text-align: left;
    }
    .ui-markdown .hljs-keyword,
    .ui-markdown .hljs-built_in,
    .ui-markdown .hljs-type {
      color: var(--color-code-accent);
    }
    .ui-markdown .hljs-string,
    .ui-markdown .hljs-number {
      color: var(--color-ok);
    }
    .ui-markdown .hljs-comment {
      color: var(--color-muted);
      font-style: italic;
    }
  `,
})
export class MarkdownComponent {
  readonly markdown = input.required<string>();
  readonly lang = input<string>();
  /** Adds ids to h2 headings, so a table of contents can link to them. */
  readonly headingIds = input(false);

  private readonly sanitizer = inject(DomSanitizer);

  /** DOMPurify has already cleaned the HTML; bypassing Angular's sanitizer keeps highlight.js classes intact. */
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.markdown(), { headingIds: this.headingIds() })),
  );
}
