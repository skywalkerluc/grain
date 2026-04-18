'use client';

import { AdjustmentsPanel } from '@/components/Adjustments/AdjustmentsPanel';
import { CropPanel } from '@/components/Crop/CropPanel';
import { OverlaysPanel } from '@/components/Overlays/OverlaysPanel';
import { PresetsPanel } from '@/components/Presets/PresetsPanel';
import { TextPanel } from '@/components/Text/TextPanel';
import { useEditorStore, type EditorMode } from '@/store/editor/editorStore';

const MODES: { id: EditorMode; label: string }[] = [
  { id: 'presets', label: 'Filtros' },
  { id: 'adjustments', label: 'Ajustes' },
  { id: 'crop', label: 'Crop' },
  { id: 'text', label: 'Texto' },
  { id: 'overlays', label: 'Texturas' }
];

export function EditorControls() {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

  return (
    <aside
      className="sticky bottom-0 max-h-[46dvh] min-h-44 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-panel/98 px-4 pb-[max(20px,var(--safe-bottom))] pt-3 backdrop-blur lg:top-[88px] lg:max-h-[calc(100dvh-108px)] lg:min-h-0 lg:rounded-2xl lg:border lg:px-4 lg:pb-4 lg:pt-4"
      style={{ paddingLeft: 'max(16px,var(--safe-left))', paddingRight: 'max(16px,var(--safe-right))' }}
    >
      <nav className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm lg:text-[13px] ${
              mode === item.id ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {mode === 'adjustments' ? <AdjustmentsPanel /> : null}
      {mode === 'crop' ? <CropPanel /> : null}
      {mode === 'presets' ? <PresetsPanel /> : null}
      {mode === 'overlays' ? <OverlaysPanel /> : null}
      {mode === 'text' ? <TextPanel /> : null}
      {mode !== 'adjustments' && mode !== 'crop' && mode !== 'presets' && mode !== 'overlays' && mode !== 'text' ? (
        <p className="pt-2 text-sm text-white/60">Módulo &quot;{mode}&quot; entra na próxima fase.</p>
      ) : null}
    </aside>
  );
}
