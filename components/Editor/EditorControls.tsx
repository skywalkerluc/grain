'use client';

import { AdjustmentsPanel } from '@/components/Adjustments/AdjustmentsPanel';
import { CropPanel } from '@/components/Crop/CropPanel';
import { OverlaysPanel } from '@/components/Overlays/OverlaysPanel';
import { PresetsPanel } from '@/components/Presets/PresetsPanel';
import { useEditorStore, type EditorMode } from '@/store/editor/editorStore';

const MODES: { id: EditorMode; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'adjustments', label: 'Ajustes' },
  { id: 'crop', label: 'Crop' },
  { id: 'text', label: 'Texto' },
  { id: 'overlays', label: 'Overlays' }
];

export function EditorControls() {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

  return (
    <aside className="min-h-44 rounded-t-3xl border-t border-white/10 bg-panel px-4 pb-5 pt-3">
      <nav className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`min-h-11 rounded-full px-4 text-sm ${
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
      {mode !== 'adjustments' && mode !== 'crop' && mode !== 'presets' && mode !== 'overlays' ? (
        <p className="pt-2 text-sm text-white/60">Módulo &quot;{mode}&quot; entra na próxima fase.</p>
      ) : null}
    </aside>
  );
}
