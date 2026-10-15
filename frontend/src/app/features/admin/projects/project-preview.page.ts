import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AdminProjectsControllerService, ProjectDetail } from '../../../api';
import { ProjectPage } from '../../projects/project.page';
import { AdminSession } from '../../../core/auth/admin-session';
import { restoreAdminLang } from '../i18n/admin-i18n';
import { AdminUi } from '../shared/admin-ui';

/**
 * /admin/projekty/:id/podglad?lang=pl|en (docs/screens/admin/06-project-editor.md, Preview): the public case
 * study component with draft data, inside a minimal frame with a "not published" banner.
 */
@Component({
  selector: 'adm-project-preview',
  imports: [RouterLink, TranslocoPipe, ProjectPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" role="status" data-testid="preview-banner">
      <strong>{{ 'admin.project.previewBanner' | transloco }}</strong>
      <span class="lang">{{ 'admin.lang.' + language() | transloco }}</span>
      <a [routerLink]="['/admin/projekty', id()]" [queryParams]="{ lang: language() }">
        {{ 'admin.project.previewBack' | transloco }}
      </a>
    </div>
    @if (project(); as p) {
      <main id="main">
        <app-project-page [project]="p" />
      </main>
    }
  `,
  styles: `
    .banner {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) var(--page-gutter);
      background: var(--color-stage);
      color: var(--color-stage-ink);
    }
    .banner a {
      margin-left: auto;
      color: inherit;
    }
  `,
})
export class ProjectPreviewPage {
  readonly id = input.required<string>();
  readonly lang = input<string>();

  private readonly api = inject(AdminProjectsControllerService);
  private readonly ui = inject(AdminUi);
  private readonly transloco = inject(TranslocoService);

  protected readonly project = signal<ProjectDetail | null>(null);
  protected readonly language = signal<'pl' | 'en'>('pl');

  constructor() {
    // The public labels follow the previewed language; the admin's own language is back afterwards.
    const session = inject(AdminSession);
    inject(DestroyRef).onDestroy(() => restoreAdminLang(this.transloco, session));
    effect(() => {
      const id = this.id();
      const lang = this.lang() === 'en' ? 'en' : 'pl';
      untracked(() => {
        this.language.set(lang);
        this.transloco.setActiveLang(lang);
        this.api.previewAdminProject({ id, lang }).subscribe({
          next: (project) => this.project.set(project),
          error: (error: unknown) => this.ui.fail(error),
        });
      });
    });
  }
}
