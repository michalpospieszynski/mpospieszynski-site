import { TestBed } from '@angular/core/testing';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';

import { IcuTranspiler, formatIcu } from './icu-transpiler';

const PL_PROJECTS =
  '{count, plural, one {# projekt} few {# projekty} many {# projektów} other {# projektu}}';

describe('formatIcu', () => {
  it('chooses Polish plural categories and formats #', () => {
    expect(formatIcu(PL_PROJECTS, { count: 1 }, 'pl')).toBe('1 projekt');
    expect(formatIcu(PL_PROJECTS, { count: 3 }, 'pl')).toBe('3 projekty');
    expect(formatIcu(PL_PROJECTS, { count: 5 }, 'pl')).toBe('5 projektów');
    expect(formatIcu(PL_PROJECTS, { count: 22 }, 'pl')).toBe('22 projekty');
    expect(formatIcu(PL_PROJECTS, { count: 1.5 }, 'pl')).toBe('1,5 projektu');
  });

  it('prefers exact matches and supports English and nested arguments', () => {
    const msg = '{n, plural, =0 {none} one {one {what}} other {# {what}s}}';
    expect(formatIcu(msg, { n: 0, what: 'item' }, 'en')).toBe('none');
    expect(formatIcu(msg, { n: 1, what: 'item' }, 'en')).toBe('one item');
    expect(formatIcu(msg, { n: 1200, what: 'item' }, 'en')).toBe('1,200 items');
  });

  it('replaces simple arguments, keeps unknown ones, honours select and quoting', () => {
    expect(formatIcu('Zapisano o {time}', { time: '14:32' }, 'pl')).toBe('Zapisano o 14:32');
    expect(formatIcu('Hello {name}', {}, 'en')).toBe('Hello {name}');
    expect(formatIcu('{g, select, f {she} other {they}}', { g: 'x' }, 'en')).toBe('they');
    expect(formatIcu("Możesz użyć '{name}' – tak.", { name: 'Ania' }, 'pl')).toBe(
      'Możesz użyć {name} – tak.',
    );
    expect(formatIcu("don't ''quote''", {}, 'en')).toBe("don't 'quote'");
  });
});

describe('IcuTranspiler', () => {
  it('formats in the active language', () => {
    TestBed.configureTestingModule({
      providers: [IcuTranspiler, { provide: TRANSLOCO_CONFIG, useValue: translocoConfig({}) }],
    });
    const transpiler = TestBed.inject(IcuTranspiler);
    transpiler.onLangChanged('en');
    const value = '{count, plural, one {# project} other {# projects}}';
    expect(transpiler.transpile({ value, params: { count: 2 }, translation: {}, key: 'k' })).toBe(
      '2 projects',
    );
    transpiler.onLangChanged('pl');
    expect(
      transpiler.transpile({ value: PL_PROJECTS, params: { count: 2 }, translation: {}, key: 'k' }),
    ).toBe('2 projekty');
  });
});
