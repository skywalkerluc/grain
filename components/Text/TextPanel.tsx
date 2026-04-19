'use client';

import { useRef } from 'react';
import { clearTextOverlay, getLatestOperation, setTextOverlay, type PipelineState } from '@/core/pipeline';
import { useEditorStore } from '@/store/editor/editorStore';

const FONT_OPTIONS = ['Avenir Next', 'Georgia', 'Courier New'];
const ALIGN_OPTIONS: CanvasTextAlign[] = ['left', 'center', 'right'];
const TEXT_MAX_FONT_SIZE = 180;

export function TextPanel() {
  const pipeline = useEditorStore((state) => state.pipeline);
  const previewBaseRef = useRef<PipelineState | null>(null);
  const previewRef = useRef<PipelineState | null>(null);

  const textOperation = getLatestOperation(pipeline, 'text')?.payload;
  const hasText = Boolean(textOperation?.text);

  const text = textOperation?.text ?? '';
  const fontFamily = textOperation?.fontFamily ?? FONT_OPTIONS[0];
  const fontSize = textOperation?.fontSize ?? 36;
  const color = textOperation?.color ?? '#ffffff';
  const align = textOperation?.align ?? 'center';
  const x = textOperation?.x ?? 195;
  const y = textOperation?.y ?? 260;

  const buildPipeline = (
    next: Partial<{
      text: string;
      x: number;
      y: number;
      color: string;
      fontFamily: string;
      fontSize: number;
      align: CanvasTextAlign;
    }>
  ) => {
    const base = previewBaseRef.current ?? useEditorStore.getState().pipeline;
    return setTextOverlay(base, {
      text: next?.text ?? text,
      fontFamily: next?.fontFamily ?? fontFamily,
      fontSize: next?.fontSize ?? fontSize,
      color: next?.color ?? color,
      align: next?.align ?? align,
      x: next?.x ?? x,
      y: next?.y ?? y
    });
  };

  const startPreview = () => {
    previewBaseRef.current = useEditorStore.getState().pipeline;
    previewRef.current = null;
  };

  const updatePreview = (
    next: Partial<{
      text: string;
      x: number;
      y: number;
      color: string;
      fontFamily: string;
      fontSize: number;
      align: CanvasTextAlign;
    }>
  ) => {
    const state = useEditorStore.getState();
    const preview = buildPipeline(next);
    previewRef.current = preview;
    state.setPipelinePreview(preview);
  };

  const commitPreview = () => {
    const base = previewBaseRef.current;
    const preview = previewRef.current;
    previewBaseRef.current = null;
    previewRef.current = null;
    if (!base || !preview) {
      return;
    }
    const state = useEditorStore.getState();
    state.setPipelinePreview(base);
    state.setPipeline(preview);
  };

  const apply = (
    next: Partial<{
      text: string;
      x: number;
      y: number;
      color: string;
      fontFamily: string;
      fontSize: number;
      align: CanvasTextAlign;
    }>
  ) => {
    const state = useEditorStore.getState();
    state.setPipeline(setTextOverlay(state.pipeline, {
      text: next?.text ?? text,
      fontFamily: next?.fontFamily ?? fontFamily,
      fontSize: next?.fontSize ?? fontSize,
      color: next?.color ?? color,
      align: next?.align ?? align,
      x: next?.x ?? x,
      y: next?.y ?? y
    }));
  };

  return (
    <div className="space-y-4 pb-24">
      {!hasText ? (
        <button
          type="button"
          onClick={() =>
            apply({
              text: 'Novo texto',
              x,
              y,
              fontFamily,
              fontSize,
              color,
              align
            })
          }
          className="min-h-11 w-full rounded-lg bg-accent px-3 text-sm font-semibold text-black"
        >
          Adicionar texto
        </button>
      ) : null}

      <section>
        <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Texto</label>
        <input
          type="text"
          value={text}
          maxLength={64}
          onFocus={startPreview}
          onChange={(event) => updatePreview({ text: event.target.value })}
          onBlur={commitPreview}
          className="min-h-11 w-full rounded-lg border border-white/20 bg-black/20 px-3 text-sm"
          placeholder="Digite seu texto"
          disabled={!hasText}
        />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Fonte</span>
          <select
            value={fontFamily}
            onChange={(event) => apply({ fontFamily: event.target.value })}
            disabled={!hasText}
            className="min-h-11 w-full rounded-lg border border-white/20 bg-black/20 px-2 text-sm"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Cor</span>
          <input
            type="color"
            value={color}
            onFocus={startPreview}
            onChange={(event) => updatePreview({ color: event.target.value })}
            onBlur={commitPreview}
            disabled={!hasText}
            className="h-11 w-full rounded-lg border border-white/20 bg-black/20 p-1"
          />
        </label>
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
          <span>Tamanho</span>
          <span className="normal-case">{fontSize}px</span>
        </div>
        <input
          type="range"
          min={16}
          max={TEXT_MAX_FONT_SIZE}
          step={1}
          value={fontSize}
          onPointerDown={startPreview}
          onChange={(event) => updatePreview({ fontSize: Number(event.target.value) })}
          onPointerUp={commitPreview}
          onPointerCancel={commitPreview}
          onBlur={commitPreview}
          disabled={!hasText}
          className="h-11 w-full accent-accent"
        />
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Alinhamento</p>
        <div className="grid grid-cols-3 gap-2">
          {ALIGN_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => apply({ align: option })}
              disabled={!hasText}
              className={`min-h-11 rounded-lg text-sm capitalize ${
                align === option ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          previewBaseRef.current = null;
          previewRef.current = null;
          const state = useEditorStore.getState();
          state.setPipeline(clearTextOverlay(state.pipeline));
        }}
        disabled={!hasText}
        className="min-h-11 rounded-lg bg-white/10 px-3 text-sm"
      >
        Remover texto
      </button>
    </div>
  );
}
