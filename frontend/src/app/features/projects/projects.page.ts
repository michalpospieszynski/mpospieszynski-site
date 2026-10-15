import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyComponent } from '../../shared/ui/empty.component';
import { ProjectFeatureComponent } from '../../shared/ui/project-feature.component';
import { ProjectItemComponent } from '../../shared/ui/project-item.component';
import { PROJECT_KINDS } from './project-view';
import { ProjectsPageData } from './projects.resolver';

/**
 * Projects list (docs/screens/public/03-projects-list.md). Filters are plain links and a GET form, so they
 * work before hydration and without JavaScript; the resolver re-runs whenever the query string changes.
 */
@Component({
  selector: 'app-projects-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    EmptyComponent,
    ProjectFeatureComponent,
    ProjectItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
})
export class ProjectsPage {
  /** From projectsResolver. */
  readonly data = input.required<ProjectsPageData>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);

  protected readonly kinds = PROJECT_KINDS;
  protected readonly listPath = computed(() =>
    this.language.path('projects', {}, this.data().lang),
  );
  protected readonly filtered = computed(
    () => this.data().kind !== null || this.data().tech !== null,
  );
  protected readonly featured = computed(() => this.data().projects.filter((p) => p.featured));
  protected readonly others = computed(() => this.data().projects.filter((p) => !p.featured));

  /** True once the app runs in the browser: the select then applies itself and the submit button hides. */
  protected readonly enhanced = signal(false);

  constructor() {
    afterNextRender(() => this.enhanced.set(true));

    const seo = inject(SeoService);
    const transloco = inject(TranslocoService);
    effect(() => {
      const filtered = this.filtered();
      this.data();
      seo.update({
        title: transloco.translate('projects.title'),
        description: transloco.translate('projects.intro'),
        alternates: 'projects',
        robots: filtered ? 'noindex, follow' : undefined,
      });
    });
  }

  protected onTechChange(event: Event): void {
    const tech = (event.target as HTMLSelectElement).value || null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tech, notTranslated: null },
      queryParamsHandling: 'merge',
    });
  }

  /** With scripts running the select already navigated; this only stops the full-page GET. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
  }
}
