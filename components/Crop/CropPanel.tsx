'use client';

import { getLatestOperation, rotateQuarterTurn, toggleFlip } from '@/core/pipeline';
import { useEditorStore, type CropAspectRatio } from '@/store/editor/editorStore';

const RATIOS: { label: string; value: CropAspectRatio }[] = [
  { label: 'Livre', value: 'free' },
  { label: '1:1', value: '1:1' },
  { label: '4:5', value: '4:5' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '3:4', value: '3:4' }
];

export function CropPanel() {
  const cropAspectRatio = useEditorStore((state) => state.cropAspectRatio);
  const setCropAspectRatio = useEditorStore((state) => state.setCropAspectRatio);
  const pipeline = useEditorStore((state) => state.pipeline);
  const setPipeline = useEditorStore((state) => state.setPipeline);

  const flip = getLatestOperation(pipeline, 'flip')?.payload;

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Proporção</p>
        <div className="grid grid-cols-3 gap-2">
          {RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              type="button"
              onClick={() => setCropAspectRatio(ratio.value)}
              className={`min-h-11 rounded-lg text-sm ${
                cropAspectRatio === ratio.value ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Transformações</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPipeline(rotateQuarterTurn(pipeline, 'counterclockwise'))}
            className="min-h-11 rounded-lg bg-white/10 text-sm"
          >
            Rotacionar -90°
          </button>
          <button
            type="button"
            onClick={() => setPipeline(rotateQuarterTurn(pipeline, 'clockwise'))}
            className="min-h-11 rounded-lg bg-white/10 text-sm"
          >
            Rotacionar +90°
          </button>
          <button
            type="button"
            onClick={() => setPipeline(toggleFlip(pipeline, 'horizontal'))}
            className={`min-h-11 rounded-lg text-sm ${
              flip?.horizontal ? 'bg-accent text-black' : 'bg-white/10'
            }`}
          >
            Flip Horizontal
          </button>
          <button
            type="button"
            onClick={() => setPipeline(toggleFlip(pipeline, 'vertical'))}
            className={`min-h-11 rounded-lg text-sm ${
              flip?.vertical ? 'bg-accent text-black' : 'bg-white/10'
            }`}
          >
            Flip Vertical
          </button>
        </div>
      </section>

      <p className="text-xs text-white/55">
        Ajuste a área no canvas e toque em &quot;Aplicar crop&quot;.
      </p>
    </div>
  );
}
