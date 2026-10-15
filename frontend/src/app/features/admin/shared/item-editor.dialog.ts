import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, filter, firstValueFrom, map, merge, startWith } from 'rxjs';

import { AdminUi, fieldErrors } from './admin-ui';
import { allEmpty, snapshot, textOrNull } from './editing';
import { EditLang, LangTabsComponent, translationState } from './lang-tabs.component';
import { MarkdownEditorComponent } from './markdown-editor.component';

export interface TextFieldDef {
  name: string;
  /** Translation key of the label. */
  label: string;
  kind: 'text' | 'area' | 'md';
  requiredPl?: boolean;
  requiredEn?: boolean;
  max?: number;
  /** Translation key of a hint. */
  hint?: string;
}

export interface Option {
  value: string;
  label: string;
  /** A short marker after the label, e.g. "Szkic". */
  note?: string;
}

export interface SharedFieldDef {
  name: string;
  label: string;
  kind: 'text' | 'number' | 'checkbox' | 'select' | 'multi';
  required?: boolean;
  options?: Option[];
}

export type Texts = Record<string, string | undefined>;

export interface ItemValue {
  shared: Record<string, unknown>;
  pl: Texts;
  /** undefined when every English field is empty: the API then stores no English translation. */
  en: Texts | undefined;
}

export interface ItemEditorConfig {
  /** Translation key of the dialog title. */
  title: string;
  idPrefix: string;
  texts: TextFieldDef[];
  shared: SharedFieldDef[];
  /** Shared fields above the language tabs (technology) or below them (areas). */
  sharedFirst?: boolean;
  /** pl/en: the item's generated `*Texts` objects, read by field name. */
  initial: { shared: Record<string, unknown>; pl?: object | null; en?: object | null };
  lang?: EditLang;
  save: (value: ItemValue) => Observable<unknown>;
  remove?: { message: string; call: () => Observable<unknown> };
}

export type ItemEditorResult = 'saved' | 'deleted' | undefined;

/** Opens the editor as a side panel (docs/screens/admin/07-skills.md, 08-services-faq.md). */
export function openItemEditor(
  dialog: MatDialog,
  config: ItemEditorConfig,
): Promise<ItemEditorResult> {
  const options: MatDialogConfig<ItemEditorConfig> = {
    data: config,
    width: '720px',
    maxWidth: '100vw',
    height: '100dvh',
    position: { right: '0', top: '0' },
    panelClass: 'adm-side-panel',
    enterAnimationDuration: 0,
    disableClose: true,
    autoFocus: 'first-tabbable',
  };
  return firstValueFrom(
    dialog
      .open<ItemEditorDialog, ItemEditorConfig, ItemEditorResult>(ItemEditorDialog, options)
      .afterClosed(),
  );
}

/**
 * One editor for the translated list items of the admin (technology, expertise area, service, FAQ): shared
 * fields edited once, the texts in Polish and English tabs, API field errors shown on the fields.
 */
@Component({
  selector: 'adm-item-editor',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    LangTabsComponent,
    MarkdownEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-editor.dialog.html',
  styleUrl: './item-editor.dialog.scss',
})
export class ItemEditorDialog {
  protected readonly config = inject<ItemEditorConfig>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ItemEditorDialog, ItemEditorResult>>(MatDialogRef);
  private readonly ui = inject(AdminUi);

  protected readonly langs: EditLang[] = ['pl', 'en'];
  protected readonly lang = signal<EditLang>(this.config.lang ?? 'pl');
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    shared: new FormGroup(
      Object.fromEntries(
        this.config.shared.map((f) => [
          f.name,
          new FormControl<unknown>(
            this.config.initial.shared[f.name] ??
              (f.kind === 'multi' ? [] : f.kind === 'checkbox' ? false : ''),
            {
              nonNullable: true,
            },
          ),
        ]),
      ),
    ),
    pl: this.textGroup(this.config.initial.pl),
    en: this.textGroup(this.config.initial.en),
  });

  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    {
      requireSync: true,
    },
  );
  private readonly initial = snapshot(this.form.getRawValue());
  protected readonly dirty = computed(() => snapshot(this.value()) !== this.initial);
  protected readonly plState = computed(() =>
    translationState(this.config.texts.map((f) => this.value().pl[f.name] as string)),
  );
  protected readonly enState = computed(() =>
    translationState(this.config.texts.map((f) => this.value().en[f.name] as string)),
  );

  constructor() {
    // Closing by backdrop or Escape asks first when something changed.
    merge(
      this.ref.backdropClick(),
      this.ref.keydownEvents().pipe(filter((e) => e.key === 'Escape')),
    ).subscribe(() => void this.close());
  }

  private textGroup(
    source: object | null | undefined,
  ): FormGroup<Record<string, FormControl<string>>> {
    const texts = (source ?? {}) as Texts;
    return new FormGroup(
      Object.fromEntries(
        this.config.texts.map((f) => [
          f.name,
          new FormControl(texts[f.name] ?? '', { nonNullable: true }),
        ]),
      ),
    );
  }

  protected id(name: string, lang?: EditLang): string {
    return `${this.config.idPrefix}-${lang ? lang + '-' : ''}${name}`;
  }

  protected textError(lang: EditLang, name: string): string | null {
    return this.errors()[`translations.${lang}.${name}`] ?? null;
  }

  protected sharedError(name: string): string | null {
    return this.errors()[name] ?? null;
  }

  protected required(f: TextFieldDef, lang: EditLang): boolean {
    return lang === 'pl' ? !!f.requiredPl : !!f.requiredEn;
  }

  protected length(lang: EditLang, name: string): number {
    return String(this.value()[lang][name] ?? '').length;
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const raw = this.form.getRawValue();
    const texts = (t: Record<string, string>): Texts =>
      Object.fromEntries(Object.entries(t).map(([k, v]) => [k, textOrNull(v) ?? undefined]));
    const shared = Object.fromEntries(
      Object.entries(raw.shared).map(([k, v]) => [
        k,
        typeof v === 'string' ? (textOrNull(v) ?? undefined) : v,
      ]),
    );
    this.saving.set(true);
    this.setErrors({});
    try {
      await firstValueFrom(
        this.config.save({
          shared,
          pl: texts(raw.pl),
          en: allEmpty(raw.en) ? undefined : texts(raw.en),
        }),
      );
      this.ui.toast('admin.common.saved');
      this.ref.close('saved');
    } catch (error) {
      const errors = fieldErrors(error);
      this.setErrors(errors);
      const first = Object.keys(errors)[0];
      if (first?.startsWith('translations.en')) this.lang.set('en');
      else if (first?.startsWith('translations.pl')) this.lang.set('pl');
      this.ui.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  private setErrors(errors: Record<string, string>): void {
    this.errors.set(errors);
    for (const [field, message] of Object.entries(errors)) {
      const control = this.form.get(
        field.replace(/^translations\./, '').replace(/^(?!pl\.|en\.)/, 'shared.'),
      );
      control?.setErrors({ api: message });
      control?.markAsTouched();
    }
  }

  protected async remove(): Promise<void> {
    const remove = this.config.remove;
    if (!remove || !(await this.ui.confirm(remove.message))) return;
    try {
      await firstValueFrom(remove.call());
      this.ui.toast('admin.common.deleted');
      this.ref.close('deleted');
    } catch (error) {
      this.ui.fail(error);
    }
  }

  protected async close(): Promise<void> {
    if (
      this.dirty() &&
      !(await this.ui.confirm(this.ui.t('admin.common.unsaved'), this.ui.t('admin.common.leave')))
    ) {
      return;
    }
    this.ref.close();
  }
}
