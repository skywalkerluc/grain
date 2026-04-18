'use client';

import dynamic from 'next/dynamic';

type EditorCanvasProps = {
  imageUrl: string;
};

const DynamicEditorCanvasClient = dynamic(
  () => import('./EditorCanvasClient').then((module) => module.EditorCanvasClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[340px] w-full items-center justify-center rounded-2xl bg-black/70 text-sm text-white/70">
        Carregando editor...
      </div>
    )
  }
);

export function EditorCanvas({ imageUrl }: EditorCanvasProps) {
  return <DynamicEditorCanvasClient imageUrl={imageUrl} />;
}
