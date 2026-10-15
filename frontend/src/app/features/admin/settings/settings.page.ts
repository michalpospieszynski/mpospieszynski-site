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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom, forkJoin, map, startWith } from 'rxjs';

import {
  AdminProfile,
  AdminProfileControllerService,
  AdminProjectListItem,
  AdminProjectsControllerService,
  AvailabilitySettingsStatusEnum,
  ProfileInput,
  ProfileTexts,
} from '../../../api';
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
import { MediaFieldComponent } from '../shared/media-field.component';

type TextKey = keyof ProfileTexts;
const TEXT_KEYS: TextKey[] = [
  'headline',
  'introMd',
  'aboutMd',
  'approachMd',
  'locationLabel',
  'autoreplySubject',
  'autoreplyBodyMd',
];
const STATUSES = Object.values(AvailabilitySettingsStatusEnum);
/** The headline is the display heading of Home: longer than this may not fit. */
export const HEADLINE_WARN = 90;

/** /admin/ustawienia#sekcja (docs/screens/admin/10-settings.md). */
@Component({
  selector: 'adm-settings',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    LangTabsComponent,
    MarkdownEditorComponent,
    MediaFieldComponent,
    SaveStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class SettingsPage implements HasUnsavedChanges {
  /** `?lang=en` opens the English tabs (dashboard links). */
  readonly lang = input<string>();

  private readonly api = inject(AdminProfileControllerService);
  private readonly projectsApi = inject(AdminProjectsControllerService);
  private readonly ui = inject(AdminUi);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);

  protected readonly statuses = STATUSES;
  protected readonly langs: EditLang[] = ['pl', 'en'];
  protected readonly headlineWarn = HEADLINE_WARN;
  /** One language choice for every section with translatable fields. */
  protected readonly editLang = signal<EditLang>('pl');
  protected readonly profile = signal<AdminProfile | null>(null);
  protected readonly projects = signal<AdminProjectListItem[]>([]);
  protected readonly savedAt = signal<Date | null>(null);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  private readonly saved = signal('');

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly textGroup = () =>
    this.fb.group(Object.fromEntries(TEXT_KEYS.map((k) => [k, ''])) as Record<TextKey, string>);
  protected readonly form = this.fb.group({
    fullName: '',
    availability: this.fb.group({
      status: this.fb.control<string>(AvailabilitySettingsStatusEnum.Open),
      from: '',
      visible: true,
    }),
    socialLinks: this.fb.group({ github: '', linkedin: '', email: '' }),
    portraitMediaId: this.fb.control<string | null>(null),
    siteProjectId: '',
    pl: this.textGroup(),
    en: this.textGroup(),
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
  protected readonly dirty = computed(
    () => !!this.saved() && snapshot(this.value()) !== this.saved(),
  );
  protected readonly enState = computed(() =>
    translationState(TEXT_KEYS.map((k) => this.value().en[k])),
  );
  protected readonly plState = computed(() =>
    translationState(TEXT_KEYS.map((k) => this.value().pl[k])),
  );

  constructor() {
    warnBeforeUnload(() => this.dirty());
    effect(() => {
      const lang = this.lang();
      untracked(() => this.editLang.set(lang === 'en' ? 'en' : 'pl'));
    });
    forkJoin([this.api.getAdminProfile(), this.projectsApi.listAdminProjects({})]).subscribe({
      next: ([profile, projects]) => {
        this.projects.set(projects);
        this.reset(profile);
        this.scrollToFragment();
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  isDirty(): boolean {
    return this.dirty();
  }

  /** The admin scrolls inside the sidenav content, where the router's anchor scrolling doesn't reach. */
  private scrollToFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;
    setTimeout(() => this.document.getElementById(fragment)?.scrollIntoView({ block: 'start' }));
  }

  private reset(profile: AdminProfile): void {
    this.profile.set(profile);
    const texts = (t: ProfileTexts | undefined) =>
      Object.fromEntries(TEXT_KEYS.map((k) => [k, t?.[k] ?? ''])) as Record<TextKey, string>;
    this.form.reset({
      fullName: profile.fullName ?? '',
      availability: {
        status: profile.availability?.status ?? AvailabilitySettingsStatusEnum.Open,
        from: profile.availability?.from?.slice(0, 7) ?? '',
        visible: profile.availability?.visible ?? true,
      },
      socialLinks: {
        github: profile.socialLinks?.github ?? '',
        linkedin: profile.socialLinks?.linkedin ?? '',
        email: profile.socialLinks?.email ?? '',
      },
      portraitMediaId: profile.portraitMediaId ?? null,
      siteProjectId: profile.siteProjectId ?? '',
      pl: texts(profile.translations?.pl),
      en: texts(profile.translations?.en),
    });
    this.errors.set({});
    this.saved.set(snapshot(this.form.getRawValue()));
  }

  private input(): ProfileInput {
    const v = this.form.getRawValue();
    const texts = (t: Record<TextKey, string>): ProfileTexts =>
      Object.fromEntries(TEXT_KEYS.map((k) => [k, textOrNull(t[k]) ?? undefined])) as ProfileTexts;
    return {
      version: this.profile()?.version ?? 0,
      fullName: v.fullName.trim(),
      availability: {
        status: v.availability.status as AvailabilitySettingsStatusEnum,
        from: v.availability.from ? `${v.availability.from}-01` : undefined,
        visible: v.availability.visible,
      },
      socialLinks: {
        github: textOrNull(v.socialLinks.github) ?? undefined,
        linkedin: textOrNull(v.socialLinks.linkedin) ?? undefined,
        email: textOrNull(v.socialLinks.email) ?? undefined,
      },
      portraitMediaId: v.portraitMediaId ?? undefined,
      siteProjectId: v.siteProjectId || undefined,
      translations: { pl: texts(v.pl), en: allEmpty(v.en) ? undefined : texts(v.en) },
    };
  }

  protected async save(): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    this.setErrors({});
    try {
      const profile = await firstValueFrom(
        this.api.saveAdminProfile({ profileInput: this.input() }),
      );
      this.reset(profile);
      this.savedAt.set(new Date());
      this.ui.toast('admin.common.saved');
      return true;
    } catch (error) {
      const errors = fieldErrors(error);
      this.setErrors(errors);
      const first = Object.keys(errors)[0];
      if (first?.startsWith('translations.'))
        this.editLang.set(first.startsWith('translations.en') ? 'en' : 'pl');
      if (first) setTimeout(() => this.document.getElementById(this.fieldId(first))?.focus());
      this.ui.fail(error, () => this.reload());
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private reload(): void {
    this.api.getAdminProfile().subscribe((profile) => this.reset(profile));
  }

  /** API field errors go onto the controls too, so Material shows them and they clear on the next edit. */
  private setErrors(errors: Record<string, string>): void {
    this.errors.set(errors);
    for (const [field, message] of Object.entries(errors)) {
      const control = this.form.get(field.replace(/^translations\./, ''));
      control?.setErrors({ api: message });
      control?.markAsTouched();
    }
  }

  /** DOM id for an API field path ("translations.en.headline" → "settings-en-headline"). */
  protected fieldId(field: string): string {
    return 'settings-' + field.replace(/^translations\./, '').replace(/\./g, '-');
  }

  protected apiError(path: string): string | null {
    return (this.form.get(path)?.errors?.['api'] as string | undefined) ?? null;
  }

  protected error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  /** Sends the saved auto-reply in the selected language to the owner; saves first when something changed. */
  protected async testMail(): Promise<void> {
    if (this.dirty() && !(await this.save())) return;
    try {
      await firstValueFrom(this.api.sendTestAutoReply({ locale: this.editLang() }));
      this.ui.toast('admin.settings.testSent');
    } catch (error) {
      this.ui.fail(error);
    }
  }

  protected onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.save();
    }
  }
}
