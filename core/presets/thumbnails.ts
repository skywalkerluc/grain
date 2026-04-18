import { applyPipelineToCanvas, createPipeline } from '@/core/pipeline';
import { applyPresetToPipeline, PRESETS, type PresetDefinition } from './presets';

export type PresetThumbnail = {
  id: string;
  dataUrl: string;
};

async function renderPresetThumbnail(
  image: CanvasImageSource,
  imageSize: { width: number; height: number },
  preset: PresetDefinition | null,
  size = 96
): Promise<PresetThumbnail> {
  const pipeline = applyPresetToPipeline(createPipeline(), preset);
  const canvas = await applyPipelineToCanvas(image, imageSize, pipeline, document.createElement('canvas'), {
    width: size,
    height: size
  });

  return {
    id: preset?.id ?? 'none',
    dataUrl: canvas.toDataURL('image/jpeg', 0.82)
  };
}

export async function renderAllPresetThumbnails(
  image: CanvasImageSource,
  imageSize: { width: number; height: number },
  size = 96,
  presets: PresetDefinition[] = PRESETS
): Promise<PresetThumbnail[]> {
  const tasks: Promise<PresetThumbnail>[] = [
    renderPresetThumbnail(image, imageSize, null, size),
    ...presets.map((preset) => renderPresetThumbnail(image, imageSize, preset, size))
  ];

  return Promise.all(tasks);
}
