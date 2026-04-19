import type { AdjustmentValues, PipelineOperation, PipelineState } from './types';

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  sharpness: 0,
  vignette: 0,
  fade: 0,
  grain: 0
};

export function createPipeline(initial?: Partial<PipelineState>): PipelineState {
  return {
    version: 1,
    operations: initial?.operations ? [...initial.operations] : []
  };
}

export function clonePipeline(pipeline: PipelineState): PipelineState {
  return {
    version: pipeline.version,
    operations: structuredClone(pipeline.operations)
  };
}

export function serializePipeline(pipeline: PipelineState): string {
  return JSON.stringify(pipeline);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isCanvasAlign(value: unknown): value is CanvasTextAlign {
  return value === 'left' || value === 'center' || value === 'right';
}

function normalizeCanvasAlign(value: unknown): CanvasTextAlign {
  if (value === 'start') {
    return 'left';
  }
  if (value === 'end') {
    return 'right';
  }
  if (isCanvasAlign(value)) {
    return value;
  }
  return 'center';
}

function isBlendMode(
  value: unknown
): value is
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light' {
  return (
    value === 'normal' ||
    value === 'multiply' ||
    value === 'screen' ||
    value === 'overlay' ||
    value === 'darken' ||
    value === 'lighten' ||
    value === 'color-dodge' ||
    value === 'color-burn' ||
    value === 'hard-light' ||
    value === 'soft-light'
  );
}

function toOperationId(operation: Record<string, unknown>): string {
  if (typeof operation.id === 'string') {
    return operation.id;
  }
  return crypto.randomUUID();
}

function normalizeOperation(operation: unknown): PipelineOperation | null {
  if (!isRecord(operation) || typeof operation.type !== 'string') {
    return null;
  }

  const payload = operation.payload;
  if (!isRecord(payload)) {
    return null;
  }

  const id = toOperationId(operation);

  if (operation.type === 'adjustments') {
    return {
      id,
      type: 'adjustments',
      payload: {
        brightness: isFiniteNumber(payload.brightness) ? payload.brightness : DEFAULT_ADJUSTMENTS.brightness,
        contrast: isFiniteNumber(payload.contrast) ? payload.contrast : DEFAULT_ADJUSTMENTS.contrast,
        saturation: isFiniteNumber(payload.saturation) ? payload.saturation : DEFAULT_ADJUSTMENTS.saturation,
        temperature: isFiniteNumber(payload.temperature) ? payload.temperature : DEFAULT_ADJUSTMENTS.temperature,
        sharpness: isFiniteNumber(payload.sharpness) ? payload.sharpness : DEFAULT_ADJUSTMENTS.sharpness,
        vignette: isFiniteNumber(payload.vignette) ? payload.vignette : DEFAULT_ADJUSTMENTS.vignette,
        fade: isFiniteNumber(payload.fade) ? payload.fade : DEFAULT_ADJUSTMENTS.fade,
        grain: isFiniteNumber(payload.grain) ? payload.grain : DEFAULT_ADJUSTMENTS.grain
      }
    };
  }

  if (operation.type === 'preset') {
    if (typeof payload.presetId !== 'string' || payload.presetId.length === 0) {
      return null;
    }
    return {
      id,
      type: 'preset',
      payload: {
        presetId: payload.presetId,
        strength: isFiniteNumber(payload.strength) ? clamp(payload.strength, 0, 100) : undefined
      }
    };
  }

  if (operation.type === 'crop') {
    if (
      !isFiniteNumber(payload.x) ||
      !isFiniteNumber(payload.y) ||
      !isFiniteNumber(payload.width) ||
      !isFiniteNumber(payload.height)
    ) {
      return null;
    }
    return {
      id,
      type: 'crop',
      payload: {
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height
      }
    };
  }

  if (operation.type === 'rotate') {
    if (!isFiniteNumber(payload.angle)) {
      return null;
    }
    const normalized = (((Math.round(payload.angle) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
    if (normalized !== 90 && normalized !== 180 && normalized !== 270) {
      return null;
    }
    return { id, type: 'rotate', payload: { angle: normalized } };
  }

  if (operation.type === 'flip') {
    return {
      id,
      type: 'flip',
      payload: {
        horizontal: Boolean(payload.horizontal),
        vertical: Boolean(payload.vertical)
      }
    };
  }

  if (operation.type === 'lut') {
    if (typeof payload.lutId !== 'string' || payload.lutId.length === 0) {
      return null;
    }
    return {
      id,
      type: 'lut',
      payload: {
        lutId: payload.lutId,
        intensity: isFiniteNumber(payload.intensity) ? payload.intensity : 1
      }
    };
  }

  if (operation.type === 'overlay') {
    if (typeof payload.overlayId !== 'string' || payload.overlayId.length === 0) {
      return null;
    }
    return {
      id,
      type: 'overlay',
      payload: {
        overlayId: payload.overlayId,
        opacity: isFiniteNumber(payload.opacity) ? payload.opacity : 0.5,
        blendMode: isBlendMode(payload.blendMode) ? payload.blendMode : 'normal'
      }
    };
  }

  if (operation.type === 'text') {
    if (typeof payload.text !== 'string') {
      return null;
    }
    return {
      id,
      type: 'text',
      payload: {
        text: payload.text,
        x: isFiniteNumber(payload.x) ? payload.x : 0,
        y: isFiniteNumber(payload.y) ? payload.y : 0,
        color: typeof payload.color === 'string' ? payload.color : '#ffffff',
        fontFamily: typeof payload.fontFamily === 'string' ? payload.fontFamily : 'Avenir Next',
        fontSize: isFiniteNumber(payload.fontSize) ? payload.fontSize : 36,
        align: normalizeCanvasAlign(payload.align)
      }
    };
  }

  return null;
}

export function deserializePipeline(serialized: string): PipelineState {
  const parsed = JSON.parse(serialized) as unknown;
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.operations)) {
    throw new Error('Invalid pipeline format');
  }

  const operations = parsed.operations
    .map((operation) => normalizeOperation(operation))
    .filter((operation): operation is PipelineOperation => operation !== null);

  return {
    version: 1,
    operations
  };
}

export function upsertOperation(
  pipeline: PipelineState,
  operation: PipelineOperation,
  singletonTypes: PipelineOperation['type'][] = [
    'adjustments',
    'crop',
    'rotate',
    'flip',
    'lut',
    'overlay',
    'text'
  ]
): PipelineState {
  const next = clonePipeline(pipeline);

  if (singletonTypes.includes(operation.type)) {
    next.operations = next.operations.filter((item) => item.type !== operation.type);
  }

  next.operations.push(operation);
  return next;
}

export function getLatestAdjustments(pipeline: PipelineState): AdjustmentValues {
  const adjustmentOperation = getLatestOperation(pipeline, 'adjustments');

  if (!adjustmentOperation || adjustmentOperation.type !== 'adjustments') {
    return { ...DEFAULT_ADJUSTMENTS };
  }

  return { ...adjustmentOperation.payload };
}

export function getLatestOperation<TType extends PipelineOperation['type']>(
  pipeline: PipelineState,
  type: TType
): Extract<PipelineOperation, { type: TType }> | undefined {
  const operation = [...pipeline.operations].reverse().find((item) => item.type === type);
  return operation as Extract<PipelineOperation, { type: TType }> | undefined;
}

export function setAdjustment(
  pipeline: PipelineState,
  key: keyof AdjustmentValues,
  value: number
): PipelineState {
  const adjustments = getLatestAdjustments(pipeline);

  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'adjustments',
    payload: {
      ...adjustments,
      [key]: value
    }
  });
}

