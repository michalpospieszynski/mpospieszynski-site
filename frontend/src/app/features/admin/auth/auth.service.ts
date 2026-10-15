import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

import { AdminSession } from '../../../core/auth/admin-session';

/** Served by the SSR server (src/server.ts) from its environment, so one image runs everywhere. */
interface RuntimeConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export type SignInResult = 'ok' | 'mfa' | 'invalid' | 'notAdmin' | 'network';
export type MfaResult = 'ok' | 'invalid' | 'notAdmin' | 'network';

/** A message the login page shows once (after the session expired). */
export type LoginNotice = 'sessionExpired' | null;

/** Reads the claims of an access token. No verification: the API verifies; this only steers the UI. */
export function tokenClaims(token: string | undefined | null): Record<string, unknown> {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return {};
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function isAdminToken(token: string | undefined | null): boolean {
  const meta = tokenClaims(token)['app_metadata'] as { role?: unknown } | undefined;
  return meta?.role === 'admin';
}

/**
 * Supabase Auth for the admin (docs/screens/admin/01-admin-shell.md, 02-login.md). It lives in the lazy admin
 * chunk; on first use it plugs itself into the root AdminSession so the global interceptor can add the token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly adminSession = inject(AdminSession);

  private client: Promise<SupabaseClient> | null = null;
  private pendingRefresh: Promise<string | null> | null = null;

  readonly email = signal<string | null>(null);
  readonly notice = signal<LoginNotice>(null);

  private supabase(): Promise<SupabaseClient> {
    this.client ??= firstValueFrom(this.http.get<RuntimeConfig>('/config.json')).then((config) => {
      const client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      client.auth.onAuthStateChange((_event, session) =>
        this.email.set(session?.user.email ?? null),
      );
      this.adminSession.connect({
        accessToken: () => this.accessToken(),
        refresh: () => this.refresh(),
        expired: () => void this.signOut('sessionExpired'),
      });
      return client;
    });
    // A failed config fetch must not stick: the next attempt tries again.
    this.client.catch(() => (this.client = null));
    return this.client;
  }

  private async session(): Promise<Session | null> {
    const { data } = await (await this.supabase()).auth.getSession();
    return data.session;
  }

  async accessToken(): Promise<string | null> {
    return (await this.session())?.access_token ?? null;
  }

  /** One refresh at a time: parallel 401s share it. */
  refresh(): Promise<string | null> {
    this.pendingRefresh ??= this.supabase()
      .then((client) => client.auth.refreshSession())
      .then(({ data }) => data.session?.access_token ?? null)
      .catch(() => null)
      .finally(() => (this.pendingRefresh = null));
    return this.pendingRefresh;
  }

  /** A signed-in admin who has also passed the TOTP step when a factor is enrolled. */
  async isAdmin(): Promise<boolean> {
    try {
      const session = await this.session();
      if (!session || !isAdminToken(session.access_token)) return false;
      this.email.set(session.user.email ?? null);
      return !(await this.needsMfa());
    } catch {
      return false;
    }
  }

  private async needsMfa(): Promise<boolean> {
    const { data } = await (await this.supabase()).auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const client = await this.supabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        return error && (!error.status || error.status >= 500) ? 'network' : 'invalid';
      }
      if (await this.needsMfa()) return 'mfa';
      return this.checkRole(data.session.access_token);
    } catch {
      return 'network';
    }
  }

  async verifyMfa(code: string): Promise<MfaResult> {
    try {
      const client = await this.supabase();
      const { data: factors } = await client.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === 'verified');
      if (!factor) return 'invalid';
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) return !error.status || error.status >= 500 ? 'network' : 'invalid';
      return this.checkRole(await this.accessToken());
    } catch {
      return 'network';
    }
  }

  private async checkRole(token: string | null): Promise<'ok' | 'notAdmin'> {
    if (isAdminToken(token)) return 'ok';
    await (await this.supabase()).auth.signOut({ scope: 'local' });
    return 'notAdmin';
  }

  /** Signs out and goes to the login page; after an expired session it comes back to the current page. */
  async signOut(notice: LoginNotice = null): Promise<void> {
    const current = this.router.url;
    try {
      await (await this.supabase()).auth.signOut({ scope: 'local' });
    } catch {
      // The local session is gone either way; the API refuses the old token once it expires.
    }
    this.email.set(null);
    this.notice.set(notice);
    const returnUrl =
      notice && current.startsWith('/admin') && !current.startsWith('/admin/logowanie')
        ? current
        : null;
    await this.router.navigate(['/admin/logowanie'], {
      queryParams: returnUrl ? { returnUrl } : {},
    });
  }
}
