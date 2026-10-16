import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../core/i18n/language.service';
import { LocalizedPathPipe } from '../core/i18n/localized-path.pipe';
import { ProfileStore } from '../core/profile/profile.store';
import { RouteKey } from '../core/i18n/route-table';
import { SeoService } from '../core/seo/seo.service';
import { ThemeToggleComponent } from '../shared/ui/theme-toggle.component';

/** The five tabs, in order (app-shell spec). */
export const NAV_ITEMS: readonly RouteKey[] = [
  'projects',
  'skills',
  'services',
  'about',
  'contact',
];

/** `routerLinkActive` that also marks /projekty while a case study is open, and ignores query parameters. */
const SECTION_MATCH = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
} as const;

/** "Michał Pośpieszyński" → "M. Pośpieszyński": the first name shortened to its initial; one word stays whole. */
function brandName(fullName: string | null | undefined): string {
  const [first, ...rest] = (fullName ?? '').trim().split(/\s+/);
  return rest.length ? `${first.charAt(0)}. ${rest.join(' ')}` : (first ?? '');
}

/**
 * Header of every public page (docs/screens/public/01-app-shell.md, DIRECTION.md): sticky 72px bar with the
 * graph mark and name, the section links, the light/dark switch and a pill that switches to the other language
 * (it shows that language's code). Below 900px the links move into a <dialog> menu sheet; the language pill stays.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, LocalizedPathPipe, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  protected readonly language = inject(LanguageService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly navItems = NAV_ITEMS;
  protected readonly sectionMatch = SECTION_MATCH;

  /** From the profile's full name (admin → Profile); `shell.brand` only until a profile is loaded. */
  private readonly profile = inject(ProfileStore).profile;
  protected readonly brand = computed(() => brandName(this.profile()?.fullName));

  protected readonly otherLang = computed(() => (this.language.lang() === 'pl' ? 'en' : 'pl'));

  /** The other language's version of this page; a UrlTree keeps the query string intact. */
  protected readonly switchTarget = computed(() =>
    this.router.parseUrl(this.language.switchUrl(this.seo.alternates())),
  );

  private readonly menu = viewChild.required<ElementRef<HTMLDialogElement>>('menu');
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

  /** With <base href="/">, "#content" would lead to the home page; move focus to <main> directly instead. */
  protected skipToContent(event: MouseEvent): void {
    const main = this.document.getElementById('content');
    if (main) {
      event.preventDefault();
      main.focus();
      main.scrollIntoView();
    }
  }

  protected openMenu(): void {
    this.menu().nativeElement.showModal();
  }

  protected closeMenu(): void {
    this.menu().nativeElement.close();
  }

  /** A click on the backdrop lands on the <dialog> itself, outside its inner panel. */
  protected onMenuClick(event: MouseEvent): void {
    if (event.target === this.menu().nativeElement) {
      this.closeMenu();
    }
  }

  /** Runs for Esc, links, the close button and the backdrop alike. */
  protected onMenuClosed(): void {
    this.menuButton().nativeElement.focus();
  }
}
