import { ApiError } from '../../../core/http/api-error';

type Translate = (key: string, params?: Record<string, unknown>) => string;

const TEXT_FIELDS: Record<string, string> = {
  title: 'title',
  slug: 'slug',
  summary: 'summary',
  role: 'role',
  problemMd: 'problem',
  solutionMd: 'solution',
  outcomeMd: 'outcome',
  lessonsMd: 'lessons',
  seoDescription: 'seo',
};

const SHARED_FIELDS: Record<string, string> = {
  startedOn: 'startedOn',
  finishedOn: 'finishedOn',
  repoUrl: 'repo',
  liveUrl: 'live',
  technologyIds: 'technologies',
  expertiseAreaIds: 'areas',
  galleryMediaIds: 'gallery',
  kind: 'kind',
};

/**
 * A readable name for an API field path: "translations.pl.summary" → "Podsumowanie (PL)",
 * "coverMediaId.en" without alt text → "Tekst alternatywny – Okładka (EN)".
 */
export function projectFieldLabel(field: string, message: string, t: Translate): string {
  const text = /^translations\.(pl|en)\.(\w+)$/.exec(field);
  if (text) {
    return `${t(`admin.project.${TEXT_FIELDS[text[2]] ?? text[2]}`)} (${text[1].toUpperCase()})`;
  }
  if (field.startsWith('coverMediaId')) {
    const lang = field.endsWith('.en') ? 'EN' : 'PL';
    const altMissing = field.endsWith('.en') || message !== t('admin.common.required');
    return altMissing
      ? `${t('admin.media.alt')} – ${t('admin.project.cover')} (${lang})`
      : t('admin.project.cover');
  }
  return SHARED_FIELDS[field] ? t(`admin.project.${SHARED_FIELDS[field]}`) : field;
}

/** "Aby opublikować, uzupełnij: Okładka, Podsumowanie (PL)." from a publish 400; null for other errors. */
export function publishMissingMessage(error: unknown, t: Translate): string | null {
  if (!(error instanceof ApiError) || error.status !== 400 || !error.errors.length) return null;
  const fields = [
    ...new Set(error.errors.map((e) => projectFieldLabel(e.field, e.message, t))),
  ].join(', ');
  return t('admin.project.publishMissing', { fields });
}
