'use client';

import Image from 'next/image';
import { useEditorStore } from '@/store/editor/editorStore';

export function EditorToolbar() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const showOriginalPreview = useEditorStore((state) => state.showOriginalPreview);
  const setShowOriginalPreview = useEditorStore((state) => state.setShowOriginalPreview);

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-white/10 bg-canvas/95 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Image src="/brand/logo.png" alt="grain" width={180} height={51} className="h-6 w-auto" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={() => setShowOriginalPreview(true)}
          onPointerUp={() => setShowOriginalPreview(false)}
          onPointerLeave={() => setShowOriginalPreview(false)}
          onPointerCancel={() => setShowOriginalPreview(false)}
          className={`min-h-11 rounded-lg px-3 text-sm ${
            showOriginalPreview ? 'bg-accent text-black' : 'bg-white/10'
          }`}
        >
          Antes
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-sm disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-sm disabled:opacity-40"
        >
          Redo
        </button>
      </div>
    </header>
  );
}
