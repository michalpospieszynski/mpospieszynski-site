import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';

import { localizedUrl } from '../../../core/i18n/route-table';
import { AuthService } from '../auth/auth.service';
import { AdminBadge } from './admin-badge';
import { AdminPreferencesComponent } from './admin-preferences.component';

interface NavItem {
  path: string;
  key: string;
  exact?: boolean;
  badge?: boolean;
}

const NAV: NavItem[] = [
  { path: '/admin', key: 'dashboard', exact: true },
  { path: '/admin/wiadomosci', key: 'messages', badge: true },
  { path: '/admin/projekty', key: 'projects' },
  { path: '/admin/umiejetnosci', key: 'skills' },
  { path: '/admin/uslugi', key: 'services' },
  { path: '/admin/pliki', key: 'media' },
  { path: '/admin/ustawienia', key: 'settings' },
];

/** Layout and navigation of every signed-in admin screen (docs/screens/admin/01-admin-shell.md). */
@Component({
  selector: 'adm-shell',
  imports: [
    MatSidenavModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    AdminPreferencesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly badge = inject(AdminBadge);
  protected readonly nav = NAV;
  protected readonly siteUrl = localizedUrl('home', 'pl');

  /** Below 960 px the sidebar is a drawer. */
  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 959.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly sidenav = viewChild.required(MatSidenav);

  constructor() {
    const router = inject(Router);
    this.badge.refresh();
    this.badge.start();
    inject(DestroyRef).onDestroy(() => this.badge.stop());
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.badge.refresh();
        if (this.narrow()) void this.sidenav().close();
      });
  }

  protected toggleMenu(): void {
    void this.sidenav().toggle();
  }

  protected logout(): void {
    void this.auth.signOut();
  }
}
