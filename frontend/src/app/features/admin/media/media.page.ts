import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

import { AdminMedia } from '../../../api';
import { MediaDetailsData, MediaDetailsDialog, MediaDetailsResult } from './media-details.dialog';
import { MediaLibraryComponent } from './media-library.component';

/** /admin/pliki (docs/screens/admin/09-media.md). */
@Component({
  selector: 'adm-media-page',
  imports: [TranslocoPipe, MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-page">
      <h1 class="adm-title">{{ 'admin.media.title' | transloco }}</h1>
      <adm-media-library (opened)="open($event)" (uploaded)="open($event[0])" />
    </div>
  `,
})
export class MediaPage {
  /** `?edit=<id>&lang=en` opens that file's details (dashboard links). */
  readonly edit = input<string>();
  readonly lang = input<string>();

  private readonly dialog = inject(MatDialog);
  private readonly library = viewChild.required(MediaLibraryComponent);

  constructor() {
    afterNextRender(() => {
      const id = this.edit();
      if (id) this.open({ id }, this.lang() === 'en' ? 'en' : 'pl');
    });
  }

  /** Details for a clicked file, and for the first file of each upload so alt text gets written right away. */
  protected open(media: AdminMedia, lang: 'pl' | 'en' = 'pl'): void {
    this.dialog
      .open<MediaDetailsDialog, MediaDetailsData, MediaDetailsResult>(MediaDetailsDialog, {
        data: { id: media.id ?? '', lang },
        width: '1040px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.media) this.library().replace(result.media);
        if (result?.deleted) this.library().remove(result.deleted);
      });
  }
}
