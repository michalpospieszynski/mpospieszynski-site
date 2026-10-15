import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { provideI18n } from '../../core/i18n/i18n.providers';
import { AvailabilityComponent } from './availability.component';
import { ButtonComponent } from './button.component';
import { FieldComponent } from './field.component';
import { LangFallbackComponent } from './lang-fallback.component';
import { renderMarkdown } from './markdown.component';

@Component({
  imports: [
    ButtonComponent,
    LangFallbackComponent,
    FieldComponent,
    AvailabilityComponent,
  ],
  template: `
    <ui-button id="b1">Button</ui-button>
    <ui-button id="b2" link="/projekty">Router link</ui-button>
    <ui-button id="b3" href="https://github.com/">External</ui-button>
    <ui-lang-fallback id="fb">po polsku</ui-lang-fallback>
    <ui-field #f controlId="email" label="E-mail" hint="Hint" error="Error">
      <input id="email" [attr.aria-describedby]="f.describedBy()" />
    </ui-field>
    <ui-availability status="OPEN" />
    <ui-button id="b4" variant="ghost" [pressed]="true">Toggle</ui-button>
  `,
})
class Host {}

describe('shared UI', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideI18n()] });
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load('pl'));
    transloco.setActiveLang('pl');
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a button, a router link or an external link', async () => {
    const { el } = await render();
    expect(el.querySelector('#b1 button')?.getAttribute('type')).toBe('button');
    expect(el.querySelector('#b2 a')?.getAttribute('href')).toBe('/projekty');
    expect(el.querySelector('#b3 a')?.getAttribute('rel')).toBe('noopener');
    expect(
      ['#b1 button', '#b2 a', '#b3 a'].map((s) => el.querySelector(s)?.textContent?.trim()),
    ).toEqual(['Button', 'Router link', 'External']);
  });

  it('marks fallback text with its language', async () => {
    const { el } = await render();
    expect(el.querySelector('#fb')?.getAttribute('lang')).toBe('pl');
  });

  it('wires the field hint and error to the control', async () => {
    const { el } = await render();
    expect(el.querySelector('label')?.getAttribute('for')).toBe('email');
    expect(el.querySelector('#email')?.getAttribute('aria-describedby')).toBe(
      'email-hint email-error',
    );
    expect(el.querySelector('#email-error')?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows availability as text, not colour alone', async () => {
    const { el } = await render();
    expect(el.querySelector('ui-availability')?.textContent).toContain('Przyjmuję nowe projekty');
  });

  it('renders pill variants and a toggle with aria-pressed only when it is one', async () => {
    const { el } = await render();
    expect([...el.querySelector('#b1 button')!.classList].sort()).toEqual(['btn', 'btn--md', 'btn--primary']);
    expect(el.querySelector('#b1 button')?.hasAttribute('aria-pressed')).toBe(false);
    expect([...el.querySelector('#b4 button')!.classList].sort()).toEqual(['btn', 'btn--ghost', 'btn--md']);
    expect(el.querySelector('#b4 button')?.getAttribute('aria-pressed')).toBe('true');
  });
});
