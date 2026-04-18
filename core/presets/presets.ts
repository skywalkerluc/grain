import { DEFAULT_ADJUSTMENTS, upsertOperation, type AdjustmentValues, type PipelineState } from '@/core/pipeline';

export type PresetCategory = 'Vintage' | 'Clean' | 'Dark' | 'Film';

export type PresetDefinition = {
  id: string;
  name: string;
  category: PresetCategory;
  adjustments: AdjustmentValues;
  lutId?: string;
  lutIntensity?: number;
};

function preset(
  id: string,
  name: string,
  category: PresetCategory,
  adjustments: Partial<AdjustmentValues>,
  options?: { lutId?: string; lutIntensity?: number }
): PresetDefinition {
  return {
    id,
    name,
    category,
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      ...adjustments
    },
    lutId: options?.lutId,
    lutIntensity: options?.lutIntensity ?? 1
  };
}

export const PRESETS: PresetDefinition[] = [
  preset('vintage-soft', 'Soft 81', 'Vintage', {
    fade: 25,
    saturation: -12,
    temperature: 14,
    grain: 10
  }),
  preset('vintage-warm', 'Warm Dust', 'Vintage', {
    fade: 18,
    temperature: 24,
    contrast: -8,
    grain: 14
  }),
  preset('vintage-matte', 'Matte Gold', 'Vintage', {
    fade: 30,
    contrast: -16,
    saturation: -8,
    vignette: 10
  }),
  preset('clean-bright', 'Pure Light', 'Clean', {
    brightness: 18,
    contrast: 8,
    saturation: 4
  }),
  preset('clean-neutral', 'Neutral Pop', 'Clean', {
    brightness: 8,
    contrast: 14,
    saturation: 10,
    sharpness: 8
  }),
  preset('clean-cool', 'Cool Air', 'Clean', {
    brightness: 10,
    temperature: -18,
    saturation: 6
  }),
  preset('dark-cinema', 'Cinema Night', 'Dark', {
    brightness: -18,
    contrast: 22,
    saturation: -6,
    vignette: 24
  }),
  preset('dark-carbon', 'Carbon', 'Dark', {
    brightness: -14,
    contrast: 26,
    saturation: -18,
    grain: 8
  }),
  preset('dark-blue', 'Deep Blue', 'Dark', {
    brightness: -12,
    temperature: -22,
    contrast: 16,
    vignette: 18
  }),
  preset('film-iso200', 'ISO 200', 'Film', {
    contrast: 10,
    temperature: 8,
    grain: 16,
    fade: 8
  }),
  preset('film-iso800', 'ISO 800', 'Film', {
    contrast: 18,
    saturation: -10,
    grain: 26,
    vignette: 8
  }),
  preset('film-cross', 'Cross Dev', 'Film', {
    contrast: 16,
    saturation: 14,
    temperature: 10,
    grain: 20
  }, { lutId: 'cinematic-teal', lutIntensity: 0.9 })
];

export function getPresetById(id: string): PresetDefinition | undefined {
  return PRESETS.find((item) => item.id === id);
}

export function applyPresetToPipeline(
  pipeline: PipelineState,
  preset: PresetDefinition | null
): PipelineState {
  const withoutPresetAdjustmentsAndLut = {
    ...pipeline,
    operations: pipeline.operations.filter(
      (operation) =>
        operation.type !== 'preset' && operation.type !== 'adjustments' && operation.type !== 'lut'
    )
  };

  if (!preset) {
    return withoutPresetAdjustmentsAndLut;
  }

  const withPreset = upsertOperation(withoutPresetAdjustmentsAndLut, {
    id: crypto.randomUUID(),
    type: 'preset',
    payload: { presetId: preset.id }
  });

  const withAdjustments = upsertOperation(withPreset, {
    id: crypto.randomUUID(),
    type: 'adjustments',
    payload: preset.adjustments
  });

  if (!preset.lutId) {
    return withAdjustments;
  }

  return upsertOperation(withAdjustments, {
    id: crypto.randomUUID(),
    type: 'lut',
    payload: {
      lutId: preset.lutId,
      intensity: preset.lutIntensity ?? 1
    }
  });
}