export function setCrop(
  pipeline: PipelineState,
  crop: { x: number; y: number; width: number; height: number }
): PipelineState {
  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'crop',
    payload: crop
  });
}

export function rotateQuarterTurn(
  pipeline: PipelineState,
  direction: 'clockwise' | 'counterclockwise'
): PipelineState {
  const rotateOperation = getLatestOperation(pipeline, 'rotate');
  const currentAngle = rotateOperation?.payload.angle ?? 0;
  const delta = direction === 'clockwise' ? 90 : -90;
  const nextAngle = (((currentAngle + delta) % 360) + 360) % 360;

  if (nextAngle === 0) {
    return {
      ...pipeline,
      operations: pipeline.operations.filter((operation) => operation.type !== 'rotate')
    };
  }

  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'rotate',
    payload: { angle: nextAngle as 90 | 180 | 270 }
  });
}

export function toggleFlip(
  pipeline: PipelineState,
  axis: 'horizontal' | 'vertical'
): PipelineState {
  const flipOperation = getLatestOperation(pipeline, 'flip');
  const horizontal = flipOperation?.payload.horizontal ?? false;
  const vertical = flipOperation?.payload.vertical ?? false;

  const nextFlip = {
    horizontal: axis === 'horizontal' ? !horizontal : horizontal,
    vertical: axis === 'vertical' ? !vertical : vertical
  };

  if (!nextFlip.horizontal && !nextFlip.vertical) {
    return {
      ...pipeline,
      operations: pipeline.operations.filter((operation) => operation.type !== 'flip')
    };
  }

  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'flip',
    payload: nextFlip
  });
}

export function setLut(
  pipeline: PipelineState,
  lutId: string,
  intensity = 1
): PipelineState {
  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'lut',
    payload: {
      lutId,
      intensity
    }
  });
}

export function clearLut(pipeline: PipelineState): PipelineState {
  return {
    ...pipeline,
    operations: pipeline.operations.filter((operation) => operation.type !== 'lut')
  };
}

export function setOverlay(
  pipeline: PipelineState,
  payload: {
    overlayId: string;
    opacity: number;
    blendMode:
      | 'normal'
      | 'multiply'
      | 'screen'
      | 'overlay'
      | 'darken'
      | 'lighten'
      | 'color-dodge'
      | 'color-burn'
      | 'hard-light'
      | 'soft-light';
  }
): PipelineState {
  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'overlay',
    payload
  });
}

export function clearOverlay(pipeline: PipelineState): PipelineState {
  return {
    ...pipeline,
    operations: pipeline.operations.filter((operation) => operation.type !== 'overlay')
  };
}

export function setTextOverlay(
  pipeline: PipelineState,
  payload: {
    text: string;
    x: number;
    y: number;
    color: string;
    fontFamily: string;
    fontSize: number;
    align: CanvasTextAlign;
  }
): PipelineState {
  return upsertOperation(pipeline, {
    id: crypto.randomUUID(),
    type: 'text',
    payload
  });
}

export function clearTextOverlay(pipeline: PipelineState): PipelineState {
  return {
    ...pipeline,
    operations: pipeline.operations.filter((operation) => operation.type !== 'text')
  };
}
