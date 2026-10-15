import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, firstValueFrom, map, of, startWith, switchMap, timer } from 'rxjs';

import {
  AdminExpertiseArea,
  AdminExpertiseAreasControllerService,
  AdminProject,
  AdminProjectsControllerService,
  AdminTechnology,
  AdminTechnologiesControllerService,
  ProjectInput,
  ProjectInputKindEnum,
  ProjectTexts,
} from '../../../api';
import { ApiError } from '../../../core/http/api-error';
import { slugify } from '../../../shared/ui/markdown.component';
import { AdminUi, fieldErrors } from '../shared/admin-ui';
import {
  HasUnsavedChanges,
  SaveStatusComponent,
  allEmpty,
  snapshot,
  textOrNull,
  warnBeforeUnload,
} from '../shared/editing';
import { EditLang, LangTabsComponent, translationState } from '../shared/lang-tabs.component';
import { MarkdownEditorComponent } from '../shared/markdown-editor.component';
import { GalleryFieldComponent, MediaFieldComponent } from '../shared/media-field.component';
import { publishMissingMessage } from './project-fields';

type TextKey = keyof ProjectTexts;

interface TextField {
  name: TextKey;
  label: string;
  kind: 'text' | 'slug' | 'area' | 'md';
  /** pl: needed to save a draft; publish: needed to publish; en: needed when English is started. */
  required: { pl?: 'save' | 'publish'; en?: boolean };
  max?: number;
}

const TEXT_FIELDS: TextField[] = [
  { name: 'title', label: 'title', kind: 'text', required: { pl: 'save', en: true } },
  { name: 'slug', label: 'slug', kind: 'slug', required: { pl: 'save', en: true } },
  { name: 'summary', label: 'summary', kind: 'area', required: { pl: 'publish', en: true } },
  { name: 'role', label: 'role', kind: 'text', required: {} },
  { name: 'problemMd', label: 'problem', kind: 'md', required: { pl: 'publish' } },
  { name: 'solutionMd', label: 'solution', kind: 'md', required: { pl: 'publish' } },
  { name: 'outcomeMd', label: 'outcome', kind: 'md', required: { pl: 'publish' } },
  { name: 'lessonsMd', label: 'lessons', kind: 'md', required: {} },
  { name: 'seoDescription', label: 'seo', kind: 'area', required: {}, max: 160 },
];

const KINDS = Object.values(ProjectInputKindEnum);

/** "2024-04-01" ↔ "2024-04" for the month inputs. */
const toMonth = (date: string | undefined | null): string => (date ? date.slice(0, 7) : '');
const fromMonth = (month: string): string | undefined => (month ? `${month}-01` : undefined);

/** The save time handed over from /nowy after the first save (router navigation state). */
function savedAtFromNavigation(): Date | null {
  const state = inject(Router).currentNavigation()?.extras.state as { savedAt?: string } | undefined;
  return state?.savedAt ? new Date(state.savedAt) : null;
}

