'use client';

import { useEffect, useMemo, useState } from 'react';
import useImage from 'use-image';
import Image from 'next/image';
import {
  type AgedPackVariant,
  applyPresetToPipeline,
  getPresetUsageSnapshot,
  getPresetsByPack,
  trackPresetUsage,
  type PresetPackId,
  renderAllPresetThumbnails
} from '@/core/presets';
import { useEditorStore } from '@/store/editor/editorStore';

type ThumbMap = Record<string, string>;
const PACK_OPTIONS: { id: PresetPackId; label: string }[] = [
  { id: 'balanced', label: 'Equilibrado' },
  { id: 'aged', label: 'Câmera Envelhecida' },
  { id: 'filmic', label: 'Fílmico' },
  { id: 'clean', label: 'Limpo' },
  { id: 'bold', label: 'Intenso' }
];
const AGED_VARIANTS: { id: AgedPackVariant; label: string; strength: number }[] = [
  { id: 'soft', label: 'Suave', strength: 68 },
  { id: 'medium', label: 'Médio', strength: 84 },
  { id: 'strong', label: 'Forte', strength: 100 }
];
const CATEGORY_LABELS = {
  Vintage: 'Vintage',
  Clean: 'Limpo',
  Dark: 'Escuro',
  Film: 'Filme'
} as const;
const PACK_DESCRIPTIONS: Record<PresetPackId, string> = {
  balanced: 'Base equilibrada com variações clássicas.',
  aged: 'Look de câmera antiga: fade, grão e cores desgastadas.',
  filmic: 'Mais textura e clima cinematográfico.',
  clean: 'Menos ruído e resultado mais limpo.',
  bold: 'Contraste e cor mais fortes.'
};

export function PresetsPanel() {
  const originalImage = useEditorStore((state) => state.originalImage);
  const presetId = useEditorStore((state) => state.presetId);
  const presetPack = useEditorStore((state) => state.presetPack);
  const presetStrength = useEditorStore((state) => state.presetStrength);
  const setPresetPack = useEditorStore((state) => state.setPresetPack);
  const setPresetStrength = useEditorStore((state) => state.setPresetStrength);
  const presets = useMemo(() => getPresetsByPack(presetPack), [presetPack]);

  const [image] = useImage(originalImage?.objectUrl ?? '', 'anonymous');
  const [thumbs, setThumbs] = useState<ThumbMap>({});
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setUsageMap(getPresetUsageSnapshot());
  }, []);

  useEffect(() => {
    if (!image) {
      setThumbs({});
      return;
    }

    let cancelled = false;

    setThumbs({});

    void renderAllPresetThumbnails(
      image,
      { width: image.width, height: image.height },
      96,
      presets,
      (id, dataUrl) => {
        if (!cancelled) {
          setThumbs((previous) => ({ ...previous, [id]: dataUrl }));
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [image, presets]);

  const categories = useMemo(() => ['Vintage', 'Clean', 'Dark', 'Film'] as const, []);
  const expectedThumbs = presets.length + 1;
  const loadedThumbs = Object.keys(thumbs).length;
  const thumbsReady = loadedThumbs >= expectedThumbs;
  const selectedPreset = useMemo(() => presets.find((item) => item.id === presetId) ?? null, [presetId, presets]);
  const activeAgedVariant = useMemo(
    () =>
      AGED_VARIANTS.reduce((closest, variant) =>
        Math.abs(variant.strength - presetStrength) < Math.abs(closest.strength - presetStrength)
          ? variant
          : closest
      ),
    [presetStrength]
  );

  const apply = (id: string | null) => {
    const state = useEditorStore.getState();
    const activePresets = getPresetsByPack(state.presetPack);
    const preset = id ? activePresets.find((item) => item.id === id) ?? null : null;
    state.setPreset(preset?.id ?? null);
    state.setPipeline(applyPresetToPipeline(state.pipeline, preset, state.presetStrength));
    if (preset?.id) {
      trackPresetUsage(preset.id);
      setUsageMap((previous) => ({ ...previous, [preset.id]: (previous[preset.id] ?? 0) + 1 }));
    }
  };

  const applyPresetStrength = (nextStrength: number) => {
    setPresetStrength(nextStrength);
    if (!selectedPreset) {
      return;
    }
    const state = useEditorStore.getState();
    state.setPipeline(applyPresetToPipeline(state.pipeline, selectedPreset, nextStrength));
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Estilo</p>
        <p className="mb-2 text-xs text-white/55">{PACK_DESCRIPTIONS[presetPack]}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PACK_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPresetPack(item.id);
                apply(null);
              }}
              className={`min-h-11 rounded-lg px-3 text-sm ${
                presetPack === item.id ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Sem filtro</p>
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

      {selectedPreset && thumbs.none && thumbs[selectedPreset.id] ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-2">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-white/60">Prévia do preset ativo</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/30 p-1">
              <Image
                src={thumbs.none}
                alt="Prévia original"
                width={96}
                height={96}
                className="h-16 w-full rounded-md object-cover"
                unoptimized
              />
              <p className="mt-1 text-center text-[10px] text-white/65">Antes</p>
            </div>
            <div className="rounded-lg bg-black/30 p-1">
              <Image
                src={thumbs[selectedPreset.id]}
                alt={`Prévia ${selectedPreset.name}`}
                width={96}
                height={96}
                className="h-16 w-full rounded-md object-cover"
                unoptimized
              />
              <p className="mt-1 text-center text-[10px] text-white/65">Depois</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-white/70">
          <p className="uppercase tracking-wide">Força do preset</p>
          <span>{presetStrength}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={presetStrength}
          onChange={(event) => applyPresetStrength(Number(event.target.value))}
          className="h-11 w-full accent-accent"
        />
        <p className="text-[11px] text-white/55">Controla a intensidade geral de cor, contraste, grão e LUT.</p>
      </section>

      {presetPack === 'aged' ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Variação Envelhecida</p>
          <div className="grid grid-cols-3 gap-2">
            {AGED_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => applyPresetStrength(variant.strength)}
                className={`min-h-11 rounded-lg px-2 text-xs ${
                  activeAgedVariant.id === variant.id ? 'bg-accent text-black' : 'bg-white/10 text-white/85'
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!thumbsReady ? (
        <p className="text-xs text-white/55">
          Gerando prévias: {loadedThumbs}/{expectedThumbs}
        </p>
      ) : null}

      {categories.map((category) => (
        <section key={category}>
          <p className="mb-2 text-xs uppercase tracking-wide text-white/60">{CATEGORY_LABELS[category]}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presets
              .filter((item) => item.category === category)
              .sort((a, b) => {
                const usageDelta = (usageMap[b.id] ?? 0) - (usageMap[a.id] ?? 0);
                if (usageDelta !== 0) {
                  return usageDelta;
                }
                return a.name.localeCompare(b.name);
              })
              .map((item) => (
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
                  <div className="h-16 w-full animate-pulse rounded-md bg-black/50" />
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
