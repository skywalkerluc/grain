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

export function deserializePipeline(serialized: string): PipelineState {
  const parsed = JSON.parse(serialized) as PipelineState;

  if (parsed.version !== 1 || !Array.isArray(parsed.operations)) {
    throw new Error('Invalid pipeline format');
  }

  return parsed;
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
  payload: { overlayId: string; opacity: number; blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' }
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
