import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  Injectable,
  InjectionToken,
  Injector,
  PLATFORM_ID,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { PostHog, PostHogConfig } from 'posthog-js';
import { filter } from 'rxjs';

import { ConsentChoice, ConsentService } from '../consent/consent.service';
import { LanguageService } from '../i18n/language.service';
import type { Lang } from '../i18n/route-table';
import type { Theme } from '../theme/theme.service';
import { ANALYTICS_CONFIG, POSTHOG_PROXY_PATH, POSTHOG_UI_HOST } from './analytics-config';

/** Custom events and their properties (docs/ANALYTICS.md §6). Slugs and fixed values only, never personal data. */
export interface AnalyticsEvents {
  contact_submitted: { source: 'home' | 'contact'; topic: string };
  contact_failed: { reason: 'validation' | 'bot' | 'rate_limit' | 'server' };
  project_opened: { slug: string };
  graph_project_selected: { slug: string };
  cta_clicked: { cta: 'hero_contact' | 'hero_projects' };
  language_switched: { to: Lang };
  theme_toggled: { to: Theme };
}

/** Loads posthog-js in its own lazy chunk; a token, so tests can hand in a fake. */
export const POSTHOG_LOADER = new InjectionToken<() => Promise<PostHog>>('POSTHOG_LOADER', {
  providedIn: 'root',
  factory: () => () => import('posthog-js').then((m) => m.default),
});

/** The owner's admin and the dev pages are never tracked or recorded. */
const UNTRACKED_PATH = /^\/(admin|dev)(\/|$)/;
/** Events tracked before PostHog is ready (it loads when the browser is idle) are kept up to this number. */
const BUFFER_LIMIT = 20;

/** Features that need consent: autocapture, heatmaps (click, rage and dead clicks, scroll) and recordings. */
function consentFeatures(accepted: boolean): Partial<PostHogConfig> {
  return {
    autocapture: accepted,
    capture_heatmaps: accepted,
    rageclick: accepted,
    capture_dead_clicks: accepted,
    disable_session_recording: !accepted,
  };
}

/**
 * PostHog with consent (docs/ANALYTICS.md). PostHog is downloaded only after the visitor has answered the banner,
 * once the browser is idle, and runs in `cookieless_mode: 'on_reject'`:
 * accepted → cookies, autocapture, heatmaps and masked recordings; rejected → anonymous, cookieless page views and
 * events (PostHog's server-side hash), nothing stored. Undecided visitors are not tracked.
 * Everything is a no-op on the server, without POSTHOG_KEY, before `start()` (the admin never calls it) and on
 * untracked paths.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly config = inject(ANALYTICS_CONFIG, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly consent = inject(ConsentService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly loader = inject(POSTHOG_LOADER);

  /** A key is configured: the cookie banner and the footer link exist only then. */
  readonly enabled = !!this.config?.key;

  private started = false;
  private posthog: PostHog | null = null;
  private loading: Promise<PostHog> | null = null;
  /** The choice PostHog is currently configured for. */
  private applied: ConsentChoice = 'pending';
  private onTrackedPage = true;
  private readonly buffer: [keyof AnalyticsEvents, object][] = [];

  /** Called once by the public layout after its first render in the browser. */
  start(): void {
    if (this.started || !this.isBrowser || !this.enabled) {
      return;
    }
    this.started = true;
    effect(
      () => {
        const choice = this.consent.choice();
        untracked(() => void this.apply(choice));
      },
      { injector: this.injector },
    );
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.onNavigation());
  }

  track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]): void {
    if (!this.isBrowser || !this.enabled || !isTracked(this.router.url)) {
      return;
    }
    if (this.posthog) {
      this.posthog.capture(event, { ...properties, lang: this.language.lang() });
    } else if (this.buffer.length < BUFFER_LIMIT) {
      this.buffer.push([event, properties]);
    }
  }

  private async apply(choice: ConsentChoice): Promise<void> {
    if (choice === 'pending') {
      return;
    }
    if (!this.posthog) {
      this.loading ??= this.load(choice);
      await this.loading;
    }
    // The visitor may have changed their mind while PostHog was loading.
    const latest = this.consent.choice();
    if (latest !== 'pending' && latest !== this.applied) {
      this.switchTo(latest);
    }
  }

  private async load(choice: 'accepted' | 'rejected'): Promise<PostHog> {
    await idle(this.document.defaultView);
    const posthog = await this.loader();
    posthog.init(this.config!.key, {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: POSTHOG_UI_HOST,
      defaults: '2026-08-30',
      cookieless_mode: 'on_reject',
      // Page views are captured by onNavigation(), so the admin and dev pages can be left out.
      capture_pageview: false,
      capture_pageleave: false,
      person_profiles: 'identified_only',
      disable_surveys: true,
      capture_performance: { web_vitals: true },
      mask_all_element_attributes: true,
      session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' },
      before_send: (event) => (isTracked(this.document.location.pathname) ? event : null),
      ...consentFeatures(choice === 'accepted'),
    });
    this.applied = choice;
    const status = posthog.get_explicit_consent_status();
    if (choice === 'accepted' && status !== 'granted') {
      posthog.opt_in_capturing({ captureEventName: false });
    } else if (choice === 'rejected' && status !== 'denied') {
      posthog.opt_out_capturing();
    }
    this.posthog = posthog;
    this.onNavigation();
    for (const [event, properties] of this.buffer.splice(0)) {
      posthog.capture(event, { ...properties, lang: this.language.lang() });
    }
    return posthog;
  }

  /** A change of mind after PostHog was loaded: footer → Cookie settings. */
  private switchTo(choice: 'accepted' | 'rejected'): void {
    const posthog = this.posthog!;
    this.applied = choice;
    if (choice === 'accepted') {
      posthog.opt_in_capturing({ captureEventName: false });
      posthog.set_config(consentFeatures(true));
      if (this.onTrackedPage) {
        posthog.startSessionRecording();
      }
    } else {
      posthog.stopSessionRecording();
      posthog.set_config(consentFeatures(false));
      posthog.opt_out_capturing();
      clearPostHogStorage(this.document);
    }
  }

  /** A page view on every tracked page; recording pauses in the admin. */
  private onNavigation(): void {
    const posthog = this.posthog;
    if (!posthog) {
      return;
    }
    const trackedNow = isTracked(this.router.url);
    if (this.applied === 'accepted' && trackedNow !== this.onTrackedPage) {
      if (trackedNow) {
        posthog.startSessionRecording();
      } else {
        posthog.stopSessionRecording();
      }
    }
    this.onTrackedPage = trackedNow;
    if (trackedNow) {
      posthog.capture('$pageview', { lang: this.language.lang() });
    }
  }
}

function isTracked(url: string): boolean {
  return !UNTRACKED_PATH.test(url.split(/[?#]/)[0]);
}

function idle(view: (Window & typeof globalThis) | null): Promise<void> {
  return new Promise((resolve) => {
    if (view && 'requestIdleCallback' in view) {
      view.requestIdleCallback(() => resolve(), { timeout: 3000 });
    } else {
      setTimeout(resolve, 1);
    }
  });
}

/** After a withdrawal: PostHog's own cookie and storage entries (`ph_…`) go; its consent record stays. */
function clearPostHogStorage(document: Document): void {
  try {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith('ph_')) {
          storage.removeItem(key);
        }
      }
    }
    const host = document.location.hostname;
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('ph_')) {
        for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
          document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
        }
      }
    }
  } catch {
    // Storage blocked: there is nothing PostHog could have kept either.
  }
}
