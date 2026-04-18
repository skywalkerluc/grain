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
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-canvas">
      <EditorToolbar />
      <div className="flex-1 p-3 pb-2">
        <EditorCanvas imageUrl={originalImage.objectUrl} />
      </div>
      <EditorControls />
    </main>
  );
}
