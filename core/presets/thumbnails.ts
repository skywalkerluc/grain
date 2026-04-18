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
  presets: PresetDefinition[] = PRESETS,
  onProgress?: (id: string, dataUrl: string) => void
): Promise<PresetThumbnail[]> {
  const results: PresetThumbnail[] = [];

  const ordered = [null, ...presets];
  for (const preset of ordered) {
    const result = await renderPresetThumbnail(image, imageSize, preset, size);
    results.push(result);
    onProgress?.(result.id, result.dataUrl);
  }

  return results;
}
