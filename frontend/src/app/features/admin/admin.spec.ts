import { TranslationGapTypeEnum } from '../../api';
import { ApiError } from '../../core/http/api-error';
import { safeReturnUrl } from './auth/admin.guard';
import { isAdminToken, tokenClaims } from './auth/auth.service';
import { editorLink } from './dashboard/dashboard.page';
import { replyLink } from './messages/message-detail.component';
import { projectFieldLabel, publishMissingMessage } from './projects/project-fields';
import { allEmpty, relativeTime, snapshot, textOrNull } from './shared/editing';
import { translationState } from './shared/lang-tabs.component';

/** A token with the given payload (header and signature are not checked by the UI). */
function token(payload: object): string {
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `eyJhbGciOiJFUzI1NiJ9.${b64}.sig`;
}

const TEXTS: Record<string, string> = {
  'admin.project.summary': 'Podsumowanie',
  'admin.project.cover': 'Okładka',
  'admin.project.startedOn': 'Początek',
  'admin.media.alt': 'Tekst alternatywny',
  'admin.common.required': 'To pole jest wymagane.',
};
const t = (key: string, params?: Record<string, unknown>): string =>
  key === 'admin.project.publishMissing'
    ? `Aby opublikować, uzupełnij: ${params?.['fields']}.`
    : (TEXTS[key] ?? key);

describe('admin login helpers', () => {
  it('accepts only admin paths as the return address', () => {
    expect(safeReturnUrl('/admin/projekty?status=DRAFT')).toBe('/admin/projekty?status=DRAFT');
    expect(safeReturnUrl('/admin')).toBe('/admin');
    for (const bad of [
      'https://evil.example',
      '//evil.example/admin',
      '/administrator',
      '/',
      '/admin/logowanie',
      null,
    ]) {
      expect(safeReturnUrl(bad)).toBe('/admin');
    }
  });

  it('reads the role from the token claims, including non-ASCII payloads', () => {
    expect(isAdminToken(token({ app_metadata: { role: 'admin' }, email: 'żółw@example.pl' }))).toBe(
      true,
    );
    expect(tokenClaims(token({ email: 'żółw@example.pl' }))['email']).toBe('żółw@example.pl');
    expect(isAdminToken(token({ app_metadata: {} }))).toBe(false);
    expect(isAdminToken('garbage')).toBe(false);
    expect(isAdminToken(null)).toBe(false);
  });
});

describe('dashboard links', () => {
  it('opens each editor on the English tab', () => {
    expect(editorLink({ type: TranslationGapTypeEnum.Project, id: 'p1' })).toEqual({
      path: '/admin/projekty/p1',
      query: { lang: 'en' },
    });
    expect(editorLink({ type: TranslationGapTypeEnum.Faq, id: 'f1' }).query).toEqual({
      tab: 'faq',
      edit: 'f1',
      lang: 'en',
    });
    expect(editorLink({ type: TranslationGapTypeEnum.ExpertiseArea, id: 'a1' }).query['tab']).toBe(
      'obszary',
    );
    expect(editorLink({ type: TranslationGapTypeEnum.Media, id: 'm1' }).path).toBe('/admin/pliki');
    expect(editorLink({ type: TranslationGapTypeEnum.Settings, id: '' }).path).toBe(
      '/admin/ustawienia',
    );
  });
});

describe('reply link', () => {
  it('quotes the message under a Re: subject', () => {
    const href = replyLink(
      { email: 'anna@example.com', message: 'Linia 1\nLinia 2' },
      'Konsultacja',
    );
    const [address, query] = href.replace('mailto:', '').split('?');
    expect(decodeURIComponent(address)).toBe('anna@example.com');
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe('Re: Konsultacja');
    expect(params.get('body')).toBe('\n\n> Linia 1\n> Linia 2');
  });
});

describe('project field labels', () => {
  it('names text fields with their language and the cover alt text', () => {
    expect(projectFieldLabel('translations.pl.summary', 'x', t)).toBe('Podsumowanie (PL)');
    expect(projectFieldLabel('coverMediaId', 'To pole jest wymagane.', t)).toBe('Okładka');
    expect(projectFieldLabel('coverMediaId.en', 'x', t)).toBe('Tekst alternatywny – Okładka (EN)');
    expect(projectFieldLabel('startedOn', 'x', t)).toBe('Początek');
  });

  it('lists the missing fields of a refused publish', () => {
    const error = new ApiError(400, 'Bad Request', 'x', [
      { field: 'coverMediaId', message: 'To pole jest wymagane.' },
      { field: 'translations.pl.summary', message: 'To pole jest wymagane.' },
    ]);
    expect(publishMissingMessage(error, t)).toBe(
      'Aby opublikować, uzupełnij: Okładka, Podsumowanie (PL).',
    );
    expect(publishMissingMessage(new ApiError(409, 'Conflict', 'x'), t)).toBeNull();
  });
});

describe('editing helpers', () => {
  it('derives the translation state', () => {
    expect(translationState(['', null, undefined])).toBe('MISSING');
    expect(translationState(['a', ' '])).toBe('PARTIAL');
    expect(translationState(['a', 'b'])).toBe('COMPLETE');
  });

  it('normalises optional text and empty English groups', () => {
    expect(textOrNull('  ')).toBeNull();
    expect(textOrNull(' x ')).toBe('x');
    expect(allEmpty({ a: '', b: null, c: '  ' })).toBe(true);
    expect(allEmpty({ a: '', b: 'x' })).toBe(false);
    expect(snapshot({ a: undefined })).toBe(snapshot({ a: null }));
  });

  it('formats relative times in Polish', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(relativeTime('2026-10-15T10:00:00Z', now)).toBe('2 godz. temu');
    expect(relativeTime('2026-10-14T12:00:00Z', now)).toBe('wczoraj');
    expect(relativeTime(null, now)).toBe('');
  });

  it('formats relative times in English when the admin is English', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(relativeTime('2026-10-15T10:00:00Z', now, 'en-GB')).toBe('2 hr ago');
    expect(relativeTime('2026-10-14T12:00:00Z', now, 'en-GB')).toBe('yesterday');
  });
});
