import { getLutById, LUTS } from './luts';

describe('luts catalog', () => {
  it('contains at least one LUT', () => {
    expect(LUTS.length).toBeGreaterThan(0);
  });

  it('resolves cinematic-teal LUT', () => {
    expect(getLutById('cinematic-teal')).toBeDefined();
  });
});
