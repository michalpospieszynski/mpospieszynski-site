import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CONSENT_VERSION, ConsentService } from './consent.service';

describe('ConsentService', () => {
  function service(platform = 'browser'): ConsentService {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(ConsentService);
  }

  function store(value: unknown): void {
    localStorage.setItem('consent', JSON.stringify(value));
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>)['globalPrivacyControl'];
  });

  it('is undecided with the banner open on a first visit', () => {
    const consent = service();
    expect(consent.choice()).toBe('pending');
    expect(consent.bannerOpen()).toBe(true);
  });

  it('stores the choice with its version and time, and closes the banner', () => {
    const consent = service();
    consent.accept();
    expect(consent.choice()).toBe('accepted');
    expect(consent.bannerOpen()).toBe(false);
    const stored = JSON.parse(localStorage.getItem('consent')!);
    expect(stored).toMatchObject({ v: CONSENT_VERSION, choice: 'accepted' });
    expect(Date.parse(stored.at)).not.toBeNaN();
  });

  it('restores a stored choice without opening the banner', () => {
    store({ v: CONSENT_VERSION, choice: 'rejected', at: new Date().toISOString() });
    const consent = service();
    expect(consent.choice()).toBe('rejected');
    expect(consent.bannerOpen()).toBe(false);
  });

  it('asks again after a year, after a policy version change and for broken values', () => {
    const yearAgo = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString();
    const values: unknown[] = [
      { v: CONSENT_VERSION, choice: 'accepted', at: yearAgo },
      { v: CONSENT_VERSION - 1, choice: 'accepted', at: new Date().toISOString() },
      { v: CONSENT_VERSION, choice: 'maybe', at: new Date().toISOString() },
    ];
    for (const value of values) {
      TestBed.resetTestingModule();
      store(value);
      expect(service().choice()).toBe('pending');
    }
    TestBed.resetTestingModule();
    localStorage.setItem('consent', 'not json');
    expect(service().choice()).toBe('pending');
  });

  it('treats Global Privacy Control as a rejection without asking or storing', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    const consent = service();
    expect(consent.choice()).toBe('rejected');
    expect(consent.bannerOpen()).toBe(false);
    expect(localStorage.getItem('consent')).toBeNull();
  });

  it('reopens the banner from the footer and lets the visitor change their mind', () => {
    const consent = service();
    consent.accept();
    consent.openSettings();
    expect(consent.bannerOpen()).toBe(true);
    consent.reject();
    expect(consent.choice()).toBe('rejected');
    expect(JSON.parse(localStorage.getItem('consent')!).choice).toBe('rejected');
  });

  it('stays undecided and closed on the server', () => {
    store({ v: CONSENT_VERSION, choice: 'accepted', at: new Date().toISOString() });
    const consent = service('server');
    expect(consent.choice()).toBe('pending');
    expect(consent.bannerOpen()).toBe(false);
  });
});
