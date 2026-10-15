import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, forkJoin } from 'rxjs';

import {
  AdminExpertiseArea,
  AdminExpertiseAreasControllerService,
  AdminProjectListItem,
  AdminProjectsControllerService,
  AdminTechnology,
  AdminTechnologiesControllerService,
  AdminTechnologyCategoryEnum,
  AreaTexts,
  TechnologyInput,
  TechnologyInputCategoryEnum,
} from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { ItemValue, openItemEditor } from '../shared/item-editor.dialog';
import { EditLang } from '../shared/lang-tabs.component';

const CATEGORIES = Object.values(AdminTechnologyCategoryEnum);

/** /admin/umiejetnosci?tab=technologie|obszary (docs/screens/admin/07-skills.md). */
@Component({
  selector: 'adm-skills',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterLink,
    TranslocoPipe,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.scss',
})
export class SkillsPage {
  readonly tab = input<string>();
  /** `?edit=<id>&lang=en` opens that item's editor (dashboard links). */
  readonly edit = input<string>();
  readonly lang = input<string>();

  private readonly technologiesApi = inject(AdminTechnologiesControllerService);
  private readonly areasApi = inject(AdminExpertiseAreasControllerService);
  private readonly projectsApi = inject(AdminProjectsControllerService);
  private readonly ui = inject(AdminUi);
  private readonly dialog = inject(MatDialog);

  protected readonly categories = CATEGORIES;
  protected readonly technologies = signal<AdminTechnology[]>([]);
  protected readonly areas = signal<AdminExpertiseArea[]>([]);
  private readonly projects = signal<AdminProjectListItem[]>([]);
  protected readonly loaded = signal(false);
  protected readonly category = signal<string>('');
  protected readonly onlyVisible = signal(false);
  protected readonly current = computed(() =>
    this.tab() === 'obszary' ? 'obszary' : 'technologie',
  );

  protected readonly shownTechnologies = computed(() =>
    this.technologies().filter(
      (t) =>
        (!this.category() || t.category === this.category()) &&
        (!this.onlyVisible() || t.showOnSkillsPage),
    ),
  );
  /** Reordering works within one selected category, on the whole list of that category. */
  protected readonly canReorder = computed(() => !!this.category() && !this.onlyVisible());

  constructor() {
    this.reload(() => this.openFromQuery());
  }

  private reload(after?: () => void): void {
    forkJoin([
      this.technologiesApi.listAdminTechnologies(),
      this.areasApi.listAdminExpertiseAreas(),
      this.projectsApi.listAdminProjects({}),
    ]).subscribe({
      next: ([technologies, areas, projects]) => {
        this.technologies.set(technologies);
        this.areas.set(areas);
        this.projects.set(projects);
        this.loaded.set(true);
        after?.();
      },
      error: (error: unknown) => this.ui.fail(error),
    });
  }

  private openFromQuery(): void {
    const id = this.edit();
    if (!id) return;
    const lang: EditLang = this.lang() === 'en' ? 'en' : 'pl';
    const technology = this.technologies().find((t) => t.id === id);
    const area = this.areas().find((a) => a.id === id);
    if (technology) void this.editTechnology(technology, lang);
    else if (area) void this.editArea(area, lang);
  }

  protected areaTitle(area: AdminExpertiseArea): string {
    return area.translations?.pl?.title ?? '';
  }

  private reorder(call: Observable<unknown>, revert: () => void): void {
    call.subscribe({
      next: () => this.ui.toast('admin.common.orderSaved'),
      error: (error: unknown) => {
        revert();
        this.ui.fail(error);
      },
    });
  }

  // Technologies ----------------------------------------------------------------------------------------------

  /** Visibility and category save inline. */
  protected saveInline(t: AdminTechnology, changes: Partial<TechnologyInput>): void {
    const input: TechnologyInput = {
      version: t.version,
      slug: t.slug,
      name: t.name,
      category: t.category as string as TechnologyInputCategoryEnum,
      showOnSkillsPage: t.showOnSkillsPage,
      sinceYear: t.sinceYear,
      translations: t.translations,
      ...changes,
    };
    this.technologiesApi.saveAdminTechnology({ id: t.id!, technologyInput: input }).subscribe({
      next: (saved) => {
        this.technologies.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        this.ui.toast('admin.common.saved');
      },
      error: (error: unknown) => {
        this.ui.fail(error, () => this.reload());
        this.reload();
      },
    });
  }

  protected setCategory(t: AdminTechnology, category: string): void {
    this.saveInline(t, { category: category as TechnologyInputCategoryEnum });
  }

