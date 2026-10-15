import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { personJsonLd } from '../../core/seo/json-ld';
import { SITE_ORIGIN, SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';
import { ContactFormComponent } from '../contact/contact-form.component';
import { ProjectView, toProjectView } from '../projects/project-view';
import { HomeData } from './home.resolver';
import { ProjectGraphComponent } from './project-graph/project-graph.component';
import { GraphProject } from './project-graph/project-graph';

/** Dashed edges between related technologies (by slug); pairs whose technologies are not on the graph are dropped. */
const TECH_LINKS: [string, string][] = [
  ['java', 'spring-boot'],
  ['spring-boot', 'postgresql'],
  ['supabase', 'postgresql'],
];

/**
 * Home (docs/screens/public/02-home.md, DIRECTION.md, docs/redesign/HANDOFF.md): the hero with the project graph,
 * services, the projects band and the contact form. The selected project is one signal shared by the chips, the
 * graph and its detail panel; "Pokaż na grafie" in the projects band sets it too.
 */
@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalizedPathPipe,
    ButtonComponent,
    MarkdownComponent,
    ContactFormComponent,
    ProjectGraphComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  /** From homeResolver, bound by withComponentInputBinding(). */
  readonly data = input.required<HomeData>();

  private readonly language = inject(LanguageService);
  private readonly document = inject(DOCUMENT);

  protected readonly lang = this.language.lang;
  protected readonly profile = computed(() => this.data().profile);
  protected readonly projects = computed<ProjectView[]>(() =>
    this.data().projects.map((item) => toProjectView(item, this.lang())),
  );
  protected readonly services = computed(() =>
    this.data().services.map((s) => ({
      id: s.id ?? '',
      title: s.title ?? '',
      summary: s.summary ?? '',
      fallback: s.lang !== undefined && s.lang !== this.lang(),
    })),
  );

  /** The graph's nodes: projects by id, technologies by slug. */
  protected readonly graphProjects = computed<GraphProject[]>(() =>
    this.projects().map((p) => ({
      id: p.id,
      label: p.title,
      tech: p.technologies.map((t) => t.slug),
    })),
  );
  protected readonly graphTech = computed(() =>
    Object.fromEntries(this.projects().flatMap((p) => p.technologies.map((t) => [t.slug, t.name]))),
  );
  protected readonly techLinks = TECH_LINKS;

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.projects().find((p) => p.id === this.selectedId()) ?? null,
  );
  protected readonly ownerEmail = computed(() =>
    (this.profile().socialLinks?.['email'] ?? '').replace(/^mailto:/, ''),
  );

  constructor() {
    const seo = inject(SeoService);
    const origin = inject(SITE_ORIGIN);
    effect(() => {
      const profile = this.profile();
      const name = profile.fullName ?? '';
      seo.update({
        fullTitle: profile.headline ? `${name} – ${profile.headline}` : name,
        alternates: 'home',
        description: plainText(profile.introMd ?? ''),
        jsonLd: personJsonLd({
          name,
          url: origin,
          sameAs: Object.entries(profile.socialLinks ?? {})
            .filter(([kind]) => kind !== 'email')
            .map(([, url]) => url),
          knowsAbout: Object.values(this.graphTech()),
        }),
      });
    });
  }

  /** Chips toggle: pressing the selected project again clears the selection. */
  protected toggle(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  protected close(): void {
    const id = this.selectedId();
    this.selectedId.set(null);
    // Back to the chip that opened it, so keyboard users stay in place.
    if (id) this.chip(id)?.focus();
  }

  /** "Pokaż na grafie": select, bring the graph into view and put focus on that project's chip. */
  protected showOnGraph(id: string): void {
    this.selectedId.set(id);
    const reduce = this.document.defaultView?.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.document.getElementById('start')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    this.chip(id)?.focus({ preventScroll: true });
  }

  private chip(id: string): HTMLElement | null {
    return this.document.querySelector<HTMLElement>(`[data-chip="${CSS.escape(id)}"] button`);
  }
}

/** Markdown to a plain sentence for the meta description. */
function plainText(markdown: string): string {
  return markdown
    .replace(/[*_`#>[\]]|\(([^)]*)\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
