import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { ProjectListItem } from '../../api';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { toProjectView, yearRange } from './project-view';

const ITEM: ProjectListItem = {
  id: '1',
  lang: 'en' as ProjectListItem['lang'],
  slug: 'order-processing-api',
  translations: { pl: 'system-zamowien', en: 'order-processing-api' },
  title: 'Order processing system',
  summary: 'Nightly processing cut from 4 hours to 25 minutes.',
  kind: 'CLIENT' as ProjectListItem['kind'],
  featured: true,
  startedOn: '2024-03-01',
  finishedOn: '2025-02-28',
  technologies: [{ slug: 'java', name: 'Java' }],
};

describe('project view', () => {
  it('shows one year or a range', () => {
    expect(yearRange('2025-09-01', null)).toBe('2025');
    expect(yearRange('2025-01-01', '2025-06-30')).toBe('2025');
    expect(yearRange('2023-06-01', '2025-01-31')).toBe('2023–2025');
  });

  it('links to the case study in the page language', () => {
    expect(toProjectView(ITEM, 'en')).toMatchObject({
      link: '/en/projects/order-processing-api',
      polishOnly: false,
    });
  });

  it('marks Polish-only projects on English pages and links to the Polish case study', () => {
    const polish: ProjectListItem = {
      ...ITEM,
      lang: 'pl' as ProjectListItem['lang'],
      slug: 'raporty-sprzedazy',
      translations: { pl: 'raporty-sprzedazy' },
    };
    expect(toProjectView(polish, 'en')).toMatchObject({
      link: '/projekty/raporty-sprzedazy',
      polishOnly: true,
    });
    expect(toProjectView(polish, 'pl')).toMatchObject({
      link: '/projekty/raporty-sprzedazy',
      polishOnly: false,
    });
  });
});

describe('projects.count', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideI18n()] }));

  it('uses the Polish plural forms for 1, 2, 5 and 22', async () => {
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load('pl'));
    const count = (n: number) => transloco.translate('projects.count', { count: n }, 'pl');
    expect([1, 2, 5, 22].map(count)).toEqual([
      'Znaleziono 1 projekt',
      'Znaleziono 2 projekty',
      'Znaleziono 5 projektów',
      'Znaleziono 22 projekty',
    ]);
  });

  it('uses the English forms', async () => {
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load('en'));
    expect(transloco.translate('projects.count', { count: 1 }, 'en')).toBe('1 project found');
    expect(transloco.translate('projects.count', { count: 3 }, 'en')).toBe('3 projects found');
  });
});
