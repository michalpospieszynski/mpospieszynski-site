import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { ProjectDetail } from '../../api';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { Lang, localizedUrl } from '../../core/i18n/route-table';
import { ProfileStore } from '../../core/profile/profile.store';
import { creativeWorkJsonLd } from '../../core/seo/json-ld';
import { SITE_ORIGIN, SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';
import { TechTagComponent } from '../../shared/ui/tech-tag.component';
import { GalleryImageView, ProjectGalleryComponent } from './project-gallery.component';
import { yearRange } from './project-view';

type SectionKey = 'problem' | 'solution' | 'outcome' | 'lessons';

/**
 * Case study (docs/screens/public/04-project-detail.md). Takes the project as an input and nothing from the
 * route, so the admin preview can render it with its own data.
 */
@Component({
  selector: 'app-project-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalizedPathPipe,
    ButtonComponent,
    MarkdownComponent,
    TechTagComponent,
    ProjectGalleryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project.page.html',
  styleUrl: './project.page.scss',
})
export class ProjectPage {
  /** From projectResolver (or the admin preview). */
  readonly project = input.required<ProjectDetail>();

  protected readonly lang = computed(() => (this.project().lang ?? 'pl') as Lang);
  protected readonly years = computed(() =>
    yearRange(this.project().startedOn, this.project().finishedOn),
  );

  /** Sections with content, in reading order; empty optional ones are left out. */
  protected readonly sections = computed(() => {
    const p = this.project();
    const all: [SectionKey, string | undefined][] = [
      ['problem', p.problemMd],
      ['solution', p.solutionMd],
      ['outcome', p.outcomeMd],
      ['lessons', p.lessonsMd],
    ];
    return all
      .filter((entry): entry is [SectionKey, string] => !!entry[1]?.trim())
      .map(([key, markdown]) => ({ key, markdown }));
  });

  protected readonly gallery = computed<GalleryImageView[]>(() =>
    (this.project().gallery ?? []).map((g) => ({
      url: g.url ?? '',
      alt: g.alt ?? '',
      caption: g.caption ?? null,
      width: g.width ?? null,
      height: g.height ?? null,
    })),
  );

  protected readonly technologies = computed(() =>
    (this.project().technologies ?? []).map((t) => ({ slug: t.slug ?? '', name: t.name ?? '' })),
  );

  protected readonly previous = computed(() => this.neighbour(this.project().previous));
  protected readonly next = computed(() => this.neighbour(this.project().next));

  protected readonly contactQuery = computed(() => ({
    topic: 'PROJECT',
    project: this.project().slug ?? '',
  }));

  constructor() {
    const seo = inject(SeoService);
    const origin = inject(SITE_ORIGIN);
    const profile = inject(ProfileStore).profile;

    effect(() => {
      const p = this.project();
      const lang = this.lang();
      const alternates: Partial<Record<Lang, string>> = {};
      if (p.translations?.pl) {
        alternates.pl = localizedUrl('project', 'pl', { slug: p.translations.pl });
      }
      if (p.translations?.en) {
        alternates.en = localizedUrl('project', 'en', { slug: p.translations.en });
      }
      const description = p.seoDescription || p.summary || '';
      seo.update({
        title: p.title,
        description,
        alternates,
        type: 'article',
        image: p.cover?.url,
        jsonLd: creativeWorkJsonLd({
          name: p.title ?? '',
          url: new URL(
            localizedUrl('project', lang, { slug: p.slug ?? '' }),
            origin + '/',
          ).toString(),
          description,
          inLanguage: lang,
          author: profile()?.fullName ?? '',
          image: p.cover?.url ? new URL(p.cover.url, origin + '/').toString() : undefined,
          dateCreated: p.startedOn,
          keywords: (p.technologies ?? []).map((t) => t.name ?? ''),
        }),
      });
    });
  }

  private neighbour(link: { slug?: string; title?: string } | undefined) {
    return link?.slug
      ? { title: link.title ?? '', path: localizedUrl('project', this.lang(), { slug: link.slug }) }
      : null;
  }
}
