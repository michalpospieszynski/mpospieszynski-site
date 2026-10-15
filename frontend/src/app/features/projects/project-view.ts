import { ProjectListItem } from '../../api';
import { Lang, localizedUrl } from '../../core/i18n/route-table';

export type ProjectKind = 'CLIENT' | 'PERSONAL' | 'OPEN_SOURCE';
export const PROJECT_KINDS: readonly ProjectKind[] = ['CLIENT', 'PERSONAL', 'OPEN_SOURCE'];

/** A list row as templates need it (docs/screens/public/03-projects-list.md). */
export interface ProjectView {
  id: string;
  title: string;
  summary: string;
  role: string | null;
  kind: ProjectKind;
  featured: boolean;
  years: string;
  link: string;
  /** Shown on an English page while only the Polish text exists. */
  polishOnly: boolean;
  coverUrl: string | null;
  coverAlt: string;
  technologies: { slug: string; name: string }[];
}

/** "2025", or "2023–2025" when the project spans years. */
export function yearRange(startedOn?: string, finishedOn?: string | null): string {
  const start = startedOn?.slice(0, 4) ?? '';
  const end = finishedOn?.slice(0, 4);
  return end && end !== start ? `${start}–${end}` : start;
}

/**
 * Maps an API row for a page in `pageLang`. A Polish-only project on an English page links to the Polish
 * case study (`/projekty/<pl-slug>`), since there is no English one.
 */
export function toProjectView(item: ProjectListItem, pageLang: Lang): ProjectView {
  const textLang = (item.lang ?? 'pl') as Lang;
  const polishOnly = pageLang !== 'pl' && textLang === 'pl';
  const slug = (polishOnly ? item.translations?.pl : item.slug) ?? item.slug ?? '';
  return {
    id: item.id ?? slug,
    title: item.title ?? '',
    summary: item.summary ?? '',
    role: item.role ?? null,
    kind: (item.kind ?? 'CLIENT') as ProjectKind,
    featured: item.featured ?? false,
    years: yearRange(item.startedOn, item.finishedOn),
    link: localizedUrl('project', polishOnly ? 'pl' : pageLang, { slug }),
    polishOnly,
    coverUrl: item.cover?.url ?? null,
    coverAlt: item.cover?.alt ?? '',
    technologies: (item.technologies ?? []).map((t) => ({
      slug: t.slug ?? '',
      name: t.name ?? '',
    })),
  };
}
