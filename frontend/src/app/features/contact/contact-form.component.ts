import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import {
  ContactRequestLocaleEnum,
  ContactRequestTopicEnum,
  PublicContactControllerService,
} from '../../api';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { ApiError } from '../../core/http/api-error';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { ProfileStore } from '../../core/profile/profile.store';
import { TurnstileWidget } from '../../core/turnstile/turnstile';
import { ButtonComponent } from '../../shared/ui/button.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { ContactTopic } from './contact.resolver';

/** Same rule as the API: one @, no spaces, a dot in the domain. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Length of the trimmed value, like the API counts it. */
function trimmedLength(min: number, max: number) {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const length = (control.value ?? '').trim().length;
    return length === 0 || (length >= min && length <= max) ? null : { length: true };
  };
}

function requiredText(control: AbstractControl<string>): ValidationErrors | null {
  return (control.value ?? '').trim() ? null : { required: true };
}

type FieldName = 'name' | 'email' | 'message' | 'consent';
const FIELDS: readonly FieldName[] = ['name', 'email', 'message', 'consent'];

/** Message key per field and validator error, the same texts the API returns. */
const MESSAGES: Record<FieldName, Record<string, string>> = {
  name: { required: 'contact.errors.required', length: 'contact.errors.nameLength' },
  email: {
    required: 'contact.errors.required',
    pattern: 'contact.errors.email',
    maxlength: 'contact.errors.email',
  },
  message: { required: 'contact.errors.required', length: 'contact.errors.messageLength' },
  consent: { required: 'contact.errors.consent' },
};

/**
 * The contact form of the home page and /kontakt (docs/screens/public/08-contact.md, DIRECTION.md): name, e-mail,
 * message and the privacy consent, plus a honeypot and Turnstile. Errors show under each field after it is left
 * or on submit; the first invalid field takes focus. On success the form is replaced by a status message.
 * Context from the page (topic, the service asked about, a project reference) is sent along without extra fields.
 */
