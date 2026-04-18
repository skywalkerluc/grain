import { DEFAULT_ADJUSTMENTS, getLatestAdjustments, getLatestOperation } from './pipeline';
import type { AdjustmentValues, ExportOptions, PipelineState } from './types';
import { applyLutToCanvas } from '@/core/luts';
import { loadOverlayImage } from '@/core/overlays';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function applyCropTransform(
  source: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState
): { source: CanvasImageSource; width: number; height: number } {
  const cropOperation = getLatestOperation(pipeline, 'crop');
  if (!cropOperation) {
    return { source, width: sourceSize.width, height: sourceSize.height };
  }

  const x = clamp(Math.round(cropOperation.payload.x), 0, sourceSize.width - 1);
  const y = clamp(Math.round(cropOperation.payload.y), 0, sourceSize.height - 1);
  const width = clamp(Math.round(cropOperation.payload.width), 1, sourceSize.width - x);
  const height = clamp(Math.round(cropOperation.payload.height), 1, sourceSize.height - y);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context not available');
  }

  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return { source: canvas, width, height };
}

function applyFlipTransform(
  source: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState
): { source: CanvasImageSource; width: number; height: number } {
  const flipOperation = getLatestOperation(pipeline, 'flip');
  if (!flipOperation) {
    return { source, width: sourceSize.width, height: sourceSize.height };
  }

  const { horizontal, vertical } = flipOperation.payload;
  if (!horizontal && !vertical) {
    return { source, width: sourceSize.width, height: sourceSize.height };
  }

  const canvas = createCanvas(sourceSize.width, sourceSize.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context not available');
  }

  ctx.save();
  ctx.translate(horizontal ? sourceSize.width : 0, vertical ? sourceSize.height : 0);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(source, 0, 0, sourceSize.width, sourceSize.height);
  ctx.restore();

  return { source: canvas, width: sourceSize.width, height: sourceSize.height };
}

function applyRotateTransform(
  source: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState
): { source: CanvasImageSource; width: number; height: number } {
  const rotateOperation = getLatestOperation(pipeline, 'rotate');
  if (!rotateOperation) {
    return { source, width: sourceSize.width, height: sourceSize.height };
  }

  const angle = rotateOperation.payload.angle;
  if (![90, 180, 270].includes(angle)) {
    return { source, width: sourceSize.width, height: sourceSize.height };
  }

  const isQuarterTurn = angle === 90 || angle === 270;
  const outputWidth = isQuarterTurn ? sourceSize.height : sourceSize.width;
  const outputHeight = isQuarterTurn ? sourceSize.width : sourceSize.height;

  const canvas = createCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context not available');
  }

  ctx.save();
  ctx.translate(outputWidth / 2, outputHeight / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(source, -sourceSize.width / 2, -sourceSize.height / 2, sourceSize.width, sourceSize.height);
  ctx.restore();

  return { source: canvas, width: outputWidth, height: outputHeight };
}

function toCssFilter(adjustments: AdjustmentValues): string {
  const brightness = 100 + adjustments.brightness;
  const contrast = 100 + adjustments.contrast;
  const saturate = 100 + adjustments.saturation;

  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
}

