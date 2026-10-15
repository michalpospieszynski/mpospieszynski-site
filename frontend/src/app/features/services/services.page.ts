import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { ServicesResponse } from '../../api';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { localizedUrl } from '../../core/i18n/route-table';
import { availabilityView } from '../../core/profile/availability';
import { ProfileStore } from '../../core/profile/profile.store';
import { serviceJsonLd } from '../../core/seo/json-ld';
import { SITE_ORIGIN, SeoService } from '../../core/seo/seo.service';
import { AvailabilityComponent } from '../../shared/ui/availability.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';

const PROCESS_STEPS = ['1', '2', '3', '4'] as const;

/**
 * Services (docs/screens/public/06-services.md): offerings with what they include, the collaboration process,
 * the FAQ as native <details> (works without JavaScript) and a call to action.
 */
@Component({
  selector: 'app-services-page',
  imports: [
    TranslocoPipe,
    LocalizedPathPipe,
    AvailabilityComponent,
    ButtonComponent,
    MarkdownComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.page.html',
  styleUrl: './services.page.scss',
})
export class ServicesPage {
  /** From servicesResolver. */
  readonly services = input.required<ServicesResponse>();

  protected readonly language = inject(LanguageService);
  private readonly profile = inject(ProfileStore).profile;

  protected readonly steps = PROCESS_STEPS;
  protected readonly availability = computed(() =>
    availabilityView(this.profile(), this.language.lang()),
  );

  protected readonly offerings = computed(() =>
    (this.services().services ?? []).map((s) => ({
      id: s.id ?? '',
      fallback: !!s.lang && s.lang !== this.language.lang(),
      title: s.title ?? '',
      summary: s.summary ?? '',
      descriptionMd: s.descriptionMd?.trim() || null,
      deliverablesMd: s.deliverablesMd?.trim() || null,
      priceNote: s.priceNote?.trim() || null,
    })),
  );

  protected readonly faq = computed(() =>
    (this.services().faq ?? []).map((f) => ({
      id: f.id ?? '',
      fallback: !!f.lang && f.lang !== this.language.lang(),
      question: f.question ?? '',
      answerMd: f.answerMd ?? '',
    })),
  );

  /** Offerings whose "More details" is open. */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  constructor() {
    const seo = inject(SeoService);
    const transloco = inject(TranslocoService);
    const origin = inject(SITE_ORIGIN);
    effect(() => {
      const provider = this.profile()?.fullName ?? '';
      const url = new URL(localizedUrl('services', this.language.lang()), origin + '/').toString();
      seo.update({
        title: transloco.translate('services.title'),
        description: transloco.translate('services.lead'),
        alternates: 'services',
        jsonLd: this.offerings().map((o) =>
          serviceJsonLd({ name: o.title, description: o.summary, provider, url }),
        ),
      });
    });
  }

  protected toggle(id: string): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }
}
