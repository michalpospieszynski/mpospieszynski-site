import { Injectable, inject, signal } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, shareReplay, tap } from 'rxjs';

import { ProfileResponse, PublicProfileControllerService } from '../../api';
import { DEFAULT_LANG, Lang } from '../i18n/route-table';

/**
 * The site profile (name, headline, social links, availability), loaded once per language and kept for the
 * session. The shell resolver loads it; pages reuse it through `load()` or read the `profile` signal.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(PublicProfileControllerService);
  private readonly requests = new Map<Lang, Observable<ProfileResponse>>();
  private readonly current = signal<ProfileResponse | null>(null);

  /** The profile in the current page language, once loaded. */
  readonly profile = this.current.asReadonly();

  load(lang: Lang): Observable<ProfileResponse> {
    let request = this.requests.get(lang);
    if (!request) {
      request = this.api.getPublicProfile({ lang }).pipe(shareReplay(1));
      this.requests.set(lang, request);
    }
    return request.pipe(tap((profile) => this.current.set(profile)));
  }
}

/** Runs on each language root next to the language resolver. */
export const profileResolver: ResolveFn<ProfileResponse> = (route) =>
  inject(ProfileStore).load((route.data['lang'] as Lang | undefined) ?? DEFAULT_LANG);