function applyTemperatureAndFade(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: AdjustmentValues
): void {
  const temperature = clamp(adjustments.temperature, -100, 100);
  const fade = clamp(adjustments.fade, 0, 100);

  if (temperature !== 0) {
    const warmAlpha = Math.abs(temperature) / 300;
    ctx.save();
    ctx.globalCompositeOperation = temperature > 0 ? 'screen' : 'multiply';
    ctx.fillStyle = temperature > 0 ? `rgba(255,160,80,${warmAlpha})` : `rgba(80,120,255,${warmAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (fade > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(240,240,240,${fade / 250})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: AdjustmentValues
): void {
  const vignette = clamp(adjustments.vignette, 0, 100);
  if (vignette === 0) {
    return;
  }

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${vignette / 160})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: AdjustmentValues
): void {
  const grain = clamp(adjustments.grain, 0, 100);
  if (grain === 0) {
    return;
  }

  const amount = grain / 100;
  const profile = getGrainProfile(amount);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const speckCount = Math.floor((width * height * profile.densityFactor) / profile.speckDivisor);

  ctx.save();
  for (let i = 0; i < speckCount; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
    const r = data[pixelIndex] / 255;
    const g = data[pixelIndex + 1] / 255;
    const b = data[pixelIndex + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const shadowBoost = profile.shadowBase + (1 - luma) * profile.shadowLift;
    const strength = amount * shadowBoost;
    const alpha = clamp(
      strength * (profile.alphaMin + Math.random() * profile.alphaRange),
      profile.alphaClampMin,
      profile.alphaClampMax
    );
    const radius = profile.radiusBase + Math.random() * (profile.radiusJitter + amount * profile.radiusScale);

    if (Math.random() > 0.58) {
      const warm = Math.random() * 12;
      ctx.fillStyle = `rgba(${242 + warm},${236 + warm * 0.5},${228 + warm * 0.35},${alpha * 0.85})`;
    } else {
      const cool = Math.random() * 18;
      ctx.fillStyle = `rgba(${20 + cool * 0.55},${18 + cool * 0.45},${24 + cool},${alpha})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const clumpCount = Math.max(1, Math.floor(profile.clumpFactor * (0.8 + amount * 1.4)));
  for (let i = 0; i < clumpCount; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.max(
      profile.clumpRadiusMin,
      Math.min(width, height) * (profile.clumpRadiusBase + Math.random() * profile.clumpRadiusJitter)
    );
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = amount * (profile.clumpAlphaMin + Math.random() * profile.clumpAlphaRange);

    if (Math.random() > 0.5) {
      gradient.addColorStop(0, `rgba(255,248,236,${alpha})`);
    } else {
      gradient.addColorStop(0, `rgba(22,20,26,${alpha})`);
    }
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.restore();
}

type GrainProfile = {
  speckDivisor: number;
  densityFactor: number;
  shadowBase: number;
  shadowLift: number;
  alphaMin: number;
  alphaRange: number;
  alphaClampMin: number;
  alphaClampMax: number;
  radiusBase: number;
  radiusJitter: number;
  radiusScale: number;
  clumpFactor: number;
  clumpRadiusMin: number;
  clumpRadiusBase: number;
  clumpRadiusJitter: number;
  clumpAlphaMin: number;
  clumpAlphaRange: number;
};

function getGrainProfile(amount: number): GrainProfile {
  // Profiles emulate film stock behavior: low ISO is cleaner/finer, high ISO is denser/coarser.
  if (amount < 0.18) {
    return {
      speckDivisor: 11000,
      densityFactor: 0.48,
      shadowBase: 0.38,
      shadowLift: 0.72,
      alphaMin: 0.06,
      alphaRange: 0.1,
      alphaClampMin: 0.01,
      alphaClampMax: 0.16,
      radiusBase: 0.32,
      radiusJitter: 0.58,
      radiusScale: 0.28,
      clumpFactor: 1.4,
      clumpRadiusMin: 8,
      clumpRadiusBase: 0.015,
      clumpRadiusJitter: 0.018,
      clumpAlphaMin: 0.014,
      clumpAlphaRange: 0.018
    };
  }

  if (amount < 0.36) {
    return {
      speckDivisor: 8200,
      densityFactor: 0.66,
      shadowBase: 0.44,
      shadowLift: 0.8,
      alphaMin: 0.07,
      alphaRange: 0.12,
      alphaClampMin: 0.012,
      alphaClampMax: 0.2,
      radiusBase: 0.4,
      radiusJitter: 0.78,
      radiusScale: 0.4,
      clumpFactor: 2.4,
      clumpRadiusMin: 9,
      clumpRadiusBase: 0.018,
      clumpRadiusJitter: 0.022,
      clumpAlphaMin: 0.016,
      clumpAlphaRange: 0.022
    };
  }

  if (amount < 0.56) {
    return {
      speckDivisor: 6400,
      densityFactor: 0.86,
      shadowBase: 0.52,
      shadowLift: 0.88,
      alphaMin: 0.08,
      alphaRange: 0.14,
      alphaClampMin: 0.015,
      alphaClampMax: 0.24,
      radiusBase: 0.5,
      radiusJitter: 1.0,
      radiusScale: 0.55,
      clumpFactor: 3.4,
      clumpRadiusMin: 10,
      clumpRadiusBase: 0.022,
      clumpRadiusJitter: 0.028,
      clumpAlphaMin: 0.02,
      clumpAlphaRange: 0.028
    };
  }

  return {
    speckDivisor: 5400,
    densityFactor: 1.04,
    shadowBase: 0.6,
    shadowLift: 0.98,
    alphaMin: 0.09,
    alphaRange: 0.16,
    alphaClampMin: 0.02,
    alphaClampMax: 0.28,
    radiusBase: 0.58,
    radiusJitter: 1.15,
    radiusScale: 0.68,
    clumpFactor: 4.6,
    clumpRadiusMin: 12,
    clumpRadiusBase: 0.028,
    clumpRadiusJitter: 0.034,
    clumpAlphaMin: 0.024,
    clumpAlphaRange: 0.03
  };
}

async function applyOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pipeline: PipelineState
): Promise<void> {
  const overlayOperation = getLatestOperation(pipeline, 'overlay');
  if (!overlayOperation) {
    return;
  }

  const overlayImage = await loadOverlayImage(overlayOperation.payload.overlayId);
  if (!overlayImage) {
    return;
  }

  const compositeMode: GlobalCompositeOperation =
    overlayOperation.payload.blendMode === 'normal' ? 'source-over' : overlayOperation.payload.blendMode;

  ctx.save();
  ctx.globalAlpha = clamp(overlayOperation.payload.opacity, 0, 1);
  ctx.globalCompositeOperation = compositeMode;
  ctx.drawImage(overlayImage, 0, 0, width, height);
  ctx.restore();
}

function applyTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pipeline: PipelineState
): void {
  const textOperation = getLatestOperation(pipeline, 'text');
  if (!textOperation || !textOperation.payload.text.trim()) {
    return;
  }

  const { text, x, y, color, fontFamily, fontSize, align } = textOperation.payload;

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(12, fontSize)}px ${fontFamily}`;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, clamp(x, 0, width), clamp(y, 0, height));
  ctx.restore();
}

function getPipelineGeometry(
  sourceImage: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState
): { source: CanvasImageSource; width: number; height: number } {
  const cropped = applyCropTransform(sourceImage, sourceSize, pipeline);
  const flipped = applyFlipTransform(cropped.source, { width: cropped.width, height: cropped.height }, pipeline);
  return applyRotateTransform(flipped.source, { width: flipped.width, height: flipped.height }, pipeline);
}

export async function applyPipelineToCanvas(
  sourceImage: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState,
  target?: HTMLCanvasElement,
  renderSize?: { width: number; height: number },
  options?: { skipText?: boolean }
): Promise<HTMLCanvasElement> {
  const transformed = getPipelineGeometry(sourceImage, sourceSize, pipeline);
  const lutOperation = getLatestOperation(pipeline, 'lut');
  const sourceWithLut = lutOperation
    ? await applyLutToCanvas(
        transformed.source,
        { width: transformed.width, height: transformed.height },
        lutOperation.payload.lutId,
        lutOperation.payload.intensity
      )
    : transformed.source;

  const width = renderSize?.width ?? transformed.width;
  const height = renderSize?.height ?? transformed.height;

  const canvas = target ?? createCanvas(width, height);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2D context not available');
  }

  const adjustments = getLatestAdjustments(pipeline) ?? DEFAULT_ADJUSTMENTS;

  ctx.clearRect(0, 0, width, height);
  ctx.filter = toCssFilter(adjustments);
  ctx.drawImage(sourceWithLut, 0, 0, transformed.width, transformed.height, 0, 0, width, height);
  ctx.filter = 'none';

  applyTemperatureAndFade(ctx, width, height, adjustments);
  applyVignette(ctx, width, height, adjustments);
  applyGrain(ctx, width, height, adjustments);
  await applyOverlay(ctx, width, height, pipeline);
  if (!options?.skipText) {
    applyTextOverlay(ctx, width, height, pipeline);
  }

  return canvas;
}

function normalizeDimensions(
  width: number,
  height: number,
  maxSide?: number
): { width: number; height: number } {
  if (!maxSide || Math.max(width, height) <= maxSide) {
    return { width, height };
  }

  const scale = maxSide / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

export async function exportPipelineBlob(
  sourceImage: CanvasImageSource,
  sourceSize: { width: number; height: number },
  pipeline: PipelineState,
  options: ExportOptions
): Promise<Blob> {
  const transformed = getPipelineGeometry(sourceImage, sourceSize, pipeline);
  const dimensions = normalizeDimensions(transformed.width, transformed.height, options.maxSide);

  const canvas = await applyPipelineToCanvas(
    transformed.source,
    { width: transformed.width, height: transformed.height },
    {
      ...pipeline,
      operations: pipeline.operations.filter((operation) => !['crop', 'flip', 'rotate'].includes(operation.type))
    },
    createCanvas(dimensions.width, dimensions.height),
    dimensions
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export image blob'));
          return;
        }
        resolve(blob);
      },
      options.format,
      options.quality
    );
  });
}
