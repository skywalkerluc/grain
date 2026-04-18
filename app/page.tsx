'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEditorStore } from '@/store/editor/editorStore';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

async function normalizeFile(file: File): Promise<{ blob: Blob; mimeType: string; fileName: string }> {
  const isHeic = HEIC_TYPES.has(file.type) ||
    (!file.type && /\.(heic|heif)$/i.test(file.name));

  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return { blob, mimeType: 'image/jpeg', fileName };
  }

  return { blob: file, mimeType: file.type, fileName: file.name };
}

export default function HomePage() {
  const router = useRouter();
  const setOriginalImage = useEditorStore((state) => state.setOriginalImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const helper = useMemo(
    () => 'JPG, PNG, WebP e HEIC até 20 MB. Tudo processado localmente.',
    []
  );

  const handleFile = async (file: File) => {
    const isHeic = HEIC_TYPES.has(file.type) || (!file.type && /\.(heic|heif)$/i.test(file.name));
    const effectiveType = isHeic ? 'image/heic' : file.type;

    if (!ALLOWED_TYPES.includes(effectiveType)) {
      setError('Formato não suportado. Use JPG, PNG, WebP ou HEIC.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Arquivo maior que 20 MB. Escolha uma imagem menor.');
      return;
    }

    setError(null);

    try {
      if (isHeic) {
        setConverting(true);
      }

      const { blob, mimeType, fileName } = await normalizeFile(file);
      const objectUrl = URL.createObjectURL(blob);

      setOriginalImage({
        id: crypto.randomUUID(),
        fileName,
        mimeType,
        objectUrl,
        size: blob.size
      });

      router.push('/editor');
    } catch {
      setError('Não foi possível converter o arquivo HEIC. Tente exportar como JPG no seu dispositivo.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center p-6 lg:px-8">
      <section className="rounded-2xl bg-panel p-6 shadow-lg shadow-black/30 lg:p-8">
        <Image src="/brand/logo.png" alt="grain" width={260} height={74} className="h-10 w-auto" priority />
        <p className="mt-3 max-w-2xl text-sm text-white/70">{helper}</p>

        <div
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) {
              void handleFile(file);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="mt-6 flex min-h-48 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/30 p-6 text-center lg:min-h-56"
        >
          {converting ? (
            <p className="text-sm text-white/70">Convertendo HEIC...</p>
          ) : (
            <p className="max-w-sm text-sm text-white/75">
              Arraste e solte sua imagem aqui ou clique para selecionar um arquivo.
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black"
          >
            Escolher Foto
          </button>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="min-h-11 w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-medium"
          >
            Abrir Projetos Salvos
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>
    </main>
  );
}
