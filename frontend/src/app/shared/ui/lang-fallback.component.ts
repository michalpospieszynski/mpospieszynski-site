import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Wraps text shown in Polish on an English page, so screen readers pronounce it as Polish
 * (docs/ARCHITECTURE.md §7, fallback rules). Renders inline; use `block` for paragraphs.
 */
@Component({
  selector: 'ui-lang-fallback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.lang]': 'lang()', '[class.block]': 'block()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline;
    }
    :host(.block) {
      display: block;
    }
  `,
})
export class LangFallbackComponent {
  /** The language the wrapped content is actually in. */
  readonly lang = input('pl');
  readonly block = input(false);
}
