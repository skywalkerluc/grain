'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { Circle, Layer, Rect, Stage, Text as KonvaText, Transformer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { applyPipelineToCanvas, getLatestOperation, setCrop, setTextOverlay } from '@/core/pipeline';
import { useEditorStore, type CropAspectRatio } from '@/store/editor/editorStore';

type EditorCanvasProps = {
  imageUrl: string;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Handle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
type Point = { x: number; y: number };

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 520;
const MIN_CROP_SIZE = 40;
const MIN_STAGE_SCALE = 1;
const MAX_STAGE_SCALE = 4;
const TEXT_MIN_FONT_SIZE = 12;
const TEXT_MAX_FONT_SIZE = 180;

let textMeasureCanvas: HTMLCanvasElement | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ratioToNumber(ratio: CropAspectRatio): number | null {
  switch (ratio) {
    case '1:1':
      return 1;
    case '4:5':
      return 4 / 5;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case '3:4':
      return 3 / 4;
    default:
      return null;
  }
}

function createCropRectForRatio(fit: CropRect, ratio: CropAspectRatio): CropRect {
  const numericRatio = ratioToNumber(ratio);
  if (!numericRatio) {
    const width = fit.width * 0.84;
    const height = fit.height * 0.84;
    return {
      x: fit.x + (fit.width - width) / 2,
      y: fit.y + (fit.height - height) / 2,
      width,
      height
    };
  }

  let width = fit.width * 0.9;
  let height = width / numericRatio;

  if (height > fit.height * 0.9) {
    height = fit.height * 0.9;
    width = height * numericRatio;
  }

  return {
    x: fit.x + (fit.width - width) / 2,
    y: fit.y + (fit.height - height) / 2,
    width,
    height
  };
}

function inverseRotatePoint(
  point: { x: number; y: number },
  angle: 0 | 90 | 180 | 270,
  size: { width: number; height: number }
): { x: number; y: number } {
  if (angle === 90) {
    return {
      x: point.y,
      y: size.height - point.x
    };
  }

  if (angle === 180) {
    return {
      x: size.width - point.x,
      y: size.height - point.y
    };
  }

  if (angle === 270) {
    return {
      x: size.width - point.y,
      y: point.x
    };
  }

  return point;
}

function inverseFlipPoint(
  point: { x: number; y: number },
  flip: { horizontal: boolean; vertical: boolean },
  size: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: flip.horizontal ? size.width - point.x : point.x,
    y: flip.vertical ? size.height - point.y : point.y
  };
}

function clampStagePosition(position: Point, scale: number, size: { width: number; height: number }): Point {
  const minX = size.width - size.width * scale;
  const minY = size.height - size.height * scale;
  return {
    x: clamp(position.x, minX, 0),
    y: clamp(position.y, minY, 0)
  };
}

function getTextMetrics(text: string, fontSize: number, fontFamily: string): { width: number; height: number } {
  if (typeof document === 'undefined') {
    return {
      width: Math.max(1, text.length * fontSize * 0.56),
      height: Math.max(1, fontSize * 1.2)
    };
  }

  if (!textMeasureCanvas) {
    textMeasureCanvas = document.createElement('canvas');
  }

  const ctx = textMeasureCanvas.getContext('2d');
  if (!ctx) {
    return {
      width: Math.max(1, text.length * fontSize * 0.56),
      height: Math.max(1, fontSize * 1.2)
    };
  }

  ctx.font = `${Math.max(TEXT_MIN_FONT_SIZE, fontSize)}px ${fontFamily}`;
  const metrics = ctx.measureText(text || ' ');
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;

  return {
    width: Math.max(1, metrics.width),
    height: Math.max(1, ascent + descent)
  };
}

function getAnchorXBounds(
  align: CanvasTextAlign,
  textWidth: number,
  imageWidth: number
): { min: number; max: number } {
  if (align === 'center') {
    return { min: textWidth / 2, max: imageWidth - textWidth / 2 };
  }
  if (align === 'right') {
    return { min: textWidth, max: imageWidth };
  }
  return { min: 0, max: imageWidth - textWidth };
}

function getTextOffsetX(align: CanvasTextAlign, width: number): number {
  if (align === 'center') {
    return width / 2;
  }
  if (align === 'right') {
    return width;
  }
  return 0;
}

