import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminMessagesControllerService, MessagePage } from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { relativeTime } from '../shared/editing';

export const MESSAGE_STATUSES = ['NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM'] as const;
const PAGE_SIZE = 20;

/** Lets the opened message tell the list that it changed (status or deleted). */
@Injectable({ providedIn: 'root' })
export class MessageEvents {
  readonly changed = new Subject<void>();
}

/** /admin/wiadomosci (docs/screens/admin/04-messages.md): the list, with the opened message beside it. */
@Component({
  selector: 'adm-messages',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './messages.page.html',
  styleUrl: './messages.page.scss',
})
export class MessagesPage {
  readonly status = input<string>();
  readonly q = input<string>();
  readonly page = input<string>();

  private readonly api = inject(AdminMessagesControllerService);
  private readonly ui = inject(AdminUi);
  private readonly router = inject(Router);

  protected readonly statuses = MESSAGE_STATUSES;
  protected readonly data = signal<MessagePage | null>(null);
  protected readonly detailOpen = signal(false);
  protected readonly search$ = new Subject<string>();
  protected readonly relativeTime = relativeTime;

  protected readonly pageNumber = computed(() => Math.max(0, Number(this.page() ?? 0) || 0));
  protected readonly pages = computed(() => {
    const d = this.data();
    return d ? Math.max(1, Math.ceil((d.total ?? 0) / (d.size || PAGE_SIZE))) : 1;
  });

  constructor() {
    effect(() => this.load(this.status(), this.q(), this.pageNumber()));
    inject(MessageEvents)
      .changed.pipe(takeUntilDestroyed())
      .subscribe(() => this.load(this.status(), this.q(), this.pageNumber()));
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.setQuery({ q: q.trim() || null, page: null }));
  }

  protected count(status: string): number {
    return this.data()?.counts?.[status] ?? 0;
  }

  protected setQuery(params: Record<string, string | number | null>): void {
    void this.router.navigate(['/admin/wiadomosci'], {
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private load(status: string | undefined, q: string | undefined, page: number): void {
    const filter = MESSAGE_STATUSES.find((s) => s === status);
    this.api
      .listAdminMessages({ status: filter, q: q || undefined, page, size: PAGE_SIZE })
      .subscribe({
        next: (data) => this.data.set(data),
        error: (error: unknown) => this.ui.fail(error),
      });
  }
}
