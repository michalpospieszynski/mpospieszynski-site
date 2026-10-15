import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#2b2216', '#2b2216')).toBeCloseTo(1, 5);
  });

  it('accepts short hex and is symmetric', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#e4e2da', '#2b2216')).toBeCloseTo(
      contrastRatio('#2b2216', '#e4e2da'),
      10,
    );
  });

  it('matches the measured ratios in docs/UI-UX-DESIGN.md', () => {
    expect(contrastRatio('#e4e2da', '#2b2216')).toBeCloseTo(12.1, 1); // ink on ground, dark
    expect(contrastRatio('#a39a8b', '#382d1e')).toBeCloseTo(4.8, 1); // muted on raised, dark
    expect(contrastRatio('#375e2b', '#ddd7ca')).toBeCloseTo(5.2, 1); // ok on raised, light
  });

  it('rejects values that are not hex colours', () => {
    expect(() => contrastRatio('rgb(0,0,0)', '#fff')).toThrow();
  });
});
