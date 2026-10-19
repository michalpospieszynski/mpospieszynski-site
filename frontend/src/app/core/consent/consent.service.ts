import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ConsentChoice = 'pending' | 'accepted' | 'rejected';

/** localStorage key and the stored shape: the choice, when it was made, and the policy version it answered. */
const STORAGE_KEY = 'consent';
interface StoredConsent {
  v: number;
  choice: 'accepted' | 'rejected';
  at: string;
}

/** Bump when the privacy policy changes what consent covers: everyone is asked again. */
export const CONSENT_VERSION = 1;
/** A choice is asked again after a year (docs/ANALYTICS.md §7). */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The visitor's answer to the cookie banner (docs/ANALYTICS.md §3): the only source of truth for consent; PostHog
 * follows it (AnalyticsService). Browser-only: on the server the choice is unknown and stays `pending`.
 * A browser that sends Global Privacy Control counts as a rejection until the visitor decides otherwise.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly current = signal<ConsentChoice>('pending');
  private readonly open = signal(false);

  readonly choice = this.current.asReadonly();
  /** The banner: open while undecided, or when reopened from the footer. */
  readonly bannerOpen = this.open.asReadonly();

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    const stored = readStored();
    if (stored) {
      this.current.set(stored.choice);
    } else if (globalPrivacyControl()) {
      this.current.set('rejected');
    } else {
      this.open.set(true);
    }
  }

  accept(): void {
    this.decide('accepted');
  }

  reject(): void {
    this.decide('rejected');
  }

  /** "Cookie settings" in the footer. */
  openSettings(): void {
    this.open.set(true);
  }

  private decide(choice: 'accepted' | 'rejected'): void {
    this.current.set(choice);
    this.open.set(false);
    try {
      const stored: StoredConsent = { v: CONSENT_VERSION, choice, at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage blocked: the choice holds until the page is reloaded, then the banner asks again.
    }
  }
}

function readStored(): StoredConsent | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as Partial<StoredConsent> | null;
    const at = Date.parse(value?.at ?? '');
    const valid =
      value?.v === CONSENT_VERSION &&
      (value.choice === 'accepted' || value.choice === 'rejected') &&
      Date.now() - at < MAX_AGE_MS;
    return valid ? (value as StoredConsent) : null;
  } catch {
    return null;
  }
}

function globalPrivacyControl(): boolean {
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}
