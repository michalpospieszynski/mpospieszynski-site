import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { PostHog } from 'posthog-js';

import { CONSENT_VERSION, ConsentService } from '../consent/consent.service';
import { provideI18n } from '../i18n/i18n.providers';
import { ANALYTICS_CONFIG, AnalyticsConfig } from './analytics-config';
import { AnalyticsService, POSTHOG_LOADER } from './analytics.service';

@Component({ template: '' })
class Blank {}

function fakePostHog() {
  return {
    init: vi.fn(),
    capture: vi.fn(),
    get_explicit_consent_status: vi.fn(() => 'pending'),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    set_config: vi.fn(),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  };
}

describe('AnalyticsService', () => {
  let posthog: ReturnType<typeof fakePostHog>;
  let loader: ReturnType<typeof vi.fn>;

  function setUp(config: AnalyticsConfig | null = { key: 'phc_test' }, platform = 'browser') {
    posthog = fakePostHog();
    loader = vi.fn(() => Promise.resolve(posthog as unknown as PostHog));
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'projekty', component: Blank },
          { path: 'admin', component: Blank },
        ]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ANALYTICS_CONFIG, useValue: config },
        { provide: POSTHOG_LOADER, useValue: loader },
      ],
    });
    return TestBed.inject(AnalyticsService);
  }

  function decided(choice: 'accepted' | 'rejected'): void {
    localStorage.setItem(
      'consent',
      JSON.stringify({ v: CONSENT_VERSION, choice, at: new Date().toISOString() }),
    );
  }

  async function started(analytics: AnalyticsService): Promise<void> {
    analytics.start();
    TestBed.tick();
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const initOptions = () => posthog.init.mock.calls[0][1];

  beforeEach(() => localStorage.clear());

  it('does nothing without a key', async () => {
    decided('accepted');
    const analytics = setUp(null);
    expect(analytics.enabled).toBe(false);
    analytics.start();
    analytics.track('theme_toggled', { to: 'light' });
    TestBed.tick();
    await settle();
    expect(loader).not.toHaveBeenCalled();
  });

  it('does nothing on the server', async () => {
    decided('accepted');
    const analytics = setUp(undefined, 'server');
    analytics.start();
    TestBed.tick();
    await settle();
    expect(loader).not.toHaveBeenCalled();
  });

  it('does not load PostHog while the visitor has not decided, and loads it on accepting', async () => {
    const analytics = setUp();
    analytics.start();
    TestBed.tick();
    await settle();
    expect(loader).not.toHaveBeenCalled();

    TestBed.inject(ConsentService).accept();
    TestBed.tick();
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());
    expect(initOptions().disable_session_recording).toBe(false);
  });

  it('after acceptance: proxy, on_reject, heatmaps, masked recordings, opt-in and a page view', async () => {
    decided('accepted');
    await started(setUp());
    expect(posthog.init.mock.calls[0][0]).toBe('phc_test');
    expect(initOptions()).toMatchObject({
      api_host: '/ingest',
      cookieless_mode: 'on_reject',
      capture_pageview: false,
      person_profiles: 'identified_only',
      autocapture: true,
      capture_heatmaps: true,
      disable_session_recording: false,
      session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' },
    });
    expect(posthog.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(posthog.capture).toHaveBeenCalledWith('$pageview', { lang: 'pl' });
  });

  it('after rejection: cookieless page views only, no autocapture, heatmaps or recordings', async () => {
    decided('rejected');
    await started(setUp());
    expect(initOptions()).toMatchObject({
      autocapture: false,
      capture_heatmaps: false,
      disable_session_recording: true,
    });
    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith('$pageview', { lang: 'pl' });
  });

  it('sends events tracked before PostHog was ready once it is', async () => {
    decided('accepted');
    const analytics = setUp();
    analytics.track('cta_clicked', { cta: 'hero_contact' });
    await started(analytics);
    expect(posthog.capture).toHaveBeenCalledWith('cta_clicked', {
      cta: 'hero_contact',
      lang: 'pl',
    });
  });

  it('a withdrawal stops recording, opts out and removes PostHog storage', async () => {
    decided('accepted');
    await started(setUp());
    localStorage.setItem('ph_phc_test_posthog', '{}');
    TestBed.inject(ConsentService).reject();
    TestBed.tick();
    await vi.waitFor(() => expect(posthog.opt_out_capturing).toHaveBeenCalled());
    expect(posthog.stopSessionRecording).toHaveBeenCalled();
    expect(posthog.set_config).toHaveBeenCalledWith(
      expect.objectContaining({ autocapture: false, disable_session_recording: true }),
    );
    expect(localStorage.getItem('ph_phc_test_posthog')).toBeNull();
    expect(JSON.parse(localStorage.getItem('consent')!).choice).toBe('rejected');
  });

  it('never tracks the admin and pauses recording there', async () => {
    decided('accepted');
    const analytics = setUp();
    await started(analytics);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/admin');
    posthog.capture.mockClear();
    analytics.track('theme_toggled', { to: 'light' });
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.stopSessionRecording).toHaveBeenCalled();

    await router.navigateByUrl('/projekty');
    expect(posthog.startSessionRecording).toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith('$pageview', { lang: 'pl' });
  });

  it('drops events PostHog itself captures on untracked pages', async () => {
    decided('accepted');
    await started(setUp());
    const beforeSend = initOptions().before_send as (event: object) => object | null;
    history.replaceState(null, '', '/admin/projekty');
    expect(beforeSend({ event: '$autocapture' })).toBeNull();
    history.replaceState(null, '', '/projekty');
    expect(beforeSend({ event: '$autocapture' })).toEqual({ event: '$autocapture' });
  });
});
