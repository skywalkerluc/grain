'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { applyPipelineToCanvas, exportPipelineBlob, getLatestOperation } from '@/core/pipeline';
import { useEditorStore } from '@/store/editor/editorStore';
import { ProjectLimitError, saveProject } from '@/store/projects/projectRepository';

async function blobFromObjectUrl(objectUrl: string): Promise<Blob> {
  const response = await fetch(objectUrl);
  return response.blob();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao carregar imagem para salvar projeto.'));
    image.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao converter canvas em blob'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function EditorToolbar() {
  const router = useRouter();

  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const showOriginalPreview = useEditorStore((state) => state.showOriginalPreview);
  const setShowOriginalPreview = useEditorStore((state) => state.setShowOriginalPreview);

  const originalImage = useEditorStore((state) => state.originalImage);
  const pipeline = useEditorStore((state) => state.pipeline);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now();
    setToast({ message, type, id });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<0.8 | 0.9 | 1>(0.9);
  const [exportSize, setExportSize] = useState<'original' | '1080'>('original');

  const activePresetId = useMemo(
    () => getLatestOperation(pipeline, 'preset')?.payload.presetId ?? null,
    [pipeline]
  );

  const saveCurrentProject = async () => {
    if (!originalImage || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const [originalBlob, imageElement] = await Promise.all([
        blobFromObjectUrl(originalImage.objectUrl),
        loadImage(originalImage.objectUrl)
      ]);

      const previewCanvas = await applyPipelineToCanvas(
        imageElement,
        { width: imageElement.width, height: imageElement.height },
        pipeline
      );

      const thumbCanvas = document.createElement('canvas');
      const max = 256;
      const scale = max / Math.max(previewCanvas.width, previewCanvas.height);
      thumbCanvas.width = Math.max(1, Math.round(previewCanvas.width * scale));
      thumbCanvas.height = Math.max(1, Math.round(previewCanvas.height * scale));
      const thumbCtx = thumbCanvas.getContext('2d');
      if (!thumbCtx) {
        throw new Error('Falha ao criar thumbnail');
      }
      thumbCtx.drawImage(previewCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

      const thumbnailBlob = await canvasToBlob(thumbCanvas, 'image/jpeg', 0.84);

      await saveProject({
        name: `${originalImage.fileName}${activePresetId ? ` · ${activePresetId}` : ''}`,
        originalBlob,
        thumbnailBlob,
        pipeline,
        mimeType: originalImage.mimeType,
        fileName: originalImage.fileName
      });

      showToast('Projeto salvo com sucesso.', 'success');
    } catch (error) {
      if (error instanceof ProjectLimitError) {
        showToast('Limite de 20 projetos atingido. Delete um para salvar outro.', 'error');
      } else {
        showToast('Não foi possível salvar o projeto agora.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const exportCurrentImage = async (
    options?: Partial<{
      format: 'image/jpeg' | 'image/png';
      quality: 0.8 | 0.9 | 1;
      size: 'original' | '1080';
    }>
  ) => {
    if (!originalImage || isExporting) {
      return;
    }

    try {
      setIsExporting(true);

      const chosenFormat = options?.format ?? exportFormat;
      const chosenQuality = options?.quality ?? exportQuality;
      const chosenSize = options?.size ?? exportSize;

      const imageElement = await loadImage(originalImage.objectUrl);
      const blob = await exportPipelineBlob(
        imageElement,
        { width: imageElement.width, height: imageElement.height },
        pipeline,
        {
          format: chosenFormat,
          quality: chosenFormat === 'image/jpeg' ? chosenQuality : undefined,
          maxSide: chosenSize === '1080' ? 1080 : undefined
        }
      );

      const baseName = originalImage.fileName.replace(/\.[^.]+$/, '');
      const extension = chosenFormat === 'image/png' ? 'png' : 'jpg';
      const sizeSuffix = chosenSize === '1080' ? '-1080' : '-original';
      triggerDownload(blob, `${baseName}-grain${sizeSuffix}.${extension}`);
      showToast('Imagem exportada com sucesso.', 'success');
    } catch {
      showToast('Não foi possível exportar a imagem agora.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const shareCurrentImage = async () => {
    if (!originalImage || isSharing) {
      return;
    }

    try {
      setIsSharing(true);

      const imageElement = await loadImage(originalImage.objectUrl);
      const blob = await exportPipelineBlob(
        imageElement,
        { width: imageElement.width, height: imageElement.height },
        pipeline,
        {
          format: exportFormat,
          quality: exportFormat === 'image/jpeg' ? exportQuality : undefined,
          maxSide: exportSize === '1080' ? 1080 : undefined
        }
      );

      const extension = exportFormat === 'image/png' ? 'png' : 'jpg';
      const baseName = originalImage.fileName.replace(/\.[^.]+$/, '');
      const fileName = `${baseName}-grain.${extension}`;
      const file = new File([blob], fileName, { type: exportFormat });

      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'Imagem editada no grain',
          files: [file]
        });
        showToast('Imagem compartilhada com sucesso.', 'success');
      } else {
        triggerDownload(blob, fileName);
        showToast('Compartilhamento indisponível neste dispositivo. Arquivo baixado.', 'success');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      showToast('Não foi possível compartilhar a imagem agora.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-3 pb-2 pt-[max(8px,var(--safe-top))] backdrop-blur lg:px-4"
      style={{ paddingLeft: 'max(12px,var(--safe-left))', paddingRight: 'max(12px,var(--safe-right))' }}
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Image src="/brand/logo.png" alt="grain" width={180} height={51} className="h-6 w-auto lg:h-7" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            Desfazer
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className="min-h-11 rounded-lg bg-white/10 px-3 text-sm disabled:opacity-40"
          >
            Refazer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveCurrentProject}
          disabled={isSaving || !originalImage}
          className="min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Projeto'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-sm"
        >
          Projetos
        </button>
        <button
          type="button"
          onClick={() => setShowExportPanel((current) => !current)}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-sm"
        >
          Exportar
        </button>
      </div>

      {showExportPanel ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 lg:p-4">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                void exportCurrentImage({
                  format: 'image/jpeg',
                  quality: 0.9,
                  size: '1080'
                })
              }
              disabled={isExporting || !originalImage}
              className="min-h-11 rounded-lg bg-accent px-3 text-xs font-semibold text-black disabled:opacity-50"
            >
              Download Rápido JPG 90% 1080px
            </button>
            <button
              type="button"
              onClick={() =>
                void exportCurrentImage({
                  format: 'image/png',
                  size: 'original'
                })
              }
              disabled={isExporting || !originalImage}
              className="min-h-11 rounded-lg bg-white/10 px-3 text-xs disabled:opacity-50"
            >
              Download Rápido PNG Original
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-white/60">Formato</span>
              <select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as 'image/jpeg' | 'image/png')}
                className="min-h-11 w-full rounded-lg border border-white/20 bg-black/20 px-2 text-sm"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-white/60">Qualidade</span>
              <select
                value={String(exportQuality)}
                onChange={(event) => setExportQuality(Number(event.target.value) as 0.8 | 0.9 | 1)}
                disabled={exportFormat !== 'image/jpeg'}
                className="min-h-11 w-full rounded-lg border border-white/20 bg-black/20 px-2 text-sm disabled:opacity-40"
              >
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
                <option value="1">100%</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-white/60">Tamanho</span>
              <select
                value={exportSize}
                onChange={(event) => setExportSize(event.target.value as 'original' | '1080')}
                className="min-h-11 w-full rounded-lg border border-white/20 bg-black/20 px-2 text-sm"
              >
                <option value="original">Original</option>
                <option value="1080">1080px</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void exportCurrentImage()}
              disabled={isExporting || !originalImage}
              className="min-h-11 flex-1 rounded-lg bg-accent px-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              {isExporting ? 'Exportando...' : 'Baixar Arquivo'}
            </button>
            <button
              type="button"
              onClick={() => void shareCurrentImage()}
              disabled={isSharing || !originalImage}
              className="min-h-11 rounded-lg bg-white/10 px-3 text-sm disabled:opacity-40"
            >
              {isSharing ? 'Compartilhando...' : 'Compartilhar'}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <p className={`pt-2 text-xs ${toast.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {toast.message}
        </p>
      ) : null}
    </header>
  );
}
