'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EditorCanvas } from '@/components/Editor/EditorCanvas';
import { EditorToolbar } from '@/components/Editor/EditorToolbar';
import { EditorControls } from '@/components/Editor/EditorControls';
import { useEditorStore } from '@/store/editor/editorStore';

export default function EditorPage() {
  const router = useRouter();
  const originalImage = useEditorStore((state) => state.originalImage);

  useEffect(() => {
    if (!originalImage) {
      router.replace('/');
    }
  }, [originalImage, router]);

  if (!originalImage) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col bg-canvas">
      <EditorToolbar />
      <div className="flex-1 px-3 pb-3 pt-2 lg:px-4 lg:pb-4">
        <div className="flex h-full flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4">
          <section className="min-h-0">
            <EditorCanvas imageUrl={originalImage.objectUrl} />
          </section>
          <section className="min-h-0">
            <EditorControls />
          </section>
        </div>
      </div>
    </main>
  );
}
