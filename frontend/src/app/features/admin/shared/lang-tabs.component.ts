import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export type EditLang = 'pl' | 'en';
export type TranslationState = 'COMPLETE' | 'PARTIAL' | 'MISSING';

/**
 * `adm-lang-tabs`: Polish / English tabs with a status chip (docs/screens/admin/01-admin-shell.md). Only the
 * tab bar; the parent shows the fields of the selected language in the element whose id is `panelId`.
 */
@Component({
  selector: 'adm-lang-tabs',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="tabs"
      role="tablist"
      [attr.aria-label]="'admin.lang.tabs' | transloco"
      (keydown)="onKey($event)"
    >
      @for (lang of langs; track lang) {
        <button
          type="button"
          role="tab"
          class="tab"
          [id]="panelId() + '-tab-' + lang"
          [attr.aria-selected]="value() === lang"
          [attr.aria-controls]="panelId()"
          [tabindex]="value() === lang ? 0 : -1"
          [attr.data-testid]="'lang-tab-' + lang"
          (click)="value.set(lang)"
        >
          <span>{{ 'admin.lang.' + lang | transloco }}</span>
          @let state = lang === 'pl' ? plStatus() : enStatus();
          @if (state) {
            <span class="chip" [attr.data-state]="state">{{
              'admin.lang.status.' + state | transloco
            }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .tabs {
      display: flex;
      gap: var(--space-2);
      border-bottom: 1px solid var(--color-line);
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--color-muted);
      font: inherit;
      cursor: pointer;
      transition:
        color var(--dur-hover) var(--ease-out),
        border-color var(--dur-hover) var(--ease-out);
    }
    .tab:hover,
    .tab[aria-selected='true'] {
      color: var(--color-ink);
    }
    .tab[aria-selected='true'] {
      border-bottom-color: var(--color-stage);
    }
    .tab:active {
      transform: translateY(1px);
    }
    .chip {
      padding: 0 var(--space-2);
      border-radius: 999px;
      background: var(--color-raised);
      color: var(--color-ink);
      font-size: var(--step-small);
    }
    .chip[data-state='COMPLETE'] {
      color: var(--color-ok);
    }
    .chip[data-state='MISSING'] {
      color: var(--color-busy);
    }
  `,
})
export class LangTabsComponent {
  readonly value = model<EditLang>('pl');
  readonly panelId = input('lang-panel');
  readonly plStatus = input<TranslationState | null>(null);
  readonly enStatus = input<TranslationState | null>(null);

  protected readonly langs: EditLang[] = ['pl', 'en'];
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Arrow keys switch tabs (WAI-ARIA tabs pattern). */
  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: EditLang = this.value() === 'pl' ? 'en' : 'pl';
    this.value.set(next);
    this.host.nativeElement.querySelector<HTMLElement>(`[data-testid="lang-tab-${next}"]`)?.focus();
  }
}

/** complete / partial / missing from field values, for the live chips while editing. */
export function translationState(values: (string | null | undefined)[]): TranslationState {
  const filled = values.filter((v) => (v ?? '').trim() !== '').length;
  return filled === 0 ? 'MISSING' : filled === values.length ? 'COMPLETE' : 'PARTIAL';
}
