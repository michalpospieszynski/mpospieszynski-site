import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import {
  AdminMessagesControllerService,
  MessageDetail,
  MessageStatusRequestStatusEnum,
} from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { dateTime } from '../shared/editing';
import { AdminBadge } from '../shell/admin-badge';
import { MessageEvents } from './messages.page';

/**
 * A `mailto:` reply in the visitor's language: "Re: <topic label>" and the message quoted
 * (docs/screens/admin/04-messages.md).
 */
export function replyLink(message: MessageDetail, topicLabel: string): string {
  const quoted = (message.message ?? '')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  const subject = `Re: ${topicLabel}`;
  return `mailto:${encodeURIComponent(message.email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`\n\n${quoted}`)}`;
}

/** /admin/wiadomosci/:id: the opened message and its actions. Opening a new message marks it read (API). */
@Component({
  selector: 'adm-message-detail',
  imports: [MatButtonModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-detail.component.html',
  styleUrl: './message-detail.component.scss',
})
export class MessageDetailComponent {
  readonly id = input.required<string>();

  private readonly api = inject(AdminMessagesControllerService);
  private readonly ui = inject(AdminUi);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly badge = inject(AdminBadge);
  private readonly events = inject(MessageEvents);

  protected readonly message = signal<MessageDetail | null>(null);
  protected readonly replied = signal(false);
  protected readonly dateTime = dateTime;

  protected readonly reply = computed(() => {
    const m = this.message();
    if (!m) return '';
    const lang = m.locale === 'en' ? 'en' : 'pl';
    return replyLink(m, this.transloco.translate(`contact.topic.${m.topic}`, {}, lang));
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.replied.set(false);
      this.api.getAdminMessage({ id }).subscribe({
        next: (message) => {
          this.message.set(message);
          // Opening marked it read: the list and the badge follow.
          this.events.changed.next();
          this.badge.refresh();
        },
        error: (error: unknown) => this.ui.fail(error),
      });
    });
  }

  protected setStatus(status: `${MessageStatusRequestStatusEnum}`): void {
    const m = this.message();
    if (!m) return;
    const request = { status: status as MessageStatusRequestStatusEnum };
    this.api.setAdminMessageStatus({ id: m.id!, messageStatusRequest: request }).subscribe({
      next: () => {
        this.message.set({ ...m, status });
        this.replied.set(false);
        this.ui.toast('admin.messages.statusChanged', {
          status: this.ui.t(`admin.messages.status.${status}`),
        });
        this.events.changed.next();
        this.badge.refresh();
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  protected async remove(): Promise<void> {
    const m = this.message();
    if (!m) return;
    if (!(await this.ui.confirm(this.ui.t('admin.messages.deleteConfirm', { name: m.name }))))
      return;
    this.api.deleteAdminMessage({ id: m.id! }).subscribe({
      next: () => {
        this.ui.toast('admin.common.deleted');
        this.events.changed.next();
        this.badge.refresh();
        void this.router.navigate(['/admin/wiadomosci'], { queryParamsHandling: 'preserve' });
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }
}
