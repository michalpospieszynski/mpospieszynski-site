import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { adminLocale } from '../i18n/admin-i18n';
import { AdminUi } from './admin-ui';

/** Editors that can hold unsaved changes (docs/screens/admin/01-admin-shell.md, Unsaved changes). */
export interface HasUnsavedChanges {
  isDirty(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (component) => {
  if (!component?.isDirty()) return true;
  const ui = inject(AdminUi);
  return ui.confirm(ui.t('admin.common.unsaved'), ui.t('admin.common.leave'));
};

/** Asks the browser to confirm closing or reloading the tab while `isDirty()` is true. Call in a constructor. */
export function warnBeforeUnload(isDirty: () => boolean): void {
  const window = inject(DOCUMENT).defaultView;
  const listener = (event: BeforeUnloadEvent): void => {
    if (isDirty()) event.preventDefault();
  };
  window?.addEventListener('beforeunload', listener);
  inject(DestroyRef).onDestroy(() => window?.removeEventListener('beforeunload', listener));
}

/** A stable JSON snapshot of a form value, for comparing against the last saved state. */
export function snapshot(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => (v === undefined ? null : v));
}

/** `SaveStatus`: "Zapisano o 14:32" next to the save button; announced politely. */
@Component({
  selector: 'adm-save-status',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="status" role="status" data-testid="save-status">
    @if (saving()) {
      {{ 'admin.common.saving' | transloco }}
    } @else if (time()) {
      {{ 'admin.common.savedAt' | transloco: { time: time() } }}
    }
  </span>`,
  styles: `
    .status {
      color: var(--color-muted);
      font-size: var(--step-small);
    }
  `,
})
export class SaveStatusComponent {
  readonly savedAt = input<Date | null>(null);
  readonly saving = input(false);
  protected readonly time = computed(() => {
    const at = this.savedAt();
    return at ? at.toLocaleTimeString(adminLocale(), { hour: '2-digit', minute: '2-digit' }) : '';
  });
}

const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();
function relativeFormat(locale: string): Intl.RelativeTimeFormat {
  let format = relativeFormats.get(locale);
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    relativeFormats.set(locale, format);
  }
  return format;
}
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 godz. temu", "wczoraj" / "2 hr. ago", "yesterday" (docs/screens/admin/03-dashboard.md). */
export function relativeTime(iso: string | undefined | null, now = Date.now(), locale = adminLocale()): string {
  if (!iso) return '';
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'minute') {
      return relativeFormat(locale).format(Math.round(seconds / size), unit);
    }
  }
  return '';
}

/** "14.10.2026, 09:12" / "14/10/2026, 09:12" */
export function dateTime(iso: string | undefined | null, locale = adminLocale()): string {
  return iso
    ? new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
    : '';
}

/** Trimmed text, or null when empty: optional API fields are sent as null, never "". */
export function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** True when every value of an English group is empty: the API then gets `en: null`. */
export function allEmpty(values: Record<string, unknown>): boolean {
  return Object.values(values).every(
    (v) => v === null || v === undefined || String(v).trim() === '',
  );
}
