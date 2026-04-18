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

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 520;
const MIN_CROP_SIZE = 40;

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

export function EditorCanvasClient({ imageUrl }: EditorCanvasProps) {
  const mode = useEditorStore((state) => state.mode);
  const cropAspectRatio = useEditorStore((state) => state.cropAspectRatio);
  const pipeline = useEditorStore((state) => state.pipeline);
  const setPipeline = useEditorStore((state) => state.setPipeline);
  const showOriginalPreview = useEditorStore((state) => state.showOriginalPreview);

  const [image] = useImage(imageUrl, 'anonymous');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewImage] = useImage(previewUrl ?? imageUrl, 'anonymous');
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const textNodeRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!image) {
      return;
    }

    if (pipeline.operations.length === 0) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void applyPipelineToCanvas(
        image,
        { width: image.width, height: image.height },
        pipeline,
        undefined,
        undefined,
        { skipText: mode === 'text' }
      ).then((canvas) => {
        if (!cancelled) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      });
    }, 16);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [image, pipeline, mode]);

  const activeImage = showOriginalPreview ? image : previewImage;
  const textOperation = useMemo(() => getLatestOperation(pipeline, 'text')?.payload, [pipeline]);

  const fit = useMemo(() => {
    if (!activeImage) {
      return { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };
    }

    const scale = Math.min(VIEWPORT_WIDTH / activeImage.width, VIEWPORT_HEIGHT / activeImage.height);
    const width = activeImage.width * scale;
    const height = activeImage.height * scale;

    return {
      x: (VIEWPORT_WIDTH - width) / 2,
      y: (VIEWPORT_HEIGHT - height) / 2,
      width,
      height
    };
  }, [activeImage]);

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
    if (!image || !cropRect) {
      return;
    }

    const scaleX = image.width / fit.width;
    const scaleY = image.height / fit.height;

    const crop = {
      x: Math.round((cropRect.x - fit.x) * scaleX),
      y: Math.round((cropRect.y - fit.y) * scaleY),
      width: Math.round(cropRect.width * scaleX),
      height: Math.round(cropRect.height * scaleY)
    };

    setPipeline(setCrop(pipeline, crop));
  };

  const handleSize = 9;
  const scaleX = activeImage ? fit.width / activeImage.width : 1;
  const scaleY = activeImage ? fit.height / activeImage.height : 1;

  const textX = textOperation && activeImage ? fit.x + textOperation.x * scaleX : 0;
  const textY = textOperation && activeImage ? fit.y + textOperation.y * scaleY : 0;
  const textFontSize = textOperation ? Math.max(12, textOperation.fontSize * scaleY) : 12;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/70">
      <Stage width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="w-full touch-pan-y">
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
                draggable
                shadowColor="rgba(0,0,0,0.35)"
                shadowBlur={8}
                onDragEnd={(event) => {
                  const nextX = Math.round((event.target.x() - fit.x) / scaleX);
                  const nextY = Math.round((event.target.y() - fit.y) / scaleY);
                  setPipeline(
                    setTextOverlay(pipeline, {
                      ...textOperation,
                      x: clamp(nextX, 0, activeImage.width),
                      y: clamp(nextY, 0, activeImage.height)
                    })
                  );
                }}
                onTransformEnd={() => {
                  const node = textNodeRef.current;
                  if (!node) {
                    return;
                  }

                  const scale = Math.max(node.scaleX(), node.scaleY());
                  const resizedFont = Math.round((node.fontSize() * scale) / scaleY);
                  node.scaleX(1);
                  node.scaleY(1);

                  const nextX = Math.round((node.x() - fit.x) / scaleX);
                  const nextY = Math.round((node.y() - fit.y) / scaleY);

                  setPipeline(
                    setTextOverlay(pipeline, {
                      ...textOperation,
                      x: clamp(nextX, 0, activeImage.width),
                      y: clamp(nextY, 0, activeImage.height),
                      fontSize: clamp(resizedFont, 12, 180)
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

      {mode === 'crop' ? (
        <button
          type="button"
          onClick={applyCrop}
          className="absolute bottom-3 right-3 min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
        >
          Aplicar crop
        </button>
      ) : null}
    </div>
  );
}
