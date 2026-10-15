import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AdminDashboardControllerService, DashboardResponse, TranslationGap } from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { relativeTime } from '../shared/editing';
import { AdminBadge } from '../shell/admin-badge';

export interface EditorLink {
  path: string;
  query: Record<string, string>;
}

/** Where each missing translation is edited, with the English tab open (docs/screens/admin/03-dashboard.md). */
export function editorLink(gap: TranslationGap): EditorLink {
  const id = gap.id ?? '';
  switch (gap.type) {
    case 'PROJECT':
      return { path: `/admin/projekty/${id}`, query: { lang: 'en' } };
    case 'SERVICE':
      return { path: '/admin/uslugi', query: { tab: 'uslugi', edit: id, lang: 'en' } };
    case 'FAQ':
      return { path: '/admin/uslugi', query: { tab: 'faq', edit: id, lang: 'en' } };
    case 'TECHNOLOGY':
      return { path: '/admin/umiejetnosci', query: { tab: 'technologie', edit: id, lang: 'en' } };
    case 'EXPERTISE_AREA':
      return { path: '/admin/umiejetnosci', query: { tab: 'obszary', edit: id, lang: 'en' } };
    case 'MEDIA':
      return { path: '/admin/pliki', query: { edit: id, lang: 'en' } };
    default:
      return { path: '/admin/ustawienia', query: { lang: 'en' } };
  }
}

/** /admin (docs/screens/admin/03-dashboard.md). */
@Component({
  selector: 'adm-dashboard',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly api = inject(AdminDashboardControllerService);
  private readonly ui = inject(AdminUi);
  private readonly badge = inject(AdminBadge);

  protected readonly data = signal<DashboardResponse | null>(null);
  protected readonly relativeTime = relativeTime;
  protected readonly editorLink = editorLink;

  constructor() {
    this.api.getAdminDashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.badge.set(data);
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  /** "2026-11-01" → "11.2026" */
  protected monthYear(iso: string | undefined): string {
    if (!iso) return '';
    const [year, month] = iso.split('-');
    return `${month}.${year}`;
  }
}
