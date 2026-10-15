import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';

import { AdminMedia, AdminMediaControllerService, MediaTexts, MediaUsage } from '../../../api';
import { AdminUi, fieldErrors } from '../shared/admin-ui';
import { allEmpty, textOrNull } from '../shared/editing';
import { EditLang, LangTabsComponent, translationState } from '../shared/lang-tabs.component';

export interface MediaDetailsData {
  id: string;
  lang?: EditLang;
}

export interface MediaDetailsResult {
  media?: AdminMedia;
  deleted?: string;
}

/** Details, alt text and captions in both languages, usages and delete (docs/screens/admin/09-media.md). */
@Component({
  selector: 'adm-media-details',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
    LangTabsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'admin.media.details' | transloco }}</h2>
    <mat-dialog-content>
      @if (media(); as m) {
        <div class="layout">
          <img class="preview" [src]="m.url" alt="" />
          <div>
            <dl class="facts">
              <dt>{{ 'admin.media.url' | transloco }}</dt>
              <dd class="url">
                <code>{{ m.url }}</code>
                <button
                  mat-button
                  type="button"
                  (click)="copy(m.url ?? '')"
                  data-testid="media-copy"
                >
                  {{ (copied() ? 'admin.media.copied' : 'admin.media.copyUrl') | transloco }}
                </button>
              </dd>
              <dt>{{ 'admin.media.dimensions' | transloco }}</dt>
              <dd data-testid="media-dimensions">{{ m.width }}×{{ m.height }}</dd>
              <dt>{{ 'admin.media.size' | transloco }}</dt>
              <dd>{{ size(m.sizeBytes) }}</dd>
            </dl>

            <form [formGroup]="form" (ngSubmit)="save()" id="media-form">
              <adm-lang-tabs
                [(value)]="lang"
                panelId="media-lang"
                [plStatus]="state('pl')"
                [enStatus]="state('en')"
              />
              <div
                id="media-lang"
                role="tabpanel"
                [attr.aria-labelledby]="'media-lang-tab-' + lang()"
              >
                @for (l of langs; track l) {
                  <div [hidden]="lang() !== l" [formGroupName]="l" class="fields">
                    <mat-form-field>
                      <mat-label>{{ 'admin.media.alt' | transloco }}</mat-label>
                      <input
                        matInput
                        formControlName="altText"
                        [attr.data-testid]="'media-alt-' + l"
                      />
                      <mat-hint>{{ 'admin.media.altHint' | transloco }}</mat-hint>
                      @if (errors()['translations.' + l + '.altText']; as e) {
                        <mat-error>{{ e }}</mat-error>
                      }
                    </mat-form-field>
                    <mat-form-field>
                      <mat-label>{{ 'admin.media.caption' | transloco }}</mat-label>
                      <input
                        matInput
                        formControlName="caption"
                        [attr.data-testid]="'media-caption-' + l"
                      />
                    </mat-form-field>
                  </div>
                }
              </div>
            </form>

            <h3 class="used-title">{{ 'admin.media.usedIn' | transloco }}</h3>
            @if (usages().length) {
              <ul class="usages" data-testid="media-usages">
                @for (u of usages(); track $index) {
                  <li>
                    {{ 'admin.media.usageType.' + u.type | transloco }} „{{ u.label }}” ({{
                      'admin.media.role.' + u.role | transloco
                    }})
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">{{ 'admin.media.unused' | transloco }}</p>
            }
          </div>
        </div>
      } @else {
        <p>{{ 'admin.common.loading' | transloco }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button
        mat-button
        type="button"
        class="delete"
        [disabled]="!media() || usages().length > 0"
        (click)="remove()"
        data-testid="media-delete"
      >
        {{ 'admin.common.delete' | transloco }}
      </button>
      @if (usages().length) {
        <span class="muted small">{{ 'admin.media.deleteInUse' | transloco }}</span>
      }
      <span class="spacer"></span>
      <button mat-button type="button" mat-dialog-close>
        {{ 'admin.common.close' | transloco }}
      </button>
      <button
        mat-flat-button
        type="submit"
        form="media-form"
        [disabled]="saving()"
        data-testid="media-save"
      >
        {{ 'admin.common.save' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .layout {
      display: grid;
      gap: var(--space-5);
    }
    @media (min-width: 900px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }
    .preview {
      width: 100%;
      height: auto;
      max-height: 60vh;
      object-fit: contain;
      border-radius: 10px;
      background: var(--color-raised);
    }
    .facts {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-1) var(--space-4);
      margin: 0 0 var(--space-4);
    }
    .facts dt {
      color: var(--color-muted);
    }
    .facts dd {
      margin: 0;
    }
    .url {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      word-break: break-all;
    }
    .fields {
      display: grid;
      gap: var(--space-2);
      padding-top: var(--space-4);
    }
    .used-title {
      margin: var(--space-4) 0 var(--space-2);
      font-size: var(--step-body);
    }
    .usages {
      margin: 0;
      padding-left: var(--space-5);
    }
    .muted {
      color: var(--color-muted);
    }
    .small {
      font-size: var(--step-small);
    }
    .spacer {
      flex: 1;
    }
    .delete {
      color: var(--color-busy);
    }
  `,
})
export class MediaDetailsDialog {
  private readonly data = inject<MediaDetailsData>(MAT_DIALOG_DATA);
  private readonly id = this.data.id;
  private readonly api = inject(AdminMediaControllerService);
  private readonly ui = inject(AdminUi);
  private readonly ref = inject<MatDialogRef<MediaDetailsDialog, MediaDetailsResult>>(MatDialogRef);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly langs: EditLang[] = ['pl', 'en'];
  protected readonly lang = signal<EditLang>(this.data.lang ?? 'pl');
  protected readonly media = signal<AdminMedia | null>(null);
  protected readonly usages = signal<MediaUsage[]>([]);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly copied = signal(false);

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    pl: this.fb.group({ altText: '', caption: '' }),
    en: this.fb.group({ altText: '', caption: '' }),
  });

  constructor() {
    this.load();
  }

  private load(): void {
    forkJoin([
      this.api.getAdminMedia({ id: this.id }),
      this.api.listAdminMediaUsages({ id: this.id }),
    ]).subscribe({
      next: ([media, usages]) => {
        this.media.set(media);
        this.usages.set(usages);
        this.form.reset({
          pl: {
            altText: media.translations?.pl?.altText ?? '',
            caption: media.translations?.pl?.caption ?? '',
          },
          en: {
            altText: media.translations?.en?.altText ?? '',
            caption: media.translations?.en?.caption ?? '',
          },
        });
      },
      error: (error: unknown) => {
        this.ui.fail(error);
        this.ref.close();
      },
    });
  }

  protected state(lang: EditLang): 'COMPLETE' | 'PARTIAL' | 'MISSING' {
    const v = this.form.controls[lang].getRawValue();
    return v.altText.trim() ? 'COMPLETE' : translationState([v.altText, v.caption]);
  }

  protected size(bytes: number | undefined): string {
    const kb = (bytes ?? 0) / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(kb)} kB`;
  }

  protected async copy(url: string): Promise<void> {
    try {
      await this.window?.navigator.clipboard.writeText(
        new URL(url, this.window.location.origin).href,
      );
      this.copied.set(true);
    } catch {
      // Clipboard blocked: the address is visible next to the button.
    }
  }

  protected save(): void {
    const media = this.media();
    if (!media || this.saving()) return;
    const value = this.form.getRawValue();
    const texts = (t: { altText: string; caption: string }): MediaTexts | undefined =>
      allEmpty(t)
        ? undefined
        : {
            altText: textOrNull(t.altText) ?? undefined,
            caption: textOrNull(t.caption) ?? undefined,
          };
    this.saving.set(true);
    this.errors.set({});
    this.api
      .saveAdminMedia({
        id: media.id!,
        mediaInput: {
          version: media.version,
          translations: { pl: texts(value.pl), en: texts(value.en) },
        },
      })
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.ui.toast('admin.common.saved');
          this.ref.close({ media: saved });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errors.set(fieldErrors(error));
          const first = Object.keys(fieldErrors(error))[0];
          if (first?.startsWith('translations.en')) this.lang.set('en');
          this.ui.fail(error, () => this.load());
        },
      });
  }

  protected async remove(): Promise<void> {
    const media = this.media();
    if (!media) return;
    if (
      !(await this.ui.confirm(
        this.ui.t('admin.media.deleteConfirm', { name: media.originalName ?? media.url }),
      ))
    ) {
      return;
    }
    this.api.deleteAdminMedia({ id: media.id! }).subscribe({
      next: () => {
        this.ui.toast('admin.common.deleted');
        this.ref.close({ deleted: media.id });
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }
}
