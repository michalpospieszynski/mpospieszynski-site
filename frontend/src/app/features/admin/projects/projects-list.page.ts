import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable } from 'rxjs';

import { AdminProjectListItem, AdminProjectsControllerService, ProjectSaved } from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { relativeTime } from '../shared/editing';
import { publishMissingMessage } from './project-fields';

const FILTERS = ['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const;
type Filter = (typeof FILTERS)[number];

/** /admin/projekty (docs/screens/admin/05-projects-list.md). */
@Component({
  selector: 'adm-projects-list',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    RouterLink,
    TranslocoPipe,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects-list.page.html',
  styleUrl: './projects-list.page.scss',
})
export class ProjectsListPage {
  readonly status = input<string>();

  private readonly api = inject(AdminProjectsControllerService);
  private readonly ui = inject(AdminUi);

  protected readonly filters = FILTERS;
  protected readonly items = signal<AdminProjectListItem[] | null>(null);
  protected readonly relativeTime = relativeTime;

  protected filter(): Filter {
    return FILTERS.find((f) => f === this.status()) ?? 'ALL';
  }

  constructor() {
    effect(() => this.load(this.filter()));
  }

  private load(filter: Filter): void {
    const status = filter === 'ALL' ? undefined : filter;
    this.api.listAdminProjects({ status }).subscribe({
      next: (items) => this.items.set(items),
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  private reload(): void {
    this.load(this.filter());
  }

  /** Saved right away; on failure the order goes back. */
  protected drop(event: CdkDragDrop<AdminProjectListItem[]>): void {
    const before = this.items() ?? [];
    const next = [...before];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.saveOrder(before, next);
  }

  protected move(index: number, delta: number): void {
    const before = this.items() ?? [];
    const next = [...before];
    moveItemInArray(next, index, index + delta);
    this.saveOrder(before, next);
  }

  private saveOrder(before: AdminProjectListItem[], next: AdminProjectListItem[]): void {
    this.items.set(next);
    this.api
      .reorderAdminProjects({ projectOrderRequest: { ids: next.map((p) => p.id!) } })
      .subscribe({
        next: () => this.ui.toast('admin.projects.orderSaved'),
        error: (error: unknown) => {
          this.items.set(before);
          this.ui.fail(error);
        },
      });
  }

  protected setFeatured(item: AdminProjectListItem, featured: boolean): void {
    this.act(
      this.api.setAdminProjectFeatured({
        id: item.id!,
        projectFeaturedRequest: { featured, version: item.version },
      }),
      'admin.common.saved',
    );
  }

  protected publish(item: AdminProjectListItem): void {
    this.api.publishAdminProject({ id: item.id! }).subscribe({
      next: () => {
        this.ui.toast('admin.common.published');
        this.reload();
      },
      error: (error: unknown) => {
        const missing = publishMissingMessage(error, (k, p) => this.ui.t(k, p));
        if (missing) {
          this.ui.notify(missing);
        } else {
          this.ui.fail(error, () => this.reload());
        }
      },
    });
  }

  protected unpublish(item: AdminProjectListItem): void {
    this.act(this.api.unpublishAdminProject({ id: item.id! }), 'admin.common.unpublished');
  }

  protected archive(item: AdminProjectListItem): void {
    this.act(this.api.archiveAdminProject({ id: item.id! }), 'admin.projects.archived');
  }

  protected async remove(item: AdminProjectListItem): Promise<void> {
    if (
      !(await this.ui.confirm(this.ui.t('admin.projects.deleteConfirm', { title: item.titlePl })))
    )
      return;
    this.api.deleteAdminProject({ id: item.id! }).subscribe({
      next: () => {
        this.ui.toast('admin.common.deleted');
        this.reload();
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  private act(call: Observable<ProjectSaved>, toast: string): void {
    call.subscribe({
      next: () => {
        this.ui.toast(toast);
        this.reload();
      },
      error: (error: unknown) => {
        this.ui.fail(error, () => this.reload());
        this.reload();
      },
    });
  }
}
