import { OVERLAYS, getOverlayById } from './catalog';

describe('overlays catalog', () => {
  it('has at least 8 fixed overlays', () => {
    expect(OVERLAYS.length).toBeGreaterThanOrEqual(8);
  });

  it('resolves known overlay id', () => {
    expect(getOverlayById('film-grain')).toBeDefined();
  });
});
