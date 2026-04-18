import { createPipeline, getLatestAdjustments, getLatestOperation } from '@/core/pipeline';
import { getLutById } from '@/core/luts';
import { PRESET_PACKS, PRESETS, applyPresetToPipeline } from './presets';

describe('presets', () => {
  it('has at least 12 presets', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(12);
  });

  it('is grouped in required categories', () => {
    const categories = new Set(PRESETS.map((item) => item.category));
    expect(categories.has('Vintage')).toBe(true);
    expect(categories.has('Clean')).toBe(true);
    expect(categories.has('Dark')).toBe(true);
    expect(categories.has('Film')).toBe(true);
  });

  it('applies preset as operations on pipeline', () => {
    const preset = PRESETS[0];
    const result = applyPresetToPipeline(createPipeline(), preset);

    expect(getLatestOperation(result, 'preset')?.payload.presetId).toBe(preset.id);
    expect(getLatestAdjustments(result)).toEqual(preset.adjustments);
  });

  it('applies LUT when preset has one configured', () => {
    const preset = PRESETS.find((item) => item.lutId);
    expect(preset).toBeDefined();

    const result = applyPresetToPipeline(createPipeline(), preset ?? null);
    expect(getLatestOperation(result, 'lut')?.payload.lutId).toBe(preset?.lutId);
  });

  it('clears preset and adjustments when selecting none', () => {
    const pipelineWithPreset = applyPresetToPipeline(createPipeline(), PRESETS[0]);
    const cleared = applyPresetToPipeline(pipelineWithPreset, null);

    expect(getLatestOperation(cleared, 'preset')).toBeUndefined();
    expect(getLatestOperation(cleared, 'adjustments')).toBeUndefined();
    expect(getLatestOperation(cleared, 'lut')).toBeUndefined();
  });

  it('ensures every preset lutId exists in LUT catalog', () => {
    const allPresets = Object.values(PRESET_PACKS).flat();
    for (const preset of allPresets) {
      if (!preset.lutId) {
        continue;
      }
      expect(getLutById(preset.lutId)).toBeDefined();
    }
  });

  it('ensures preset ids are unique inside each pack', () => {
    for (const [packId, presets] of Object.entries(PRESET_PACKS)) {
      const ids = presets.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
      expect(packId.length).toBeGreaterThan(0);
    }
  });
});
