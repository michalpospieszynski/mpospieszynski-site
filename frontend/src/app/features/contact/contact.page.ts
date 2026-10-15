import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { availabilityView } from '../../core/profile/availability';
import { ProfileStore } from '../../core/profile/profile.store';
import { SeoService } from '../../core/seo/seo.service';
import { AvailabilityComponent } from '../../shared/ui/availability.component';
import { ContactFormComponent } from './contact-form.component';
import { ContactPageData } from './contact.resolver';

/**
 * Contact (docs/screens/public/08-contact.md, DIRECTION.md): the intro (title, lead, e-mail, profiles,
 * availability) beside the shared contact form. The query (topic, service, project) gives the form its context.
 */
@Component({
  selector: 'app-contact-page',
  imports: [TranslocoPipe, AvailabilityComponent, ContactFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  /** From contactResolver. */
  readonly data = input.required<ContactPageData>();

  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly profile = inject(ProfileStore).profile;

  protected readonly availability = computed(() =>
    availabilityView(this.profile(), this.language.lang()),
  );
  protected readonly ownerEmail = computed(() =>
    (this.profile()?.socialLinks?.['email'] ?? '').replace(/^mailto:/, ''),
  );
  protected readonly socials = computed(() => {
    const links = this.profile()?.socialLinks ?? {};
    return (['linkedin', 'github'] as const)
      .filter((k) => links[k])
      .map((kind) => ({ kind, href: links[kind] }));
  });
  protected readonly serviceTitle = computed(() => {
    const data = this.data();
    return data.services.find((s) => s.id === data.serviceId)?.title ?? null;
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      this.data();
      seo.update({
        title: this.transloco.translate('contact.title'),
        description: this.transloco.translate('contact.lead'),
        alternates: 'contact',
      });
    });
  }
}
