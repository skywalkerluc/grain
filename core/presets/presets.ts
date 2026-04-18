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
  // Vintage — three clearly distinct film aesthetics
  preset('vintage-sienna', 'Old Roll', 'Vintage', {
    brightness: -2,
    contrast: -10,
    saturation: -18,
    temperature: 18,
    fade: 28,
    grain: 34,
    vignette: 20
  }, { lutId: 'expired-analog', lutIntensity: 0.88 }),

  preset('vintage-linen', 'Linen Fade', 'Vintage', {
    brightness: 10,
    contrast: -16,
    saturation: -12,
    temperature: -6,
    fade: 32,
    grain: 16,
    vignette: 8
  }, { lutId: 'polaroid-fade', lutIntensity: 0.76 }),

  preset('vintage-amber', 'Amber 35', 'Vintage', {
    brightness: 6,
    contrast: 4,
    saturation: -8,
    temperature: 24,
    fade: 12,
    grain: 20,
    vignette: 12
  }, { lutId: 'warm-kodak', lutIntensity: 0.88 }),

  // Clean — neutral to cool, high clarity
  preset('clean-crisp', 'Crisp Day', 'Clean', {
    brightness: 14,
    contrast: 10,
    saturation: 4,
    temperature: 0,
    grain: 4,
    sharpness: 14
  }),

  preset('clean-natural', 'Natural Pop', 'Clean', {
    brightness: 8,
    contrast: 8,
    saturation: 14,
    temperature: -4,
    grain: 6,
    sharpness: 8
  }),

  preset('clean-cool', 'Cool Glass', 'Clean', {
    brightness: 10,
    contrast: 12,
    saturation: 4,
    temperature: -22,
    fade: 2,
    grain: 4,
    sharpness: 12,
    vignette: 4
  }, { lutId: 'cinematic-teal', lutIntensity: 0.44 }),

  // Dark — three distinct shadow aesthetics
  preset('dark-ink', 'Ink Night', 'Dark', {
    brightness: -20,
    contrast: 26,
    saturation: -28,
    temperature: -8,
    vignette: 26,
    grain: 20
  }, { lutId: 'noir-silver', lutIntensity: 0.52 }),

  preset('dark-graphite', 'Graphite', 'Dark', {
    brightness: -8,
    contrast: 20,
    saturation: -22,
    fade: 4,
    grain: 12,
    vignette: 16,
    sharpness: 4
  }, { lutId: 'cool-bleach', lutIntensity: 0.68 }),

  preset('dark-neon', 'Neon Alley', 'Dark', {
    brightness: -14,
    contrast: 24,
    saturation: 8,
    temperature: -20,
    grain: 16,
    vignette: 18
  }, { lutId: 'lomo-chrome', lutIntensity: 0.80 }),

  // Film — grain-forward analog character
  preset('film-iso160', 'ISO 160', 'Film', {
    brightness: 4,
    contrast: 8,
    saturation: -4,
    temperature: 8,
    fade: 8,
    grain: 24,
    sharpness: 8
  }, { lutId: 'warm-kodak', lutIntensity: 0.64 }),

  preset('film-iso400', 'ISO 400', 'Film', {
    brightness: -4,
    contrast: 14,
    saturation: -10,
    temperature: 6,
    fade: 6,
    grain: 42,
    vignette: 10
  }, { lutId: 'expired-analog', lutIntensity: 0.46 }),

  preset('film-cross', 'Cross Dev', 'Film', {
    brightness: -4,
    contrast: 22,
    saturation: 18,
    temperature: -2,
    fade: 2,
    grain: 28,
    vignette: 12
  }, { lutId: 'cross-process', lutIntensity: 0.82 })
];

export const PRESET_PACKS: Record<PresetPackId, PresetDefinition[]> = {
  balanced: BASE_PRESETS,
  clean: buildPack(BASE_PRESETS, 'clean'),
  filmic: buildPack(BASE_PRESETS, 'filmic'),
  bold: buildPack(BASE_PRESETS, 'bold')
};

export const DEFAULT_PRESET_PACK: PresetPackId = 'balanced';

export function getPresetsByPack(pack: PresetPackId): PresetDefinition[] {
  return PRESET_PACKS[pack];
}

export function inferPresetPackFromId(presetId: string): PresetPackId {
  if (presetId.endsWith('-clean')) {
    return 'clean';
  }
  if (presetId.endsWith('-filmic')) {
    return 'filmic';
  }
  if (presetId.endsWith('-bold')) {
    return 'bold';
  }
  return 'balanced';
}

export const PRESETS: PresetDefinition[] = getPresetsByPack(DEFAULT_PRESET_PACK);

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
