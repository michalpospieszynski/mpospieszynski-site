import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import { AdminDashboardControllerService, DashboardResponse } from '../../../api';

const EVERY_TWO_MINUTES = 120_000;

/**
 * The unread-message badge in the sidebar (docs/screens/admin/01-admin-shell.md): from the dashboard
 * endpoint, refreshed on navigation, after a message is opened, and every 2 minutes while the tab is visible.
 */
@Injectable({ providedIn: 'root' })
export class AdminBadge {
  private readonly api = inject(AdminDashboardControllerService);
  private readonly document = inject(DOCUMENT);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly newMessages = signal(0);

  refresh(): void {
    this.api.getAdminDashboard().subscribe({
      next: (dashboard) => this.set(dashboard),
      error: () => undefined, // the badge is a hint; failures show on the pages themselves
    });
  }

  set(dashboard: DashboardResponse): void {
    this.newMessages.set(dashboard.newMessages ?? 0);
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      if (this.document.visibilityState === 'visible') this.refresh();
    }, EVERY_TWO_MINUTES);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