export function EditorCanvasClient({ imageUrl }: EditorCanvasProps) {
  const mode = useEditorStore((state) => state.mode);
  const cropAspectRatio = useEditorStore((state) => state.cropAspectRatio);
  const pipeline = useEditorStore((state) => state.pipeline);
  const setPipeline = useEditorStore((state) => state.setPipeline);
  const showOriginalPreview = useEditorStore((state) => state.showOriginalPreview);

  const [image] = useImage(imageUrl, 'anonymous');
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [stageSize, setStageSize] = useState({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState<Point>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const previewTargetRef = useRef<HTMLCanvasElement | null>(null);
  const textNodeRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const panLastPointRef = useRef<Point | null>(null);
  const pinchingRef = useRef(false);
  const stageScaleRef = useRef(1);
  const stagePositionRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const recompute = () => {
      const width = Math.max(260, Math.floor(element.clientWidth));
      const isDesktop = window.innerWidth >= 1024;
      const maxHeight = Math.max(320, Math.floor(window.innerHeight * (isDesktop ? 0.72 : 0.56)));
      const idealHeight = Math.round(width * (VIEWPORT_HEIGHT / VIEWPORT_WIDTH));
      const height = Math.max(300, Math.min(maxHeight, idealHeight));
      setStageSize({ width, height });
    };

    recompute();
    const observer = new ResizeObserver(() => recompute());
    observer.observe(element);
    window.addEventListener('resize', recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, []);

  useEffect(() => {
    stageScaleRef.current = 1;
    stagePositionRef.current = { x: 0, y: 0 };
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
    pinchDistanceRef.current = null;
    panLastPointRef.current = null;
    pinchingRef.current = false;
  }, [imageUrl]);

  useEffect(() => {
    setStagePosition((current) => clampStagePosition(current, stageScale, stageSize));
  }, [stageScale, stageSize]);

  useEffect(() => {
    stageScaleRef.current = stageScale;
    stagePositionRef.current = stagePosition;
  }, [stageScale, stagePosition]);

  useEffect(() => {
    if (!image) {
      return;
    }

    if (pipeline.operations.length === 0) {
      previewTargetRef.current = null;
      setPreviewCanvas(null);
      setRenderError(null);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    const timeout = window.setTimeout(() => {
      void applyPipelineToCanvas(
        image,
        { width: image.width, height: image.height },
        pipeline,
        previewTargetRef.current ?? undefined,
        undefined,
        { skipText: mode === 'text' }
      )
        .then((canvas) => {
          if (!cancelled) {
            previewTargetRef.current = canvas;
            setPreviewCanvas(canvas);
            setRenderError(null);
            setIsRendering(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            previewTargetRef.current = null;
            setPreviewCanvas(null);
            setRenderError('Falha ao renderizar a prévia');
            setIsRendering(false);
          }
        });
    }, 16);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      setIsRendering(false);
    };
  }, [image, pipeline, mode]);

  const activeImage = showOriginalPreview ? image : (previewCanvas ?? image);
  const textOperation = useMemo(() => getLatestOperation(pipeline, 'text')?.payload, [pipeline]);
  const hasActivePreset = useMemo(() => Boolean(getLatestOperation(pipeline, 'preset')), [pipeline]);
  const rotateOperation = useMemo(() => getLatestOperation(pipeline, 'rotate')?.payload, [pipeline]);
  const flipOperation = useMemo(() => getLatestOperation(pipeline, 'flip')?.payload, [pipeline]);
  const existingCropOperation = useMemo(() => getLatestOperation(pipeline, 'crop')?.payload, [pipeline]);

  const fit = useMemo(() => {
    if (!activeImage) {
      return { x: 0, y: 0, width: stageSize.width, height: stageSize.height };
    }

    const scale = Math.min(stageSize.width / activeImage.width, stageSize.height / activeImage.height);
    const width = activeImage.width * scale;
    const height = activeImage.height * scale;

    return {
      x: (stageSize.width - width) / 2,
      y: (stageSize.height - height) / 2,
      width,
      height
    };
  }, [activeImage, stageSize.height, stageSize.width]);

  useEffect(() => {
    if (mode !== 'crop') {
      return;
    }

    setCropRect(createCropRectForRatio(fit, cropAspectRatio));
  }, [mode, cropAspectRatio, fit]);

  useEffect(() => {
    if (
      mode !== 'text' ||
      showOriginalPreview ||
      !textOperation?.text ||
      !textNodeRef.current ||
      !transformerRef.current
    ) {
      return;
    }

    transformerRef.current.nodes([textNodeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [mode, showOriginalPreview, textOperation]);

  const moveCropRect = (nextX: number, nextY: number) => {
    setCropRect((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        x: clamp(nextX, fit.x, fit.x + fit.width - current.width),
        y: clamp(nextY, fit.y, fit.y + fit.height - current.height)
      };
    });
  };

  const resizeFromHandle = (handle: Handle, position: { x: number; y: number }) => {
    setCropRect((current) => {
      if (!current) {
        return current;
      }

      const right = current.x + current.width;
      const bottom = current.y + current.height;

      let x = current.x;
      let y = current.y;
      let width = current.width;
      let height = current.height;
      const ratio = ratioToNumber(cropAspectRatio);

      if (ratio) {
        const left = current.x;
        const top = current.y;

        if (handle === 'topLeft') {
          const maxWidth = right - fit.x;
          const maxHeight = bottom - fit.y;
          const rawWidth = right - position.x;
          const rawHeight = bottom - position.y;
          const limitedWidth = clamp(rawWidth, MIN_CROP_SIZE, maxWidth);
          const limitedHeight = clamp(rawHeight, MIN_CROP_SIZE, maxHeight);
          width = Math.min(limitedWidth, limitedHeight * ratio);
          height = width / ratio;
          x = right - width;
          y = bottom - height;
        }

        if (handle === 'topRight') {
          const maxWidth = fit.x + fit.width - left;
          const maxHeight = bottom - fit.y;
          const rawWidth = position.x - left;
          const rawHeight = bottom - position.y;
          const limitedWidth = clamp(rawWidth, MIN_CROP_SIZE, maxWidth);
          const limitedHeight = clamp(rawHeight, MIN_CROP_SIZE, maxHeight);
          width = Math.min(limitedWidth, limitedHeight * ratio);
          height = width / ratio;
          x = left;
          y = bottom - height;
        }

        if (handle === 'bottomLeft') {
          const maxWidth = right - fit.x;
          const maxHeight = fit.y + fit.height - top;
          const rawWidth = right - position.x;
          const rawHeight = position.y - top;
          const limitedWidth = clamp(rawWidth, MIN_CROP_SIZE, maxWidth);
          const limitedHeight = clamp(rawHeight, MIN_CROP_SIZE, maxHeight);
          width = Math.min(limitedWidth, limitedHeight * ratio);
          height = width / ratio;
          x = right - width;
          y = top;
        }

        if (handle === 'bottomRight') {
          const maxWidth = fit.x + fit.width - left;
          const maxHeight = fit.y + fit.height - top;
          const rawWidth = position.x - left;
          const rawHeight = position.y - top;
          const limitedWidth = clamp(rawWidth, MIN_CROP_SIZE, maxWidth);
          const limitedHeight = clamp(rawHeight, MIN_CROP_SIZE, maxHeight);
          width = Math.min(limitedWidth, limitedHeight * ratio);
          height = width / ratio;
          x = left;
          y = top;
        }

        width = clamp(width, MIN_CROP_SIZE, fit.width);
        height = clamp(height, MIN_CROP_SIZE, fit.height);
        x = clamp(x, fit.x, fit.x + fit.width - width);
        y = clamp(y, fit.y, fit.y + fit.height - height);

        return { x, y, width, height };
      }

      if (handle === 'topLeft') {
        x = clamp(position.x, fit.x, right - MIN_CROP_SIZE);
        y = clamp(position.y, fit.y, bottom - MIN_CROP_SIZE);
        width = right - x;
        height = bottom - y;
      }

      if (handle === 'topRight') {
        y = clamp(position.y, fit.y, bottom - MIN_CROP_SIZE);
        width = clamp(position.x, current.x + MIN_CROP_SIZE, fit.x + fit.width) - current.x;
        height = bottom - y;
      }

      if (handle === 'bottomLeft') {
        x = clamp(position.x, fit.x, right - MIN_CROP_SIZE);
        width = right - x;
        height = clamp(position.y, current.y + MIN_CROP_SIZE, fit.y + fit.height) - current.y;
      }

      if (handle === 'bottomRight') {
        width = clamp(position.x, current.x + MIN_CROP_SIZE, fit.x + fit.width) - current.x;
        height = clamp(position.y, current.y + MIN_CROP_SIZE, fit.y + fit.height) - current.y;
      }

      return { x, y, width, height };
    });
  };

  const applyCrop = () => {
    if (!image || !cropRect || !activeImage) {
      return;
    }
    if (renderError) {
      return;
    }

    const scaleX = activeImage.width / fit.width;
    const scaleY = activeImage.height / fit.height;
    const transformedRect = {
      x: (cropRect.x - fit.x) * scaleX,
      y: (cropRect.y - fit.y) * scaleY,
      width: cropRect.width * scaleX,
      height: cropRect.height * scaleY
    };

    const baseCrop = existingCropOperation ?? {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    };

    const rotation = (rotateOperation?.angle ?? 0) as 0 | 90 | 180 | 270;
    const flip = {
      horizontal: flipOperation?.horizontal ?? false,
      vertical: flipOperation?.vertical ?? false
    };

    const transformedCorners = [
      { x: transformedRect.x, y: transformedRect.y },
      { x: transformedRect.x + transformedRect.width, y: transformedRect.y },
      { x: transformedRect.x, y: transformedRect.y + transformedRect.height },
      {
        x: transformedRect.x + transformedRect.width,
        y: transformedRect.y + transformedRect.height
      }
    ];

    const mapped = transformedCorners.map((corner) =>
      inverseFlipPoint(
        inverseRotatePoint(corner, rotation, { width: baseCrop.width, height: baseCrop.height }),
        flip,
        { width: baseCrop.width, height: baseCrop.height }
      )
    );

    const minX = Math.min(...mapped.map((point) => point.x));
    const maxX = Math.max(...mapped.map((point) => point.x));
    const minY = Math.min(...mapped.map((point) => point.y));
    const maxY = Math.max(...mapped.map((point) => point.y));

    const crop = {
      x: clamp(Math.round(baseCrop.x + minX), 0, image.width - 1),
      y: clamp(Math.round(baseCrop.y + minY), 0, image.height - 1),
      width: clamp(Math.round(maxX - minX), 1, image.width),
      height: clamp(Math.round(maxY - minY), 1, image.height)
    };

    crop.width = clamp(crop.width, 1, image.width - crop.x);
    crop.height = clamp(crop.height, 1, image.height - crop.y);

    const state = useEditorStore.getState();
    state.setPipeline(setCrop(state.pipeline, crop));
  };

  const handleSize = 9;
  const scaleX = activeImage ? fit.width / activeImage.width : 1;
  const scaleY = activeImage ? fit.height / activeImage.height : 1;

  const textX = textOperation && activeImage ? fit.x + textOperation.x * scaleX : 0;
  const textY = textOperation && activeImage ? fit.y + textOperation.y * scaleY : 0;
  const textFontSize = textOperation ? Math.max(12, textOperation.fontSize * scaleY) : 12;
  const textMetricsImage = useMemo(() => {
    if (!textOperation?.text) {
      return null;
    }
    return getTextMetrics(textOperation.text, textOperation.fontSize, textOperation.fontFamily);
  }, [textOperation?.text, textOperation?.fontFamily, textOperation?.fontSize]);
  const textMetricsDisplay = useMemo(() => {
    if (!textOperation?.text) {
      return null;
    }
    return getTextMetrics(textOperation.text, textFontSize, textOperation.fontFamily);
  }, [textOperation?.text, textOperation?.fontFamily, textFontSize]);
  const allowPan = stageScale > 1 && mode !== 'crop' && mode !== 'text';

  const handleTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const touches = event.evt.touches;
    if (touches.length >= 2) {
      pinchingRef.current = true;
      panLastPointRef.current = null;
      const first = touches[0];
      const second = touches[1];
      pinchDistanceRef.current = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      return;
    }

    if (allowPan && touches.length === 1) {
      panLastPointRef.current = { x: touches[0].clientX, y: touches[0].clientY };
    }
  };

  const handleTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const touches = event.evt.touches;
    if (touches.length >= 2) {
      event.evt.preventDefault();
      const rect = stage.container().getBoundingClientRect();
      const first = touches[0];
      const second = touches[1];
      const center = {
        x: (first.clientX + second.clientX) / 2 - rect.left,
        y: (first.clientY + second.clientY) / 2 - rect.top
      };
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

      const previousDistance = pinchDistanceRef.current;
      if (!previousDistance) {
        pinchDistanceRef.current = distance;
        return;
      }

      const currentScale = stageScaleRef.current;
      const currentPosition = stagePositionRef.current;
      const scaleFactor = distance / previousDistance;
      const nextScale = clamp(currentScale * scaleFactor, MIN_STAGE_SCALE, MAX_STAGE_SCALE);
      const pointTo = {
        x: (center.x - currentPosition.x) / currentScale,
        y: (center.y - currentPosition.y) / currentScale
      };
      const nextPosition = clampStagePosition(
        {
          x: center.x - pointTo.x * nextScale,
          y: center.y - pointTo.y * nextScale
        },
        nextScale,
        stageSize
      );

      stageScaleRef.current = nextScale;
      stagePositionRef.current = nextPosition;
      setStageScale(nextScale);
      setStagePosition(nextPosition);
      pinchDistanceRef.current = distance;
      pinchingRef.current = true;
      return;
    }

    if (!allowPan || pinchingRef.current || touches.length !== 1) {
      return;
    }

    const currentPoint = { x: touches[0].clientX, y: touches[0].clientY };
    const lastPoint = panLastPointRef.current;
    if (!lastPoint) {
      panLastPointRef.current = currentPoint;
      return;
    }

    event.evt.preventDefault();
    const delta = {
      x: currentPoint.x - lastPoint.x,
      y: currentPoint.y - lastPoint.y
    };
    const nextPosition = clampStagePosition(
      {
        x: stagePositionRef.current.x + delta.x,
        y: stagePositionRef.current.y + delta.y
      },
      stageScaleRef.current,
      stageSize
    );
    stagePositionRef.current = nextPosition;
    setStagePosition(nextPosition);
    panLastPointRef.current = currentPoint;
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
    panLastPointRef.current = null;
    pinchingRef.current = false;
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl bg-black/70">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full touch-pan-y"
      >
        <Layer>
          {activeImage ? (
            <KonvaImage
              image={activeImage}
              x={fit.x}
              y={fit.y}
              width={fit.width}
              height={fit.height}
            />
          ) : null}

          {mode === 'text' && !showOriginalPreview && textOperation?.text && activeImage ? (
            <>
              <KonvaText
                ref={textNodeRef}
                text={textOperation.text}
                x={textX}
                y={textY}
                fontSize={textFontSize}
                fontFamily={textOperation.fontFamily}
                fill={textOperation.color}
                align={textOperation.align}
                offsetX={getTextOffsetX(textOperation.align, textMetricsDisplay?.width ?? 0)}
                offsetY={(textMetricsDisplay?.height ?? textFontSize) / 2}
                draggable
                shadowColor="rgba(0,0,0,0.35)"
                shadowBlur={8}
                onDragEnd={(event) => {
                  const nextX = Math.round((event.target.x() - fit.x) / scaleX);
                  const nextY = Math.round((event.target.y() - fit.y) / scaleY);
                  const textWidth = textMetricsImage?.width ?? event.target.width() / scaleX;
                  const textHeight = textMetricsImage?.height ?? event.target.height() / scaleY;
                  const xBounds = getAnchorXBounds(textOperation.align, textWidth, activeImage.width);
                  const minY = textHeight / 2;
                  const maxY = activeImage.height - textHeight / 2;

                  setPipeline(
                    setTextOverlay(pipeline, {
                      ...textOperation,
                      x: clamp(nextX, xBounds.min, xBounds.max),
                      y: clamp(nextY, minY, maxY)
                    })
                  );
                }}
                onTransformEnd={() => {
                  const node = textNodeRef.current;
                  if (!node) {
                    return;
                  }

                  const nodeScaleX = node.scaleX();
                  const nodeScaleY = node.scaleY();
                  const scale = Math.max(nodeScaleX, nodeScaleY);
                  const resizedFont = Math.round((node.fontSize() * scale) / scaleY);
                  node.scaleX(1);
                  node.scaleY(1);

                  const nextX = Math.round((node.x() - fit.x) / scaleX);
                  const nextY = Math.round((node.y() - fit.y) / scaleY);
                  const normalizedFont = clamp(resizedFont, TEXT_MIN_FONT_SIZE, TEXT_MAX_FONT_SIZE);
                  const nextMetrics = getTextMetrics(
                    textOperation.text,
                    normalizedFont,
                    textOperation.fontFamily
                  );
                  const xBounds = getAnchorXBounds(textOperation.align, nextMetrics.width, activeImage.width);
                  const minY = nextMetrics.height / 2;
                  const maxY = activeImage.height - nextMetrics.height / 2;

                  setPipeline(
                    setTextOverlay(pipeline, {
                      ...textOperation,
                      x: clamp(nextX, xBounds.min, xBounds.max),
                      y: clamp(nextY, minY, maxY),
                      fontSize: normalizedFont
                    })
                  );
                }}
              />
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 40 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </>
          ) : null}

          {mode === 'crop' && cropRect ? (
            <>
              <Rect
                x={fit.x}
                y={fit.y}
                width={fit.width}
                height={cropRect.y - fit.y}
                fill="rgba(0,0,0,0.45)"
              />
              <Rect
                x={fit.x}
                y={cropRect.y}
                width={cropRect.x - fit.x}
                height={cropRect.height}
                fill="rgba(0,0,0,0.45)"
              />
              <Rect
                x={cropRect.x + cropRect.width}
                y={cropRect.y}
                width={fit.x + fit.width - (cropRect.x + cropRect.width)}
                height={cropRect.height}
                fill="rgba(0,0,0,0.45)"
              />
              <Rect
                x={fit.x}
                y={cropRect.y + cropRect.height}
                width={fit.width}
                height={fit.y + fit.height - (cropRect.y + cropRect.height)}
                fill="rgba(0,0,0,0.45)"
              />
              <Rect
                x={cropRect.x}
                y={cropRect.y}
                width={cropRect.width}
                height={cropRect.height}
                fill="rgba(0,0,0,0)"
                stroke="#f4b400"
                strokeWidth={2}
                draggable
                onDragMove={(event) => moveCropRect(event.target.x(), event.target.y())}
              />
              <Circle
                x={cropRect.x}
                y={cropRect.y}
                radius={handleSize}
                fill="#f4b400"
                draggable
                onDragMove={(event) =>
                  resizeFromHandle('topLeft', { x: event.target.x(), y: event.target.y() })
                }
              />
              <Circle
                x={cropRect.x + cropRect.width}
                y={cropRect.y}
                radius={handleSize}
                fill="#f4b400"
                draggable
                onDragMove={(event) =>
                  resizeFromHandle('topRight', { x: event.target.x(), y: event.target.y() })
                }
              />
              <Circle
                x={cropRect.x}
                y={cropRect.y + cropRect.height}
                radius={handleSize}
                fill="#f4b400"
                draggable
                onDragMove={(event) =>
                  resizeFromHandle('bottomLeft', { x: event.target.x(), y: event.target.y() })
                }
              />
              <Circle
                x={cropRect.x + cropRect.width}
                y={cropRect.y + cropRect.height}
                radius={handleSize}
                fill="#f4b400"
                draggable
                onDragMove={(event) =>
                  resizeFromHandle('bottomRight', { x: event.target.x(), y: event.target.y() })
                }
              />
            </>
          ) : null}
        </Layer>
      </Stage>

      {isRendering ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-black/40 px-3 py-2 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            {mode === 'presets' && hasActivePreset ? (
              <p className="mt-2 text-xs text-white/85">Aplicando preset...</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {renderError ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <p className="rounded-lg bg-black/60 px-3 py-2 text-center text-xs text-red-200">
            Não foi possível atualizar a prévia. Ajuste novamente para tentar renderizar.
          </p>
        </div>
      ) : null}

      {mode === 'crop' ? (
        <button
          type="button"
          onClick={applyCrop}
          className="absolute bottom-3 right-3 min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
        >
          Aplicar crop
        </button>
      ) : null}

      {stageScale > 1 ? (
        <button
          type="button"
          onClick={() => {
            stageScaleRef.current = 1;
            stagePositionRef.current = { x: 0, y: 0 };
            setStageScale(1);
            setStagePosition({ x: 0, y: 0 });
          }}
          className="absolute left-3 top-3 min-h-11 rounded-lg bg-black/50 px-3 text-xs"
        >
          Resetar Zoom
        </button>
      ) : null}
    </div>
  );
}
