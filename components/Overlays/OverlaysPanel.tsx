'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { OVERLAYS, getOverlayById, type OverlayBlendMode } from '@/core/overlays';
import { clearOverlay, getLatestOperation, setOverlay } from '@/core/pipeline';
import { useEditorStore } from '@/store/editor/editorStore';

const BLEND_MODES: OverlayBlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light'
];

export function OverlaysPanel() {
  const pipeline = useEditorStore((state) => state.pipeline);
  const setPipeline = useEditorStore((state) => state.setPipeline);

  const overlay = getLatestOperation(pipeline, 'overlay')?.payload;
  const selectedOverlay = useMemo(
    () => (overlay?.overlayId ? getOverlayById(overlay.overlayId) : undefined),
    [overlay?.overlayId]
  );

  const applyOverlayId = (overlayId: string) => {
    const selected = getOverlayById(overlayId);
    if (!selected) {
      return;
    }

    setPipeline(
      setOverlay(pipeline, {
        overlayId: selected.id,
        opacity: overlay?.opacity ?? selected.defaultOpacity,
        blendMode: overlay?.blendMode ?? selected.defaultBlendMode
      })
    );
  };

  const updateOpacity = (opacity: number) => {
    if (!selectedOverlay || !overlay) {
      return;
    }

    setPipeline(
      setOverlay(pipeline, {
        overlayId: selectedOverlay.id,
        opacity,
        blendMode: overlay.blendMode
      })
    );
  };

  const updateBlendMode = (blendMode: OverlayBlendMode) => {
    if (!selectedOverlay || !overlay) {
      return;
    }

    setPipeline(
      setOverlay(pipeline, {
        overlayId: selectedOverlay.id,
        opacity: overlay.opacity,
        blendMode
      })
    );
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-white/60">Biblioteca</p>
          <button
            type="button"
            onClick={() => setPipeline(clearOverlay(pipeline))}
            className="min-h-11 rounded-lg bg-white/10 px-3 text-xs"
          >
            Remover
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {OVERLAYS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyOverlayId(item.id)}
              className={`rounded-lg p-1 text-left ${
                overlay?.overlayId === item.id ? 'bg-accent/90 text-black' : 'bg-white/10 text-white/90'
              }`}
            >
              <Image
                src={item.src}
                alt={item.name}
                width={96}
                height={96}
                unoptimized
                className="h-14 w-full rounded object-cover"
              />
              <p className="px-1 pb-1 pt-1 text-[10px] leading-tight">{item.name}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1 text-xs uppercase tracking-wide text-white/60">Opacidade</p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={overlay?.opacity ?? 0.5}
          onChange={(event) => updateOpacity(Number(event.target.value))}
          disabled={!overlay}
          className="h-11 w-full accent-accent disabled:opacity-40"
        />
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Modo de Mesclagem</p>
        <div className="grid grid-cols-2 gap-2">
          {BLEND_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => updateBlendMode(mode)}
              disabled={!overlay}
              className={`min-h-11 rounded-lg px-3 text-sm capitalize ${
                overlay?.blendMode === mode ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
              } disabled:opacity-40`}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