  protected async editTechnology(t: AdminTechnology | null, lang: EditLang = 'pl'): Promise<void> {
    const result = await openItemEditor(this.dialog, {
      title: t ? 'admin.skills.editTechnology' : 'admin.skills.newTechnologyTitle',
      idPrefix: 'technology',
      sharedFirst: true,
      lang,
      shared: [
        { name: 'name', label: 'admin.skills.name', kind: 'text', required: true },
        { name: 'slug', label: 'admin.skills.slug', kind: 'text' },
        {
          name: 'category',
          label: 'admin.skills.category',
          kind: 'select',
          options: CATEGORIES.map((c) => ({ value: c, label: this.ui.t(`skills.category.${c}`) })),
        },
        { name: 'sinceYear', label: 'admin.skills.since', kind: 'number' },
        { name: 'showOnSkillsPage', label: 'admin.skills.visible', kind: 'checkbox' },
      ],
      texts: [{ name: 'description', label: 'admin.skills.description', kind: 'area', max: 200 }],
      initial: {
        shared: {
          name: t?.name ?? '',
          slug: t?.slug ?? '',
          category: t?.category ?? 'TOOLING',
          sinceYear: t?.sinceYear ?? '',
          showOnSkillsPage: t?.showOnSkillsPage ?? true,
        },
        pl: t?.translations?.pl,
        en: t?.translations?.en,
      },
      save: (v: ItemValue) => {
        const year = v.shared['sinceYear'];
        const technologyInput: TechnologyInput = {
          version: t?.version ?? 0,
          name: v.shared['name'] as string | undefined,
          slug: v.shared['slug'] as string | undefined,
          category: v.shared['category'] as TechnologyInputCategoryEnum,
          sinceYear: year === undefined || year === null || year === '' ? undefined : Number(year),
          showOnSkillsPage: v.shared['showOnSkillsPage'] as boolean,
          translations: { pl: v.pl, en: v.en },
        };
        return t
          ? this.technologiesApi.saveAdminTechnology({ id: t.id!, technologyInput })
          : this.technologiesApi.createAdminTechnology({ technologyInput });
      },
      remove: t
        ? {
            message: this.ui.t('admin.skills.deleteConfirm', { name: t.name }),
            call: () => this.technologiesApi.deleteAdminTechnology({ id: t.id! }),
          }
        : undefined,
    });
    if (result) this.reload();
  }

  protected dropTechnology(event: CdkDragDrop<AdminTechnology[]>): void {
    this.moveTechnology(event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected moveTechnology(index: number, delta: number): void {
    const ordered = [...this.shownTechnologies()];
    moveItemInArray(ordered, index, index + delta);
    const before = this.technologies();
    this.technologies.set([...ordered, ...before.filter((t) => !ordered.includes(t))]);
    this.reorder(
      this.technologiesApi.reorderAdminTechnologies({
        technologyOrderRequest: { ids: ordered.map((t) => t.id!) },
      }),
      () => this.technologies.set(before),
    );
  }

  // Expertise areas -------------------------------------------------------------------------------------------

  protected async editArea(area: AdminExpertiseArea | null, lang: EditLang = 'pl'): Promise<void> {
    const result = await openItemEditor(this.dialog, {
      title: area ? 'admin.skills.editArea' : 'admin.skills.newAreaTitle',
      idPrefix: 'area',
      lang,
      texts: [
        {
          name: 'title',
          label: 'admin.skills.areaTitle',
          kind: 'text',
          requiredPl: true,
          requiredEn: true,
        },
        {
          name: 'summary',
          label: 'admin.skills.areaSummary',
          kind: 'area',
          requiredPl: true,
          requiredEn: true,
        },
        { name: 'descriptionMd', label: 'admin.skills.areaDescription', kind: 'md' },
      ],
      shared: [
        {
          name: 'technologyIds',
          label: 'admin.skills.areaTechnologies',
          kind: 'multi',
          options: this.technologies().map((t) => ({ value: t.id!, label: t.name! })),
        },
        {
          name: 'projectIds',
          label: 'admin.skills.areaProjects',
          kind: 'multi',
          options: this.projects().map((p) => ({
            value: p.id!,
            label: p.titlePl!,
            note: p.status === 'PUBLISHED' ? undefined : this.ui.t('admin.skills.draftChip'),
          })),
        },
      ],
      initial: {
        shared: { technologyIds: area?.technologyIds ?? [], projectIds: area?.projectIds ?? [] },
        pl: area?.translations?.pl,
        en: area?.translations?.en,
      },
      save: (v: ItemValue) => {
        const areaInput = {
          version: area?.version ?? 0,
          technologyIds: v.shared['technologyIds'] as string[],
          projectIds: v.shared['projectIds'] as string[],
          translations: { pl: v.pl as AreaTexts, en: v.en as AreaTexts | undefined },
        };
        return area
          ? this.areasApi.saveAdminExpertiseArea({ id: area.id!, areaInput })
          : this.areasApi.createAdminExpertiseArea({ areaInput });
      },
      remove: area
        ? {
            message: this.ui.t('admin.skills.deleteConfirm', { name: this.areaTitle(area) }),
            call: () => this.areasApi.deleteAdminExpertiseArea({ id: area.id! }),
          }
        : undefined,
    });
    if (result) this.reload();
  }

  protected dropArea(event: CdkDragDrop<AdminExpertiseArea[]>): void {
    this.moveArea(event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected moveArea(index: number, delta: number): void {
    const before = this.areas();
    const next = [...before];
    moveItemInArray(next, index, index + delta);
    this.areas.set(next);
    this.reorder(
      this.areasApi.reorderAdminExpertiseAreas({
        areaOrderRequest: { ids: next.map((a) => a.id!) },
      }),
      () => this.areas.set(before),
    );
  }
}
