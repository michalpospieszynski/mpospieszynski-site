import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AdminMediaControllerService } from '../../../api';
import {
  MediaPickerData,
  MediaPickerDialog,
  PickedMedia,
  toPicked,
} from '../media/media-picker.dialog';

/** Thumbnails for media ids, loaded once per id and shared by every field on the page. */
function useMediaCache(): (ids: string[]) => Promise<Map<string, PickedMedia>> {
  const api = inject(AdminMediaControllerService);
  const cache = new Map<string, PickedMedia>();
  return async (ids) => {
    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length) {
      const loaded = await new Promise<PickedMedia[]>((resolve) =>
        forkJoin(
          missing.map((id) =>
            api.getAdminMedia({ id }).pipe(
              map(toPicked),
              catchError(() => of<PickedMedia>({ id, url: '', altPl: null, altEn: null })),
            ),
          ),
        ).subscribe(resolve),
      );
      loaded.forEach((m) => cache.set(m.id, m));
    }
    return cache;
  };
}

function openPicker(dialog: MatDialog, multiple: boolean) {
  return dialog
    .open<MediaPickerDialog, MediaPickerData, PickedMedia[]>(MediaPickerDialog, {
      data: { multiple },
      width: '1040px',
      maxWidth: '95vw',
    })
    .afterClosed();
}

/** One image chosen from the library: the project cover or the settings portrait. */
@Component({
  selector: 'adm-media-field',
  imports: [MatButtonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" role="group" [attr.aria-labelledby]="fieldId() + '-label'">
      <span class="label" [id]="fieldId() + '-label'">
        {{ label() }}
        @if (required()) {
          <span aria-hidden="true"> *</span>
        }
      </span>
      <div class="row">
        @if (media(); as m) {
          <img class="thumb" [src]="m.url" [alt]="m.altPl ?? ''" width="160" height="104" />
        }
        <button
          mat-stroked-button
          type="button"
          [id]="fieldId()"
          (click)="pick()"
          [attr.aria-describedby]="error() ? fieldId() + '-error' : null"
          [attr.data-testid]="fieldId() + '-pick'"
        >
          {{ pickLabel() }}
        </button>
        @if (value()) {
          <button
            mat-button
            type="button"
            (click)="value.set(null)"
            [attr.data-testid]="fieldId() + '-remove'"
          >
            {{ 'admin.common.remove' | transloco }}
          </button>
        }
      </div>
      @if (error()) {
        <p class="error" [id]="fieldId() + '-error'">{{ error() }}</p>
      } @else if (media() && !media()!.altPl && altWarning()) {
        <p class="warn">{{ altWarning() }}</p>
      }
    </div>
  `,
  styleUrl: './media-field.scss',
})
export class MediaFieldComponent {
  readonly value = model<string | null>(null);
  readonly label = input.required<string>();
  readonly pickLabel = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly required = input(false);
  readonly error = input<string | null>(null);
  readonly altWarning = input<string | null>(null);

  private readonly dialog = inject(MatDialog);
  private readonly lookup = useMediaCache();
  protected readonly media = signal<PickedMedia | null>(null);

  constructor() {
    effect(() => {
      const id = this.value();
      if (!id) {
        this.media.set(null);
        return;
      }
      void this.lookup([id]).then((cache) => this.media.set(cache.get(id) ?? null));
    });
  }

  protected pick(): void {
    openPicker(this.dialog, false).subscribe((picked) => {
      if (picked?.[0]) this.value.set(picked[0].id);
    });
  }
}

/** The project gallery: thumbnails in order, drag to reorder, add from the library, remove. */
@Component({
  selector: 'adm-gallery-field',
  imports: [MatButtonModule, TranslocoPipe, CdkDropList, CdkDrag, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" role="group" [attr.aria-labelledby]="'gallery-label'">
      <span class="label" id="gallery-label">{{ 'admin.project.gallery' | transloco }}</span>
      <ul
        class="gallery"
        cdkDropList
        cdkDropListOrientation="mixed"
        (cdkDropListDropped)="drop($event)"
        data-testid="gallery"
      >
        @for (id of value(); track id; let i = $index) {
          <li class="item" cdkDrag>
            <img
              cdkDragHandle
              class="thumb"
              [src]="items()[id]?.url"
              [alt]="items()[id]?.altPl ?? ''"
              width="120"
              height="78"
            />
            <span class="actions">
              <button
                type="button"
                class="mini"
                [disabled]="i === 0"
                (click)="move(i, -1)"
                [attr.aria-label]="'admin.common.moveUp' | transloco: { name: i + 1 }"
              >
                ‹
              </button>
              <button
                type="button"
                class="mini"
                [disabled]="i === value().length - 1"
                (click)="move(i, 1)"
                [attr.aria-label]="'admin.common.moveDown' | transloco: { name: i + 1 }"
              >
                ›
              </button>
              <button
                type="button"
                class="mini"
                (click)="removeAt(i)"
                [attr.aria-label]="('admin.common.remove' | transloco) + ' ' + (i + 1)"
              >
                ×
              </button>
            </span>
          </li>
        }
      </ul>
      <button mat-stroked-button type="button" (click)="add()" data-testid="gallery-add">
        {{ 'admin.project.galleryAdd' | transloco }}
      </button>
    </div>
  `,
  styleUrl: './media-field.scss',
})
export class GalleryFieldComponent {
  readonly value = model<string[]>([]);

  private readonly dialog = inject(MatDialog);
  private readonly lookup = useMediaCache();
  protected readonly items = signal<Record<string, PickedMedia>>({});

  constructor() {
    effect(() => {
      const ids = this.value();
      void this.lookup(ids).then((cache) => this.items.set(Object.fromEntries(cache)));
    });
  }

  protected add(): void {
    openPicker(this.dialog, true).subscribe((picked) => {
      if (!picked?.length) return;
      const ids = picked.map((p) => p.id).filter((id) => !this.value().includes(id));
      this.value.set([...this.value(), ...ids]);
    });
  }

  protected drop(event: CdkDragDrop<string[]>): void {
    const next = [...this.value()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.value.set(next);
  }

  protected move(index: number, delta: number): void {
    const next = [...this.value()];
    moveItemInArray(next, index, index + delta);
    this.value.set(next);
  }

  protected removeAt(index: number): void {
    this.value.set(this.value().filter((_, i) => i !== index));
  }
}
