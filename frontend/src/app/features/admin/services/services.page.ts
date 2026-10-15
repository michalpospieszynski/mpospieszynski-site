import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, forkJoin } from 'rxjs';

import {
  AdminFaq,
  AdminService,
  AdminServicesControllerService,
  FaqTexts,
  ServiceTexts,
} from '../../../api';
import { AdminUi } from '../shared/admin-ui';
import { ItemValue, openItemEditor } from '../shared/item-editor.dialog';
import { EditLang } from '../shared/lang-tabs.component';

/** /admin/uslugi?tab=uslugi|faq (docs/screens/admin/08-services-faq.md). */
@Component({
  selector: 'adm-services',
  imports: [
    MatButtonModule,
    MatSlideToggleModule,
    RouterLink,
    TranslocoPipe,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.page.html',
})
export class ServicesPage {
  readonly tab = input<string>();
  /** `?edit=<id>&lang=en` opens that item's editor (dashboard links). */
  readonly edit = input<string>();
  readonly lang = input<string>();

  private readonly api = inject(AdminServicesControllerService);
  private readonly ui = inject(AdminUi);
  private readonly dialog = inject(MatDialog);

  protected readonly services = signal<AdminService[]>([]);
  protected readonly faq = signal<AdminFaq[]>([]);
  protected readonly loaded = signal(false);
  protected readonly current = computed(() => (this.tab() === 'faq' ? 'faq' : 'uslugi'));

  constructor() {
    this.reload(() => this.openFromQuery());
  }

  private reload(after?: () => void): void {
    forkJoin([this.api.listAdminServices(), this.api.listAdminFaq()]).subscribe({
      next: ([services, faq]) => {
        this.services.set(services);
        this.faq.set(faq);
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
    const service = this.services().find((s) => s.id === id);
    const faq = this.faq().find((f) => f.id === id);
    if (service) void this.editService(service, lang);
    else if (faq) void this.editFaq(faq, lang);
  }

  protected title(s: AdminService): string {
    return s.translations?.pl?.title ?? '';
  }

  protected question(f: AdminFaq): string {
    return f.translations?.pl?.question ?? '';
  }

  protected add(): void {
    if (this.current() === 'faq') void this.editFaq(null);
    else void this.editService(null);
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

  // Services --------------------------------------------------------------------------------------------------

  /** Saves inline; inactive services disappear from the public page and the contact form. */
  protected setActive(s: AdminService, active: boolean): void {
    this.api
      .setAdminServiceActive({ id: s.id!, serviceActiveRequest: { active, version: s.version } })
      .subscribe({
        next: (saved) => {
          this.services.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
          this.ui.toast('admin.common.saved');
        },
        error: (error: unknown) => {
          this.ui.fail(error, () => this.reload());
          this.reload();
        },
      });
  }

  protected async editService(s: AdminService | null, lang: EditLang = 'pl'): Promise<void> {
    const result = await openItemEditor(this.dialog, {
      title: s ? 'admin.services.editService' : 'admin.services.newService',
      idPrefix: 'service',
      lang,
      texts: [
        {
          name: 'title',
          label: 'admin.services.name',
          kind: 'text',
          requiredPl: true,
          requiredEn: true,
        },
        {
          name: 'summary',
          label: 'admin.services.summary',
          kind: 'area',
          requiredPl: true,
          requiredEn: true,
        },
        { name: 'deliverablesMd', label: 'admin.services.deliverables', kind: 'md' },
        { name: 'descriptionMd', label: 'admin.services.description', kind: 'md' },
        {
          name: 'priceNote',
          label: 'admin.services.price',
          kind: 'text',
          hint: 'admin.services.priceHint',
        },
      ],
      shared: [{ name: 'active', label: 'admin.services.active', kind: 'checkbox' }],
      initial: {
        shared: { active: s?.active ?? true },
        pl: s?.translations?.pl,
        en: s?.translations?.en,
      },
      save: (v: ItemValue) => {
        const serviceInput = {
          version: s?.version ?? 0,
          active: v.shared['active'] as boolean,
          translations: { pl: v.pl as ServiceTexts, en: v.en as ServiceTexts | undefined },
        };
        return s
          ? this.api.saveAdminService({ id: s.id!, serviceInput })
          : this.api.createAdminService({ serviceInput });
      },
      remove: s
        ? {
            message: this.ui.t('admin.services.deleteConfirm', { name: this.title(s) }),
            call: () => this.api.deleteAdminService({ id: s.id! }),
          }
        : undefined,
    });
    if (result) this.reload();
  }

  protected dropService(event: CdkDragDrop<AdminService[]>): void {
    this.moveService(event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected moveService(index: number, delta: number): void {
    const before = this.services();
    const next = [...before];
    moveItemInArray(next, index, index + delta);
    this.services.set(next);
    this.reorder(
      this.api.reorderAdminServices({ serviceOrderRequest: { ids: next.map((s) => s.id!) } }),
      () => this.services.set(before),
    );
  }

  // FAQ -------------------------------------------------------------------------------------------------------

  protected async editFaq(f: AdminFaq | null, lang: EditLang = 'pl'): Promise<void> {
    const result = await openItemEditor(this.dialog, {
      title: f ? 'admin.services.editFaq' : 'admin.services.newFaq',
      idPrefix: 'faq',
      lang,
      texts: [
        {
          name: 'question',
          label: 'admin.services.question',
          kind: 'text',
          requiredPl: true,
          requiredEn: true,
        },
        {
          name: 'answerMd',
          label: 'admin.services.answer',
          kind: 'md',
          requiredPl: true,
          requiredEn: true,
        },
      ],
      shared: [],
      initial: { shared: {}, pl: f?.translations?.pl, en: f?.translations?.en },
      save: (v: ItemValue) => {
        const faqInput = {
          version: f?.version ?? 0,
          translations: { pl: v.pl as FaqTexts, en: v.en as FaqTexts | undefined },
        };
        return f
          ? this.api.saveAdminFaq({ id: f.id!, faqInput })
          : this.api.createAdminFaq({ faqInput });
      },
      remove: f
        ? {
            message: this.ui.t('admin.services.deleteConfirm', { name: this.question(f) }),
            call: () => this.api.deleteAdminFaq({ id: f.id! }),
          }
        : undefined,
    });
    if (result) this.reload();
  }

  protected dropFaq(event: CdkDragDrop<AdminFaq[]>): void {
    this.moveFaq(event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected moveFaq(index: number, delta: number): void {
    const before = this.faq();
    const next = [...before];
    moveItemInArray(next, index, index + delta);
    this.faq.set(next);
    this.reorder(
      this.api.reorderAdminFaq({ faqOrderRequest: { ids: next.map((f) => f.id!) } }),
      () => this.faq.set(before),
    );
  }
}
