'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getLatestOperation } from '@/core/pipeline';
import { inferPresetPackFromId } from '@/core/presets';
import { useEditorStore } from '@/store/editor/editorStore';
import {
  deleteProject,
  listProjects,
  restoreProjectPipeline,
  type SavedProject
} from '@/store/projects/projectRepository';

type ProjectCard = {
  record: SavedProject;
  thumbUrl: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const setOriginalImage = useEditorStore((state) => state.setOriginalImage);
  const loadProjectSnapshot = useEditorStore((state) => state.loadProjectSnapshot);
  const setPresetPack = useEditorStore((state) => state.setPresetPack);

  const [items, setItems] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const thumbUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const projects = await listProjects();
        if (!mounted) {
          return;
        }

        const mapped = projects.map((record) => ({
          record,
          thumbUrl: URL.createObjectURL(record.thumbnailBlob)
        }));
        thumbUrlsRef.current = mapped.map((item) => item.thumbUrl);
        setItems(mapped);
      } catch {
        if (mounted) {
          setError('Não foi possível carregar os projetos.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
      for (const url of thumbUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      thumbUrlsRef.current = [];
    };
  }, []);

  const count = useMemo(() => items.length, [items]);

  const openProject = (project: SavedProject) => {
    const objectUrl = URL.createObjectURL(project.originalBlob);
    const pipeline = restoreProjectPipeline(project);
    const restoredPresetId = getLatestOperation(pipeline, 'preset')?.payload.presetId ?? null;

    setOriginalImage({
      id: project.id,
      objectUrl,
      fileName: project.fileName,
      mimeType: project.mimeType,
      size: project.originalBlob.size
    });

    setPresetPack(restoredPresetId ? inferPresetPackFromId(restoredPresetId) : 'balanced');
    loadProjectSnapshot(pipeline, restoredPresetId);
    router.push('/editor');
  };

  const removeProject = async (projectId: string) => {
    await deleteProject(projectId);
    setPendingDeleteId(null);
    setItems((current) => {
      const target = current.find((item) => item.record.id === projectId);
      if (target) {
        URL.revokeObjectURL(target.thumbUrl);
        thumbUrlsRef.current = thumbUrlsRef.current.filter((url) => url !== target.thumbUrl);
      }
      return current.filter((item) => item.record.id !== projectId);
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 lg:px-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projetos</h1>
          <p className="text-xs text-white/70">
            {count}/20 salvos localmente no seu dispositivo
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-sm"
        >
          Início
        </button>
      </header>

      {loading ? <p className="text-sm text-white/70">Carregando projetos...</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <section className="rounded-2xl bg-panel p-6 text-center">
          <p className="text-sm text-white/70">Nenhum projeto salvo ainda.</p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.record.id} className="rounded-xl border border-white/10 bg-panel p-2">
            <div className="relative mb-2 h-28 w-full overflow-hidden rounded-md bg-black/40">
              <Image src={item.thumbUrl} alt={item.record.name} fill unoptimized className="object-cover" />
            </div>
            <p className="line-clamp-2 text-xs text-white/85">{item.record.name}</p>
            <p className="mt-1 text-[11px] text-white/50">
              {new Date(item.record.updatedAt).toLocaleString('pt-BR')}
            </p>
            <div className="mt-2 flex gap-2">
              {pendingDeleteId === item.record.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => void removeProject(item.record.id)}
                    className="min-h-11 flex-1 rounded-lg bg-red-500/80 px-2 text-xs font-semibold text-white"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    className="min-h-11 flex-1 rounded-lg bg-white/10 px-2 text-xs"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openProject(item.record)}
                    className="min-h-11 flex-1 rounded-lg bg-accent px-2 text-xs font-semibold text-black"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(item.record.id)}
                    className="min-h-11 flex-1 rounded-lg bg-white/10 px-2 text-xs"
                  >
                    Deletar
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
