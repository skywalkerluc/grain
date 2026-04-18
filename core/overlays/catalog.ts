import type { PipelineOperation } from '@/core/pipeline';

export type OverlayBlendMode = Extract<PipelineOperation, { type: 'overlay' }>['payload']['blendMode'];

export type OverlayDefinition = {
  id: string;
  name: string;
  src: string;
  defaultBlendMode: OverlayBlendMode;
  defaultOpacity: number;
};

export const OVERLAYS: OverlayDefinition[] = [
  { id: 'film-grain', name: 'Film Grain', src: '/overlays/film-grain.svg', defaultBlendMode: 'overlay', defaultOpacity: 0.45 },
  { id: 'light-leak-red', name: 'Light Leak Red', src: '/overlays/light-leak-red.svg', defaultBlendMode: 'screen', defaultOpacity: 0.6 },
  { id: 'light-leak-blue', name: 'Light Leak Blue', src: '/overlays/light-leak-blue.svg', defaultBlendMode: 'screen', defaultOpacity: 0.55 },
  { id: 'dust-specks', name: 'Dust Specks', src: '/overlays/dust-specks.svg', defaultBlendMode: 'screen', defaultOpacity: 0.38 },
  { id: 'scratch-lines', name: 'Scratch Lines', src: '/overlays/scratch-lines.svg', defaultBlendMode: 'overlay', defaultOpacity: 0.35 },
  { id: 'frosted-mist', name: 'Frosted Mist', src: '/overlays/frosted-mist.svg', defaultBlendMode: 'screen', defaultOpacity: 0.45 },
  { id: 'paper-texture', name: 'Paper Texture', src: '/overlays/paper-texture.svg', defaultBlendMode: 'multiply', defaultOpacity: 0.3 },
  { id: 'vignette-heavy', name: 'Vignette Heavy', src: '/overlays/vignette-heavy.svg', defaultBlendMode: 'multiply', defaultOpacity: 0.5 }
];

export function getOverlayById(id: string): OverlayDefinition | undefined {
  return OVERLAYS.find((item) => item.id === id);
}
