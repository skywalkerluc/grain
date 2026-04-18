'use client';

import { useEffect, useMemo, useState } from 'react';
import useImage from 'use-image';
import Image from 'next/image';
import { applyPresetToPipeline, PRESETS, renderAllPresetThumbnails } from '@/core/presets';
import { useEditorStore } from '@/store/editor/editorStore';

type ThumbMap = Record<string, string>;

export function PresetsPanel() {
  const originalImage = useEditorStore((state) => state.originalImage);
  const pipeline = useEditorStore((state) => state.pipeline);
  const presetId = useEditorStore((state) => state.presetId);
  const setPreset = useEditorStore((state) => state.setPreset);
  const setPipeline = useEditorStore((state) => state.setPipeline);

  const [image] = useImage(originalImage?.objectUrl ?? '', 'anonymous');
  const [thumbs, setThumbs] = useState<ThumbMap>({});

  useEffect(() => {
    if (!image) {
      return;
    }

    let cancelled = false;

    void renderAllPresetThumbnails(image, { width: image.width, height: image.height }).then((results) => {
      if (cancelled) {
        return;
      }

      const entries: ThumbMap = {};
      for (const item of results) {
        entries[item.id] = item.dataUrl;
      }
      setThumbs(entries);
    });

    return () => {
      cancelled = true;
    };
  }, [image]);

  const categories = useMemo(() => ['Vintage', 'Clean', 'Dark', 'Film'] as const, []);

  const apply = (id: string | null) => {
    const preset = id ? PRESETS.find((item) => item.id === id) ?? null : null;
    setPreset(preset?.id ?? null);
    setPipeline(applyPresetToPipeline(pipeline, preset));
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Sem preset</p>
        <button
          type="button"
          onClick={() => apply(null)}
          className={`flex min-h-11 w-full items-center gap-3 rounded-xl p-2 text-left ${
            presetId === null ? 'bg-accent/90 text-black' : 'bg-white/10 text-white/90'
          }`}
        >
          <div className="h-12 w-12 rounded-md bg-black/50" />
          <div>
            <p className="text-sm font-medium">Original</p>
            <p className="text-xs opacity-70">Sem alterações automáticas</p>
          </div>
        </button>
      </section>

      {categories.map((category) => (
        <section key={category}>
          <p className="mb-2 text-xs uppercase tracking-wide text-white/60">{category}</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.filter((item) => item.category === category).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => apply(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    apply(item.id);
                  }
                }}
                className={`rounded-xl p-1 text-left ${
                  presetId === item.id ? 'bg-accent/90 text-black' : 'bg-white/10 text-white/90'
                }`}
              >
                {thumbs[item.id] ? (
                  <Image
                    src={thumbs[item.id]}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="h-16 w-full rounded-md object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-16 w-full rounded-md bg-black/50" />
                )}
                <p className="px-1 pb-1 pt-1 text-[11px] font-medium leading-tight">{item.name}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
