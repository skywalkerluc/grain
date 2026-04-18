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

export type PresetPackId = 'balanced' | 'clean' | 'filmic' | 'bold';

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tuneAdjustments(base: AdjustmentValues, pack: PresetPackId): AdjustmentValues {
  const next = { ...base };

  if (pack === 'clean') {
    next.grain = clamp(Math.round(base.grain * 0.45), 0, 100);
    next.fade = clamp(Math.round(base.fade * 0.65), 0, 100);
    next.vignette = clamp(Math.round(base.vignette * 0.6), 0, 100);
    next.saturation = clamp(base.saturation - 2, -100, 100);
    next.temperature = clamp(Math.round(base.temperature * 0.65), -100, 100);
    next.sharpness = clamp(base.sharpness + 2, 0, 100);
    return next;
  }

  if (pack === 'filmic') {
    next.grain = clamp(Math.round(base.grain * 1.3 + 4), 0, 100);
    next.fade = clamp(Math.round(base.fade * 1.25 + 2), 0, 100);
    next.vignette = clamp(Math.round(base.vignette * 1.15), 0, 100);
    next.saturation = clamp(base.saturation - 4, -100, 100);
    next.contrast = clamp(base.contrast - 2, -100, 100);
    next.temperature = clamp(base.temperature + 2, -100, 100);
    return next;
  }

  if (pack === 'bold') {
    next.grain = clamp(Math.round(base.grain * 0.85), 0, 100);
    next.fade = clamp(Math.round(base.fade * 0.55), 0, 100);
    next.vignette = clamp(Math.round(base.vignette * 0.9), 0, 100);
    next.saturation = clamp(base.saturation + 8, -100, 100);
    next.contrast = clamp(base.contrast + 8, -100, 100);
    next.sharpness = clamp(base.sharpness + 6, 0, 100);
    return next;
  }

  return next;
}

function tuneLutIntensity(baseIntensity: number, pack: PresetPackId): number {
  if (pack === 'clean') {
    return clamp(baseIntensity * 0.75, 0, 1);
  }
  if (pack === 'filmic') {
    return clamp(baseIntensity * 1.12, 0, 1);
  }
  if (pack === 'bold') {
    return clamp(baseIntensity * 1.2, 0, 1);
  }
  return clamp(baseIntensity, 0, 1);
}

function buildPack(base: PresetDefinition[], pack: PresetPackId): PresetDefinition[] {
  if (pack === 'balanced') {
    return base;
  }

  return base.map((item) => {
    const baseIntensity = item.lutIntensity ?? 1;
    return {
      ...item,
      id: `${item.id}-${pack}`,
      name: `${item.name} ${pack === 'clean' ? 'C' : pack === 'filmic' ? 'F' : 'B'}`,
      adjustments: tuneAdjustments(item.adjustments, pack),
      lutIntensity: item.lutId ? tuneLutIntensity(baseIntensity, pack) : item.lutIntensity
    };
  });
}

const BASE_PRESETS: PresetDefinition[] = [
  preset('vintage-sienna', 'Sienna Dust', 'Vintage', {
    brightness: 4,
    contrast: -8,
    saturation: -10,
    temperature: 16,
    fade: 22,
    grain: 20,
    vignette: 12
  }, { lutId: 'warm-kodak', lutIntensity: 0.74 }),
  preset('vintage-linen', 'Linen Fade', 'Vintage', {
    brightness: 8,
    contrast: -14,
    saturation: -14,
    temperature: 8,
    fade: 30,
    grain: 24,
    sharpness: 2
  }, { lutId: 'faded-portra', lutIntensity: 0.82 }),
  preset('vintage-amber', 'Amber 35', 'Vintage', {
    brightness: 2,
    contrast: 2,
    saturation: -12,
    temperature: 20,
    fade: 16,
    grain: 26,
    vignette: 16
  }, { lutId: 'warm-kodak', lutIntensity: 0.86 }),
  preset('clean-crisp', 'Crisp Day', 'Clean', {
    brightness: 14,
    contrast: 8,
    saturation: 4,
    temperature: 2,
    grain: 4,
    sharpness: 10
  }),
  preset('clean-natural', 'Natural Pop', 'Clean', {
    brightness: 8,
    contrast: 6,
    saturation: 8,
    temperature: -4,
    fade: 4,
    grain: 8
  }, { lutId: 'faded-portra', lutIntensity: 0.28 }),
  preset('clean-cool', 'Cool Glass', 'Clean', {
    brightness: 8,
    contrast: 12,
    saturation: 4,
    temperature: -16,
    fade: 2,
    grain: 6
  }, { lutId: 'cool-bleach', lutIntensity: 0.48 }),
  preset('dark-ink', 'Ink Night', 'Dark', {
    brightness: -18,
    contrast: 22,
    saturation: -12,
    temperature: -8,
    vignette: 24,
    grain: 22
  }, { lutId: 'noir-silver', lutIntensity: 0.44 }),
  preset('dark-graphite', 'Graphite', 'Dark', {
    brightness: -16,
    contrast: 20,
    saturation: -20,
    fade: 6,
    grain: 18,
    vignette: 20
  }, { lutId: 'noir-silver', lutIntensity: 0.66 }),
  preset('dark-neon', 'Neon Alley', 'Dark', {
    brightness: -12,
    contrast: 20,
    saturation: 6,
    temperature: -16,
    grain: 18,
    vignette: 14
  }, { lutId: 'cinematic-teal', lutIntensity: 0.82 }),
  preset('film-iso160', 'ISO 160', 'Film', {
    brightness: 4,
    contrast: 8,
    saturation: -4,
    temperature: 8,
    fade: 8,
    grain: 28,
    sharpness: 6
  }, { lutId: 'faded-portra', lutIntensity: 0.76 }),
  preset('film-iso400', 'ISO 400', 'Film', {
    brightness: -2,
    contrast: 12,
    saturation: -8,
    temperature: 6,
    fade: 8,
    grain: 38,
    vignette: 10
  }, { lutId: 'warm-kodak', lutIntensity: 0.62 }),
  preset('film-cross', 'Cross Dev', 'Film', {
    brightness: -4,
    contrast: 18,
    saturation: 12,
    temperature: -2,
    fade: 4,
    grain: 32,
    vignette: 12
  }, { lutId: 'cross-process', lutIntensity: 0.8 })
];

export const PRESET_PACKS: Record<PresetPackId, PresetDefinition[]> = {
  balanced: BASE_PRESETS,
  clean: buildPack(BASE_PRESETS, 'clean'),
  filmic: buildPack(BASE_PRESETS, 'filmic'),
  bold: buildPack(BASE_PRESETS, 'bold')
};

// v5.2 selector: switch this value to quickly test different style directions.
export const ACTIVE_PRESET_PACK: PresetPackId = 'balanced';

export const PRESETS: PresetDefinition[] = PRESET_PACKS[ACTIVE_PRESET_PACK];

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
