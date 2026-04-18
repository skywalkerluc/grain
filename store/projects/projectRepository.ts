import { openDB, type DBSchema } from 'idb';
import { deserializePipeline, serializePipeline, type PipelineState } from '@/core/pipeline';

const DB_NAME = 'grain-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
export const PROJECT_LIMIT = 20;

export class ProjectLimitError extends Error {
  constructor() {
    super('Project limit reached (20)');
    this.name = 'ProjectLimitError';
  }
}

export type SavedProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  originalBlob: Blob;
  thumbnailBlob: Blob;
  pipelineSerialized: string;
  mimeType: string;
  fileName: string;
};

type GrainDB = DBSchema & {
  [PROJECTS_STORE]: {
    key: string;
    value: SavedProject;
    indexes: {
      'by-updated-at': string;
    };
  };
};

async function getDb() {
  return openDB<GrainDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        store.createIndex('by-updated-at', 'updatedAt');
      }
    }
  });
}

export async function listProjects(): Promise<SavedProject[]> {
  const db = await getDb();
  const all = await db.getAll(PROJECTS_STORE);
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getProjectsCount(): Promise<number> {
  const db = await getDb();
  return db.count(PROJECTS_STORE);
}

export async function saveProject(input: {
  name: string;
  originalBlob: Blob;
  thumbnailBlob: Blob;
  pipeline: PipelineState;
  mimeType: string;
  fileName: string;
}): Promise<SavedProject> {
  const db = await getDb();
  const count = await db.count(PROJECTS_STORE);
  if (count >= PROJECT_LIMIT) {
    throw new ProjectLimitError();
  }

  const now = new Date().toISOString();
  const record: SavedProject = {
    id: crypto.randomUUID(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
    originalBlob: input.originalBlob,
    thumbnailBlob: input.thumbnailBlob,
    pipelineSerialized: serializePipeline(input.pipeline),
    mimeType: input.mimeType,
    fileName: input.fileName
  };

  await db.put(PROJECTS_STORE, record);
  return record;
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDb();
  await db.delete(PROJECTS_STORE, projectId);
}

export async function getProject(projectId: string): Promise<SavedProject | undefined> {
  const db = await getDb();
  return db.get(PROJECTS_STORE, projectId);
}

export function restoreProjectPipeline(project: SavedProject): PipelineState {
  return deserializePipeline(project.pipelineSerialized);
}