@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, TranslocoPipe, LocalizedPathPipe, ButtonComponent, FieldComponent],
  providers: [TurnstileWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  /** Prefix of the control ids, unique per page. */
  readonly idPrefix = input('contact');
  readonly topic = input<ContactTopic>('OTHER');
  readonly serviceId = input<string | null>(null);
  /** Shown above the message: the service this message is about. */
  readonly serviceTitle = input<string | null>(null);
  /** Prefills the message with a reference to this case study. */
  readonly projectTitle = input<string | null>(null);

  private readonly api = inject(PublicContactControllerService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly turnstile = inject(TurnstileWidget);
  private readonly language = inject(LanguageService);
  private readonly analytics = inject(AnalyticsService);
  private readonly profile = inject(ProfileStore).profile;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, trimmedLength(2, 120)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.pattern(EMAIL), Validators.maxLength(254)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, trimmedLength(20, 5000)],
    }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    website: new FormControl('', { nonNullable: true }),
  });

  protected readonly status = signal<'idle' | 'sending' | 'sent'>('idle');
  protected readonly submitted = signal(false);
  /** 403 / 429 / 5xx message key, shown above the button. */
  protected readonly failure = signal<'bot' | 'rateLimit' | 'server' | null>(null);
  protected readonly sentTo = signal('');
  /** Bumped on every value or status change, so error texts follow the form. */
  private readonly formVersion = signal(0);
  /** True once the app runs in the browser (hides the "needs JavaScript" note). */
  protected readonly enhanced = signal(false);

  protected readonly ownerEmail = computed(() =>
    (this.profile()?.socialLinks?.['email'] ?? '').replace(/^mailto:/, ''),
  );

  private readonly successHeading = viewChild<ElementRef<HTMLElement>>('successHeading');
  private readonly turnstileHost = viewChild<ElementRef<HTMLElement>>('turnstileHost');

  constructor() {
    effect(() => {
      const title = this.projectTitle();
      if (title && !this.form.controls.message.value) {
        this.form.controls.message.setValue(
          `${this.transloco.translate('contact.projectRef', { title })}\n\n`,
        );
      }
    });

    const bump = () => this.formVersion.update((v) => v + 1);
    const changes = [
      this.form.valueChanges.subscribe(bump),
      this.form.statusChanges.subscribe(bump),
    ];
    inject(DestroyRef).onDestroy(() => {
      changes.forEach((s) => s.unsubscribe());
      this.turnstile.destroy();
    });

    // Turnstile only in the browser, and only once the form comes near the viewport: on the home page most visits
    // never reach it, so they load no third-party script (on /kontakt it is in view at once).
    const destroyRef = inject(DestroyRef);
    // The form itself is watched: the Turnstile container is display: none while empty, so it never intersects.
    const form: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
    afterNextRender(() => {
      this.enhanced.set(true);
      const host = this.turnstileHost()?.nativeElement;
      if (!host) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          observer.disconnect();
          this.turnstile.mount(host, this.language.lang()).catch(() => undefined);
        },
        { rootMargin: '400px 0px' },
      );
      observer.observe(form);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected controlId(name: string): string {
    return `${this.idPrefix()}-${name}`;
  }

  /** Errors show after the field was left, or after a submit attempt. */
  private isShown(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected errorText(name: FieldName): string | null {
    this.formVersion();
    const errors = this.form.controls[name].errors;
    if (!errors || !this.isShown(name)) {
      return null;
    }
    if (typeof errors['server'] === 'string') {
      return errors['server'];
    }
    const key = Object.keys(errors)
      .map((e) => MESSAGES[name][e])
      .find(Boolean);
    return key ? this.transloco.translate(key) : null;
  }

  protected async submit(): Promise<void> {
    if (this.status() === 'sending') {
      return;
    }
    this.submitted.set(true);
    this.failure.set(null);
    this.form.markAllAsTouched();
    this.formVersion.update((v) => v + 1);
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    this.status.set('sending');
    const token = await this.turnstile.token();
    if (!token) {
      this.fail('bot');
      return;
    }
    const value = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.submitContactMessage({
          contactRequest: {
            locale: this.language.lang() as ContactRequestLocaleEnum,
            topic: this.topic() as ContactRequestTopicEnum,
            serviceId: this.serviceId() ?? undefined,
            name: value.name.trim(),
            email: value.email.trim(),
            message: value.message.trim(),
            consent: value.consent,
            turnstileToken: token,
            website: value.website || undefined,
          },
        }),
      );
      this.sentTo.set(value.email.trim());
      this.status.set('sent');
      this.analytics.track('contact_submitted', {
        source: this.idPrefix().startsWith('home') ? 'home' : 'contact',
        topic: this.topic(),
      });
      setTimeout(() => this.successHeading()?.nativeElement.focus());
    } catch (error) {
      this.handleError(error);
    }
  }

  protected again(): void {
    this.form.reset();
    this.submitted.set(false);
    this.failure.set(null);
    this.status.set('idle');
    setTimeout(() => this.document.getElementById(this.controlId('name'))?.focus());
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiError && error.status === 400 && error.errors.length) {
      for (const fieldError of error.errors) {
        const control = this.form.get(fieldError.field);
        control?.setErrors({ ...(control.errors ?? {}), server: fieldError.message });
        control?.markAsTouched();
      }
      this.formVersion.update((v) => v + 1);
      this.status.set('idle');
      this.turnstile.reset();
      this.focusFirstInvalid();
      this.analytics.track('contact_failed', { reason: 'validation' });
      return;
    }
    const status = error instanceof ApiError ? error.status : 0;
    this.fail(status === 403 ? 'bot' : status === 429 ? 'rateLimit' : 'server');
  }

  private fail(kind: 'bot' | 'rateLimit' | 'server'): void {
    this.analytics.track('contact_failed', { reason: kind === 'rateLimit' ? 'rate_limit' : kind });
    this.failure.set(kind);
    this.status.set('idle');
    this.turnstile.reset();
  }

  private focusFirstInvalid(): void {
    const first = FIELDS.find((name) => this.errorText(name));
    if (first) {
      setTimeout(() => this.document.getElementById(this.controlId(first))?.focus());
    }
  }
}
