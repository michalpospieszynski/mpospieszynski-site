import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { SkillsResponse } from '../../api';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { Lang, localizedUrl } from '../../core/i18n/route-table';
import { SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyComponent } from '../../shared/ui/empty.component';
import { LangFallbackComponent } from '../../shared/ui/lang-fallback.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';
import { TechTagComponent } from '../../shared/ui/tech-tag.component';

/**
 * Skills (docs/screens/public/05-skills.md): expertise areas with the projects that prove them, then
 * technologies by category with "how I use it", since-year and a link to the projects using each.
 * No level indicators of any kind.
 */
@Component({
  selector: 'app-skills-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalizedPathPipe,
    ButtonComponent,
    EmptyComponent,
    LangFallbackComponent,
    MarkdownComponent,
    TechTagComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.scss',
})
export class SkillsPage {
  /** From skillsResolver. */
  readonly skills = input.required<SkillsResponse>();

  private readonly language = inject(LanguageService);

  protected readonly pageLang = this.language.lang;

  protected readonly areas = computed(() =>
    (this.skills().areas ?? []).map((area) => ({
      id: area.id ?? '',
      fallback: area.lang !== undefined && area.lang !== this.pageLang(),
      title: area.title ?? '',
      summary: area.summary ?? '',
      descriptionMd: area.descriptionMd ?? null,
      technologies: (area.technologies ?? []).map((t) => ({
        slug: t.slug ?? '',
        name: t.name ?? '',
      })),
      projects: (area.projects ?? []).map((p) => {
        const lang = (p.lang ?? 'pl') as Lang;
        return {
          title: p.title ?? '',
          path: localizedUrl('project', lang, { slug: p.slug ?? '' }),
          polishOnly: lang !== this.pageLang(),
        };
      }),
    })),
  );

  protected readonly categories = computed(() =>
    (this.skills().categories ?? []).filter((c) => (c.technologies ?? []).length > 0),
  );

  protected readonly empty = computed(
    () => this.areas().length === 0 && this.categories().length === 0,
  );

  constructor() {
    const seo = inject(SeoService);
    const transloco = inject(TranslocoService);
    effect(() => {
      this.skills();
      seo.update({
        title: transloco.translate('skills.title'),
        description: transloco.translate('skills.lead'),
        alternates: 'skills',
      });
    });
  }

  /** Text in Polish on an English page gets `lang="pl"`. */
  protected isFallback(lang: string | undefined | null): boolean {
    return !!lang && lang !== this.pageLang();
  }
}
