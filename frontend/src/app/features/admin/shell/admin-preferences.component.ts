import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AdminSession } from '../../../core/auth/admin-session';
import { ThemeToggleComponent } from '../../../shared/ui/theme-toggle.component';
import { setAdminLang } from '../i18n/admin-i18n';

/**
 * The admin's own settings in its top bar and on the login page (docs/screens/admin/01-admin-shell.md): light/dark
 * (shared with the public site) and the panel language. The language button shows the other language's code and
 * is named in that language, so someone who cannot read the current one can still find it.
 */
@Component({
  selector: 'adm-preferences',
  imports: [MatButtonModule, TranslocoPipe, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-theme-toggle
      [toLight]="'admin.theme.toLight' | transloco"
      [toDark]="'admin.theme.toDark' | transloco"
    />
    <button
      mat-stroked-button
      type="button"
      [attr.lang]="other()"
      [attr.aria-label]="'admin.ui.switchTo' | transloco"
      (click)="switch()"
      data-testid="admin-lang"
    >
      {{ 'admin.ui.switchShort' | transloco }}
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
  `,
})
export class AdminPreferencesComponent {
  private readonly session = inject(AdminSession);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  protected readonly other = computed(() => (this.session.language() === 'pl' ? 'en' : 'pl'));

  protected switch(): void {
    setAdminLang(this.other(), this.transloco, this.session, this.document);
  }
}