/** /admin/projekty/nowy and /admin/projekty/:id (docs/screens/admin/06-project-editor.md). */
@Component({
  selector: 'adm-project-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatRadioModule,
    LangTabsComponent,
    MarkdownEditorComponent,
    MediaFieldComponent,
    GalleryFieldComponent,
    SaveStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-editor.page.html',
  styleUrl: './project-editor.page.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class ProjectEditorPage implements HasUnsavedChanges {
  /** Route param; absent on /nowy. */
  readonly id = input<string>();
  /** `?lang=en` opens the English tab. */
  readonly lang = input<string>();

  private readonly api = inject(AdminProjectsControllerService);
  private readonly technologiesApi = inject(AdminTechnologiesControllerService);
  private readonly areasApi = inject(AdminExpertiseAreasControllerService);
  private readonly ui = inject(AdminUi);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly textFields = TEXT_FIELDS;
  protected readonly kinds = KINDS;
  protected readonly langs: EditLang[] = ['pl', 'en'];

  protected readonly editLang = signal<EditLang>('pl');
  protected readonly showPl = signal(false);
  protected readonly project = signal<AdminProject | null>(null);
  protected readonly savedAt = signal<Date | null>(savedAtFromNavigation());
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly technologies = signal<AdminTechnology[]>([]);
  protected readonly areas = signal<AdminExpertiseArea[]>([]);
  private readonly saved = signal('');
  /** Slugs follow the title until edited by hand. */
  private readonly slugManual = { pl: false, en: false };

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly textGroup = (lang: EditLang) =>
    this.fb.group({
      title: '',
      slug: this.fb.control('', { asyncValidators: [this.slugAvailable(lang)] }),
      summary: '',
      role: '',
      problemMd: '',
      solutionMd: '',
      outcomeMd: '',
      lessonsMd: '',
      seoDescription: '',
    });
  protected readonly form = this.fb.group({
    shared: this.fb.group({
      kind: this.fb.control<string>(ProjectInputKindEnum.Client),
      startedOn: '',
      finishedOn: '',
      ongoing: false,
      featured: false,
      repoUrl: '',
      liveUrl: '',
      coverMediaId: this.fb.control<string | null>(null),
      galleryMediaIds: this.fb.control<string[]>([]),
      technologyIds: this.fb.control<string[]>([]),
      expertiseAreaIds: this.fb.control<string[]>([]),
    }),
    pl: this.textGroup('pl'),
    en: this.textGroup('en'),
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
  protected readonly dirty = computed(() => snapshot(this.value()) !== this.saved());
  protected readonly plState = computed(() =>
    translationState(TEXT_FIELDS.map((f) => this.value().pl[f.name])),
  );
  protected readonly enState = computed(() =>
    translationState(TEXT_FIELDS.map((f) => this.value().en[f.name])),
  );
  protected readonly isNew = computed(() => !this.id());
  protected readonly status = computed(() => this.project()?.status ?? 'DRAFT');
  protected readonly heading = computed(
    () => this.value().pl.title || this.ui.t('admin.project.new'),
  );
  protected readonly slugChanged = computed(
    () =>
      this.status() === 'PUBLISHED' &&
      this.langs.some(
        (l) =>
          (this.project()?.translations?.[l]?.slug ?? '') !== this.value()[l].slug &&
          !!this.project()?.translations?.[l]?.slug,
      ),
  );

  protected readonly techQuery = signal('');
  protected readonly areaQuery = signal('');
  protected readonly techOptions = computed(() => {
    const q = this.techQuery().trim().toLowerCase();
    const chosen = this.value().shared.technologyIds;
    return this.technologies()
      .filter((t) => !chosen.includes(t.id!) && t.name!.toLowerCase().includes(q))
      .slice(0, 12);
  });
  protected readonly canCreateTech = computed(() => {
    const q = this.techQuery().trim().toLowerCase();
    return !!q && !this.technologies().some((t) => t.name!.toLowerCase() === q);
  });
  protected readonly areaOptions = computed(() => {
    const q = this.areaQuery().trim().toLowerCase();
    const chosen = this.value().shared.expertiseAreaIds;
    return this.areas().filter(
      (a) => !chosen.includes(a.id!) && this.areaTitle(a).toLowerCase().includes(q),
    );
  });

  constructor() {
    warnBeforeUnload(() => this.dirty());
    this.technologiesApi.listAdminTechnologies().subscribe((list) => this.technologies.set(list));
    this.areasApi.listAdminExpertiseAreas().subscribe((list) => this.areas.set(list));
    effect(() => {
      const lang = this.lang();
      untracked(() => this.editLang.set(lang === 'en' ? 'en' : 'pl'));
    });
    effect(() => {
      const id = this.id();
      untracked(() => (id ? this.load(id) : this.reset(null)));
    });
    for (const lang of this.langs) {
      const group = this.form.controls[lang];
      group.controls.title.valueChanges.subscribe((title) => {
        if (!this.slugManual[lang]) group.controls.slug.setValue(slugify(title));
      });
    }
    this.form.controls.shared.controls.ongoing.valueChanges.subscribe((ongoing) => {
      const finished = this.form.controls.shared.controls.finishedOn;
      if (ongoing) finished.disable();
      else finished.enable();
    });
  }

  isDirty(): boolean {
    return this.dirty();
  }

  private load(id: string): void {
    this.api.getAdminProject({ id }).subscribe({
      next: (project) => this.reset(project),
      error: (error: unknown) => {
        this.ui.fail(error);
        if (error instanceof ApiError && error.status === 404)
          void this.router.navigateByUrl('/admin/projekty');
      },
    });
  }

  private reset(project: AdminProject | null): void {
    this.project.set(project);
    // Before the reset: the title change it causes must not overwrite a stored slug.
    this.slugManual.pl = !!project?.translations?.pl?.slug;
    this.slugManual.en = !!project?.translations?.en?.slug;
    const texts = (t: ProjectTexts | undefined) =>
      Object.fromEntries(TEXT_FIELDS.map((f) => [f.name, t?.[f.name] ?? ''])) as Record<
        TextKey,
        string
      >;
    this.form.reset({
      shared: {
        kind: project?.kind ?? ProjectInputKindEnum.Client,
        startedOn: toMonth(project?.startedOn),
        finishedOn: toMonth(project?.finishedOn),
        ongoing: !!project?.startedOn && !project?.finishedOn,
        featured: project?.featured ?? false,
        repoUrl: project?.repoUrl ?? '',
        liveUrl: project?.liveUrl ?? '',
        coverMediaId: project?.coverMediaId ?? null,
        galleryMediaIds: project?.galleryMediaIds ?? [],
        technologyIds: project?.technologyIds ?? [],
        expertiseAreaIds: project?.expertiseAreaIds ?? [],
      },
      pl: texts(project?.translations?.pl),
      en: texts(project?.translations?.en),
    });
    this.errors.set({});
    this.saved.set(snapshot(this.form.getRawValue()));
  }

  protected onSlugInput(lang: EditLang): void {
    this.slugManual[lang] = true;
  }

  protected slugFromTitle(lang: EditLang): void {
    const group = this.form.controls[lang];
    this.slugManual[lang] = false;
    group.controls.slug.setValue(slugify(group.controls.title.value));
  }

  /** Debounced uniqueness check per language (the API checks again on save). */
  private slugAvailable(lang: EditLang): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const slug = String(control.value ?? '').trim();
      if (!slug) return of(null);
      return timer(400).pipe(
        switchMap(() =>
          this.api.isAdminProjectSlugAvailable({
            locale: lang,
            slug,
            excludeId: this.id() || undefined,
          }),
        ),
        map((result) => (result.available ? null : { slugTaken: true })),
      );
    };
  }

  private input(): ProjectInput {
    const v = this.form.getRawValue();
    const texts = (t: Record<TextKey, string>): ProjectTexts =>
      Object.fromEntries(
        TEXT_FIELDS.map((f) => [f.name, textOrNull(t[f.name]) ?? undefined]),
      ) as ProjectTexts;
    return {
      version: this.project()?.version ?? 0,
      kind: v.shared.kind as ProjectInputKindEnum,
      featured: v.shared.featured,
      startedOn: fromMonth(v.shared.startedOn),
      finishedOn: v.shared.ongoing ? undefined : fromMonth(v.shared.finishedOn),
      repoUrl: textOrNull(v.shared.repoUrl) ?? undefined,
      liveUrl: textOrNull(v.shared.liveUrl) ?? undefined,
      coverMediaId: v.shared.coverMediaId ?? undefined,
      galleryMediaIds: v.shared.galleryMediaIds,
      technologyIds: v.shared.technologyIds,
      expertiseAreaIds: v.shared.expertiseAreaIds,
      translations: { pl: texts(v.pl), en: allEmpty(v.en) ? undefined : texts(v.en) },
    };
  }

  /** Saves (create or update); resolves to the project id, or null when the API refused. */
  protected async save(): Promise<string | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    this.setErrors({});
    try {
      const id = this.id();
      const result = await firstValueFrom(
        id
          ? this.api.saveAdminProject({ id, projectInput: this.input() })
          : this.api.createAdminProject({ projectInput: this.input() }),
      );
      const project = await firstValueFrom(this.api.getAdminProject({ id: result.id! }));
      this.reset(project);
      this.savedAt.set(new Date());
      if (!id) {
        // The new route is a fresh editor: it shows the same save time.
        await this.router.navigate(['/admin/projekty', result.id], {
          replaceUrl: true,
          state: { savedAt: this.savedAt()!.toISOString() },
        });
      }
      return result.id!;
    } catch (error) {
      this.showErrors(error);
      this.ui.fail(error, () => this.id() && this.load(this.id()!));
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  /** Saves first, then publishes; on missing fields lists them and focuses the first. */
  protected async publish(): Promise<void> {
    const id = this.dirty() || this.isNew() ? await this.save() : this.id()!;
    if (!id) return;
    try {
      await firstValueFrom(this.api.publishAdminProject({ id }));
      this.ui.toast('admin.common.published');
      this.load(id);
    } catch (error) {
      const missing = publishMissingMessage(error, (k, p) => this.ui.t(k, p));
      if (missing) {
        this.showErrors(error);
        this.ui.notify(missing);
      } else {
        this.ui.fail(error, () => this.load(id));
      }
    }
  }

  protected async unpublish(): Promise<void> {
    const id = this.id();
    if (!id) return;
    try {
      await firstValueFrom(this.api.unpublishAdminProject({ id }));
      this.ui.toast('admin.common.unpublished');
      this.load(id);
    } catch (error) {
      this.ui.fail(error, () => this.load(id));
    }
  }

  private showErrors(error: unknown): void {
    const errors = fieldErrors(error);
    if (
      error instanceof ApiError &&
      error.status === 400 &&
      Object.keys(errors).some((f) => f.startsWith('translations.en.')) &&
      Object.keys(errors).every((f) => !f.startsWith('translations.pl.'))
    ) {
      errors['translations.en'] = this.ui.t('admin.project.errors.enIncomplete');
    }
    this.setErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return;
    if (first.startsWith('translations.en')) this.editLang.set('en');
    else if (first.startsWith('translations.pl')) this.editLang.set('pl');
    setTimeout(() => this.document.getElementById(this.fieldId(first))?.focus());
  }

  /** API field errors go onto the controls too, so Material shows them and they clear on the next edit. */
  private setErrors(errors: Record<string, string>): void {
    this.errors.set(errors);
    for (const [field, message] of Object.entries(errors)) {
      const path = field.replace(/^translations\./, '').replace(/^(?!pl\.|en\.)/, 'shared.');
      const control = this.form.get(path);
      if (control) {
        control.setErrors({ ...(control.errors ?? {}), api: message });
        control.markAsTouched();
      }
    }
  }

  /** DOM id for an API field path ("translations.pl.title" → "project-pl-title"). */
  protected fieldId(field: string): string {
    return 'project-' + field.replace(/^translations\./, '').replace(/\./g, '-');
  }

  protected error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  protected controlError(lang: EditLang, name: TextKey): string | null {
    const control = this.form.controls[lang].controls[name];
    if (control.errors?.['slugTaken']) return this.ui.t('admin.project.errors.slugTaken');
    return (control.errors?.['api'] as string | undefined) ?? null;
  }

  protected required(field: TextField, lang: EditLang): boolean {
    return lang === 'pl' ? !!field.required.pl : !!field.required.en;
  }

  protected onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.save();
    }
  }

  // Technologies and areas ------------------------------------------------------------------------------------

  protected techName(id: string): string {
    return this.technologies().find((t) => t.id === id)?.name ?? '';
  }

  protected areaTitle(area: AdminExpertiseArea | undefined): string {
    return area?.translations?.pl?.title ?? '';
  }

  protected areaName(id: string): string {
    return this.areaTitle(this.areas().find((a) => a.id === id));
  }

  protected addTechnology(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const value = event.option.value as string;
    input.value = '';
    this.techQuery.set('');
    if (value.startsWith('new:')) {
      void this.createTechnology(value.slice(4));
      return;
    }
    this.addTo('technologyIds', value);
  }

  private async createTechnology(name: string): Promise<void> {
    try {
      const created = await firstValueFrom(
        this.technologiesApi.createAdminTechnology({ technologyInput: { version: 0, name } }),
      );
      this.technologies.update((list) => [...list, created]);
      this.addTo('technologyIds', created.id!);
      this.ui.toast('admin.project.technologyCreated', { name });
    } catch (error) {
      this.ui.fail(error);
    }
  }

  protected addArea(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    input.value = '';
    this.areaQuery.set('');
    this.addTo('expertiseAreaIds', event.option.value as string);
  }

  private addTo(list: 'technologyIds' | 'expertiseAreaIds', id: string): void {
    const control = this.form.controls.shared.controls[list];
    if (!control.value.includes(id)) control.setValue([...control.value, id]);
  }

  protected removeFrom(list: 'technologyIds' | 'expertiseAreaIds', id: string): void {
    const control = this.form.controls.shared.controls[list];
    control.setValue(control.value.filter((v) => v !== id));
  }
}
