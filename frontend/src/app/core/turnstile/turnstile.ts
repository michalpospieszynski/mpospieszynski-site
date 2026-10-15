import {
  DOCUMENT,
  Injectable,
  InjectionToken,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';

/**
 * Cloudflare Turnstile for the contact form (docs/screens/public/08-contact.md). The script is loaded only in the
 * browser and only when a contact form comes into view; no other page touches challenges.cloudflare.com.
 */
export const TURNSTILE_SITE_KEY = new InjectionToken<string>('TURNSTILE_SITE_KEY');

/** Cloudflare's test site key: always passes (development, tests, e2e). Production sets TURNSTILE_SITE_KEY. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/** The server knows the key from its environment and hands it to the browser through TransferState. */
export const TURNSTILE_KEY_STATE = makeStateKey<string>('TURNSTILE_SITE_KEY');

export function browserSiteKey(): string {
  return inject(TransferState).get(TURNSTILE_KEY_STATE, TURNSTILE_TEST_SITE_KEY);
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Longest wait for a challenge before the submit gives up with the "could not confirm" message. */
const TOKEN_TIMEOUT_MS = 20_000;

/**
 * One widget per form: `mount()` when the form comes into view, `token()` right before submitting, `reset()`
 * after a failure. The challenge runs only on submit (`execution: 'execute'`), so viewing the form costs one script
 * and no challenge. A widget that has never run is executed without a reset (resetting one that has just been
 * rendered can leave it silent), and every wait ends after TOKEN_TIMEOUT_MS.
 */
@Injectable()
export class TurnstileWidget {
  private readonly document = inject(DOCUMENT);
  private readonly siteKey = inject(TURNSTILE_SITE_KEY);

  private widgetId: string | null = null;
  /** The mount in progress or done; token() waits for it. */
  private mounting: Promise<void> | null = null;
  /** An unused token from the latest run (single-use, valid for 300 s). */
  private latest: string | null = null;
  /** A challenge is running and will call back. */
  private running = false;
  /** The widget has run before, so it needs a reset to run again. */
  private used = false;
  private pending: ((token: string | null) => void) | null = null;

  mount(container: HTMLElement, lang: string): Promise<void> {
    this.mounting ??= this.render(container, lang);
    return this.mounting;
  }

  /** A fresh token, or null when the check could not be completed. */
  async token(): Promise<string | null> {
    await this.mounting?.catch(() => undefined);
    const api = this.document.defaultView?.turnstile;
    if (!api || this.widgetId === null) {
      return null;
    }
    if (this.latest) {
      const token = this.latest;
      this.latest = null;
      return token;
    }
    if (!this.running) {
      this.running = true;
      if (this.used) api.reset(this.widgetId);
      this.used = true;
      api.execute(this.widgetId);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.settle(null), TOKEN_TIMEOUT_MS);
      this.pending = (token) => {
        clearTimeout(timer);
        resolve(token);
      };
    });
  }

  /** Clears the widget after the server refused its token; the next token() runs a new challenge. */
  reset(): void {
    const api = this.document.defaultView?.turnstile;
    this.latest = null;
    this.running = false;
    if (api && this.widgetId !== null) {
      api.reset(this.widgetId);
      this.used = false;
    }
  }

  destroy(): void {
    const api = this.document.defaultView?.turnstile;
    if (api && this.widgetId !== null) {
      api.remove(this.widgetId);
    }
    this.widgetId = null;
    this.mounting = null;
    this.latest = null;
    this.running = false;
    this.used = false;
  }

  private async render(container: HTMLElement, lang: string): Promise<void> {
    const api = await this.load();
    this.widgetId = api.render(container, {
      sitekey: this.siteKey,
      language: lang,
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token: string) => this.settle(token),
      'error-callback': () => this.settle(null),
      'expired-callback': () => {
        // Turnstile refreshes an expired token by itself; until then there is none to use.
        this.latest = null;
      },
    });
  }

  /** A run finished: hand its token to a waiting submit, or keep it for the next one. */
  private settle(token: string | null): void {
    this.running = false;
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      pending(token);
    } else {
      this.latest = token;
    }
  }

  private load(): Promise<TurnstileApi> {
    const win = this.document.defaultView!;
    if (win.turnstile) {
      return Promise.resolve(win.turnstile);
    }
    return new Promise((resolve, reject) => {
      const existing = this.document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_URL}"]`,
      );
      const script = existing ?? this.document.createElement('script');
      script.addEventListener('load', () =>
        win.turnstile ? resolve(win.turnstile) : reject(new Error('Turnstile')),
      );
      script.addEventListener('error', () => reject(new Error('Turnstile could not be loaded')));
      if (!existing) {
        script.src = SCRIPT_URL;
        script.async = true;
        this.document.head.appendChild(script);
      }
    });
  }
}
