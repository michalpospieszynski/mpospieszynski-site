import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

import { AdminMedia } from '../../../api';
import { MediaLibraryComponent } from './media-library.component';

export interface MediaPickerData {
  multiple: boolean;
}

/** What editors get back: enough to show a thumbnail and insert Markdown. */
export interface PickedMedia {
  id: string;
  url: string;
  altPl: string | null;
  altEn: string | null;
}

export function toPicked(media: AdminMedia): PickedMedia {
  return {
    id: media.id ?? '',
    url: media.url ?? '',
    altPl: media.translations?.pl?.altText ?? null,
    altEn: media.translations?.en?.altText ?? null,
  };
}

/**
 * `adm-media-picker`: the media grid in selection mode, with uploads inside (docs/screens/admin/09-media.md).
 * Closes with the picked media, in the order they were selected.
 */
@Component({
  selector: 'adm-media-picker',
  imports: [MatDialogModule, MatButtonModule, TranslocoPipe, MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'admin.media.pickTitle' | transloco }}</h2>
    <mat-dialog-content>
      <adm-media-library
        [selectable]="true"
        [selection]="ids()"
        (toggled)="toggle($event)"
        (uploaded)="onUploaded($event)"
      />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'admin.common.cancel' | transloco }}
      </button>
      <button
        mat-flat-button
        type="button"
        [disabled]="!picked().length"
        (click)="ref.close(picked())"
        data-testid="media-pick"
      >
        {{
          (data.multiple ? 'admin.media.selectCount' : 'admin.media.select')
            | transloco: { count: picked().length }
        }}
      </button>
    </mat-dialog-actions>
  `,
})
export class MediaPickerDialog {
  protected readonly data = inject<MediaPickerData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<MediaPickerDialog, PickedMedia[]>>(MatDialogRef);
  protected readonly picked = signal<PickedMedia[]>([]);
  protected readonly ids = signal<string[]>([]);

  protected toggle(media: AdminMedia): void {
    const item = toPicked(media);
    const exists = this.picked().some((p) => p.id === item.id);
    const next = exists
      ? this.picked().filter((p) => p.id !== item.id)
      : this.data.multiple
        ? [...this.picked(), item]
        : [item];
    this.picked.set(next);
    this.ids.set(next.map((p) => p.id));
  }

  /** Fresh uploads are selected right away. */
  protected onUploaded(media: AdminMedia[]): void {
    for (const m of this.data.multiple ? media : media.slice(0, 1)) {
      if (!this.ids().includes(m.id ?? '')) this.toggle(m);
    }
  }
}
