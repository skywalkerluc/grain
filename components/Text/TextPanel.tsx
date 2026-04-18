'use client';

import { clearTextOverlay, getLatestOperation, setTextOverlay } from '@/core/pipeline';
import { useEditorStore } from '@/store/editor/editorStore';

const FONT_OPTIONS = ['Avenir Next', 'Georgia', 'Courier New'];
const ALIGN_OPTIONS: CanvasTextAlign[] = ['left', 'center', 'right'];

export function TextPanel() {
  const pipeline = useEditorStore((state) => state.pipeline);

  const textOperation = getLatestOperation(pipeline, 'text')?.payload;
  const hasText = Boolean(textOperation?.text);

  const text = textOperation?.text ?? '';
  const fontFamily = textOperation?.fontFamily ?? FONT_OPTIONS[0];
  const fontSize = textOperation?.fontSize ?? 36;
  const color = textOperation?.color ?? '#ffffff';
  const align = textOperation?.align ?? 'center';
  const x = textOperation?.x ?? 195;
  const y = textOperation?.y ?? 260;

  const update = (
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
    state.setPipeline(
      setTextOverlay(state.pipeline, {
        text: next?.text ?? text,
        fontFamily: next?.fontFamily ?? fontFamily,
        fontSize: next?.fontSize ?? fontSize,
        color: next?.color ?? color,
        align: next?.align ?? align,
        x: next?.x ?? x,
        y: next?.y ?? y
      })
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {!hasText ? (
        <button
          type="button"
          onClick={() =>
            update({
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
          onChange={(event) => update({ text: event.target.value })}
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
            onChange={(event) => update({ fontFamily: event.target.value })}
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
            onChange={(event) => update({ color: event.target.value })}
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
          max={96}
          step={1}
          value={fontSize}
          onChange={(event) => update({ fontSize: Number(event.target.value) })}
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
              onClick={() => update({ align: option })}
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
