import { createPipeline, getLatestAdjustments, getLatestOperation } from '@/core/pipeline';
import { PRESETS, applyPresetToPipeline } from './presets';

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
});
