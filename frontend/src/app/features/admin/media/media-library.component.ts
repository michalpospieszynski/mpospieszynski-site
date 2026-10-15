import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  from,
  mergeMap,
  tap,
} from 'rxjs';

import { AdminMedia, AdminMediaControllerService } from '../../../api';
import { ApiError } from '../../../core/http/api-error';
import { AdminUi } from '../shared/admin-ui';

export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 48;
const PARALLEL_UPLOADS = 3;

interface Upload {
  name: string;
  state: 'uploading' | 'done' | 'failed';
  message?: string;
}

/** Whether a media item has alt text in a language. */
export function hasAlt(media: AdminMedia, lang: 'pl' | 'en'): boolean {
  return !!media.translations?.[lang]?.altText?.trim();
}

/**
 * The media grid with search, drag-and-drop and parallel uploads (docs/screens/admin/09-media.md). Used by the
 * Pliki page (`opened` shows details) and by `adm-media-picker` (`selectable`, `toggled`).
 */
@Component({
  selector: 'adm-media-library',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>{{ 'admin.media.searchLabel' | transloco }}</mat-label>
        <input
          #searchInput
          matInput
          type="search"
          [placeholder]="'admin.media.search' | transloco"
          (input)="search$.next(searchInput.value)"
          data-testid="media-search"
        />
      </mat-form-field>
      <button mat-flat-button type="button" (click)="fileInput.click()" data-testid="media-upload">
        {{ 'admin.media.upload' | transloco }}
      </button>
      <input
        #fileInput
        hidden
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        (change)="upload(fileInput.files); fileInput.value = ''"
        data-testid="media-file"
      />
    </div>

    <div
      class="drop"
      [class.over]="dragOver()"
      (dragover)="$event.preventDefault(); dragOver.set(true)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)"
    >
      {{ 'admin.media.drop' | transloco }}
    </div>

    @if (uploads().length) {
      <ul class="uploads" aria-live="polite" data-testid="media-uploads">
        @for (u of uploads(); track $index) {
          <li [attr.data-state]="u.state">
            @switch (u.state) {
              @case ('uploading') {
                <span>{{ 'admin.media.uploading' | transloco: { name: u.name } }}</span>
                <mat-progress-bar
                  mode="indeterminate"
                  [attr.aria-label]="'admin.media.uploading' | transloco: { name: u.name }"
                />
              }
              @case ('done') {
                <span>{{ 'admin.media.uploaded' | transloco: { name: u.name } }}</span>
              }
              @default {
                <span class="failed" data-testid="media-upload-error">{{ u.message }}</span>
              }
            }
          </li>
        }
      </ul>
    }

    @if (items().length) {
      <ul class="grid" data-testid="media-grid">
        @for (m of items(); track m.id) {
          <li>
            <button
              type="button"
              class="card"
              [class.selected]="isSelected(m)"
              [attr.aria-pressed]="selectable() ? isSelected(m) : null"
              [attr.aria-label]="'admin.media.open' | transloco: { name: m.originalName ?? m.url }"
              (click)="onCard(m)"
              data-testid="media-card"
            >
              <img [src]="m.url" alt="" loading="lazy" width="200" height="130" />
              <span class="name">{{ m.originalName }}</span>
              <span class="meta">{{ m.width }}×{{ m.height }}</span>
              <span class="flags">
                @for (lang of langs; track lang) {
                  <span [class.ok]="hasAlt(m, lang)">
                    {{
                      (hasAlt(m, lang) ? 'admin.media.altOk' : 'admin.media.altMissing')
                        | transloco
                          : {
                              lang: ('admin.media.alt' + (lang === 'pl' ? 'Pl' : 'En') | transloco),
                            }
                    }}
                  </span>
                }
              </span>
              <span class="meta" data-testid="media-usage">
                {{
                  m.usageCount
                    ? ('admin.media.used' | transloco: { count: m.usageCount })
                    : ('admin.media.unused' | transloco)
                }}
              </span>
            </button>
          </li>
        }
      </ul>
      @if (items().length < total()) {
        <button mat-stroked-button type="button" class="more" (click)="loadMore()">
          {{ 'admin.media.more' | transloco }}
        </button>
      }
    } @else if (!loading()) {
      <p class="empty" data-testid="media-empty">
        {{ (query() ? 'admin.media.noResults' : 'admin.media.empty') | transloco }}
      </p>
    }
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .search {
      flex: 1 1 240px;
    }
    .drop {
      padding: var(--space-6) var(--space-4);
      border: 2px dashed var(--color-control);
      border-radius: var(--radius-panel);
      color: var(--color-muted);
      text-align: center;
      transition:
        border-color var(--dur-hover) var(--ease-out),
        background-color var(--dur-hover) var(--ease-out);
    }
    .drop.over {
      border-color: var(--color-stage);
      background: var(--color-raised);
    }
    .uploads {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
      font-size: var(--step-small);
    }
    .failed {
      color: var(--color-busy);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-4);
      margin: var(--space-5) 0 0;
      padding: 0;
      list-style: none;
    }
    .card {
      display: grid;
      gap: var(--space-1);
      width: 100%;
      padding: var(--space-2);
      border: 2px solid transparent;
      border-radius: 12px;
      background: var(--color-raised);
      color: var(--color-ink);
      font: inherit;
      font-size: var(--step-small);
      text-align: left;
      cursor: pointer;
      transition:
        border-color var(--dur-hover) var(--ease-out),
        transform var(--dur-press) var(--ease-out);
    }
    @media (hover: hover) and (pointer: fine) {
      .card:hover {
        border-color: color-mix(in srgb, var(--color-stage) 60%, transparent);
      }
    }
    .card:active {
      transform: scale(var(--press));
    }
    .card.selected {
      border-color: var(--color-stage);
    }
    .card img {
      width: 100%;
      height: auto;
      aspect-ratio: 20 / 13;
      object-fit: cover;
      border-radius: 8px;
      background: var(--color-ground);
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      color: var(--color-muted);
    }
    .flags {
      display: flex;
      gap: var(--space-2);
      color: var(--color-busy);
    }
    .flags .ok {
      color: var(--color-ok);
    }
    .more {
      margin-top: var(--space-5);
    }
    .empty {
      margin-top: var(--space-5);
      color: var(--color-muted);
    }
  `,
})
export class MediaLibraryComponent {
  /** Picker mode: a click toggles selection instead of opening details. */
  readonly selectable = input(false);
  readonly selection = input<string[]>([]);

  readonly opened = output<AdminMedia>();
  readonly toggled = output<AdminMedia>();
  /** The files of one finished upload batch, in the order they finished. */
  readonly uploaded = output<AdminMedia[]>();

  private readonly api = inject(AdminMediaControllerService);
  private readonly ui = inject(AdminUi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly langs = ['pl', 'en'] as const;
  protected readonly items = signal<AdminMedia[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly query = signal('');
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly search$ = new Subject<string>();
  protected readonly hasAlt = hasAlt;
  private page = 0;

  constructor() {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => {
        this.query.set(q.trim());
        this.reload();
      });
    this.reload();
  }

  reload(): void {
    this.page = 0;
    this.fetch(false);
  }

  /** Replaces one item after it was edited in the details dialog. */
  replace(media: AdminMedia): void {
    this.items.update((list) => list.map((m) => (m.id === media.id ? media : m)));
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((m) => m.id !== id));
    this.total.update((t) => t - 1);
  }

  protected loadMore(): void {
    this.page++;
    this.fetch(true);
  }

  private fetch(append: boolean): void {
    this.loading.set(true);
    this.api
      .listAdminMedia({ q: this.query() || undefined, page: this.page, size: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const items = page.items ?? [];
          this.items.update((current) => (append ? [...current, ...items] : items));
          this.total.set(page.total ?? 0);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.ui.fail(error);
        },
      });
  }

  protected isSelected(media: AdminMedia): boolean {
    return this.selection().includes(media.id ?? '');
  }

  protected onCard(media: AdminMedia): void {
    if (this.selectable()) this.toggled.emit(media);
    else this.opened.emit(media);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.upload(event.dataTransfer?.files ?? null);
  }

  /** Checks type and size first (the API checks the real bytes again), then uploads three at a time. */
  protected upload(list: FileList | null): void {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const queued: { file: File; index: number }[] = [];
    const next = [...this.uploads()];
    for (const file of files) {
      const problem = !MEDIA_TYPES.includes(file.type)
        ? 'admin.media.errors.type'
        : file.size > MEDIA_MAX_BYTES
          ? 'admin.media.errors.size'
          : null;
      if (problem) {
        next.push({
          name: file.name,
          state: 'failed',
          message: this.ui.t(problem, { name: file.name }),
        });
      } else {
        queued.push({ file, index: next.length });
        next.push({ name: file.name, state: 'uploading' });
      }
    }
    this.uploads.set(next);
    if (!queued.length) return;

    const done: AdminMedia[] = [];
    from(queued)
      .pipe(
        mergeMap(
          ({ file, index }) =>
            this.api.uploadAdminMedia({ file }).pipe(
              tap((media) => {
                done.push(media);
                this.setUpload(index, { name: file.name, state: 'done' });
              }),
              catchError((error: unknown) => {
                const detail =
                  error instanceof ApiError ? error.detail || error.title : String(error);
                const message = this.ui.t('admin.media.errors.failed', { name: file.name, detail });
                this.setUpload(index, { name: file.name, state: 'failed', message });
                return EMPTY;
              }),
            ),
          PARALLEL_UPLOADS,
        ),
        finalize(() => {
          if (this.destroyRef.destroyed) return;
          this.reload();
          if (done.length) this.uploaded.emit(done);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private setUpload(index: number, upload: Upload): void {
    this.uploads.update((list) => list.map((u, i) => (i === index ? upload : u)));
  }
}
