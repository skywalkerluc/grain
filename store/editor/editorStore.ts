import { create } from 'zustand';
import { clonePipeline, createPipeline, getLatestOperation, type PipelineState } from '@/core/pipeline';
import { DEFAULT_PRESET_PACK, type PresetPackId } from '@/core/presets';

export type EditorMode = 'adjustments' | 'crop' | 'text' | 'overlays' | 'presets';
export type CropAspectRatio = 'free' | '1:1' | '4:5' | '9:16' | '16:9' | '3:4';

export type OriginalImageRef = {
  id: string;
  objectUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type EditorState = {
  originalImage: OriginalImageRef | null;
  pipeline: PipelineState;
  history: PipelineState[];
  future: PipelineState[];
  maxHistory: number;
  mode: EditorMode;
  cropAspectRatio: CropAspectRatio;
  presetId: string | null;
  presetPack: PresetPackId;
  presetStrength: number;
  canUndo: boolean;
  canRedo: boolean;
  showOriginalPreview: boolean;
  setOriginalImage: (image: OriginalImageRef) => void;
  setPipeline: (next: PipelineState) => void;
  setPipelinePreview: (next: PipelineState) => void;
  loadProjectSnapshot: (next: PipelineState, presetId: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setCropAspectRatio: (ratio: CropAspectRatio) => void;
  setPreset: (presetId: string | null) => void;
  setPresetPack: (presetPack: PresetPackId) => void;
  setPresetStrength: (presetStrength: number) => void;
  setShowOriginalPreview: (show: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

function pushHistory(history: PipelineState[], current: PipelineState, max: number): PipelineState[] {
  const next = [...history, clonePipeline(current)];
  if (next.length > max) {
    next.shift();
  }
  return next;
}

const PRESET_PACK_STORAGE_KEY = 'grain:lastPresetPack';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readPersistedPresetPack(): PresetPackId {
  if (typeof window === 'undefined') {
    return DEFAULT_PRESET_PACK;
  }

  try {
    const raw = window.localStorage.getItem(PRESET_PACK_STORAGE_KEY);
    if (raw === 'balanced' || raw === 'clean' || raw === 'filmic' || raw === 'bold' || raw === 'aged') {
      return raw;
    }
  } catch {
    // Ignore storage failures and use default.
  }

  return DEFAULT_PRESET_PACK;
}

function persistPresetPack(pack: PresetPackId): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PRESET_PACK_STORAGE_KEY, pack);
  } catch {
    // Ignore storage failures.
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  originalImage: null,
  pipeline: createPipeline(),
  history: [],
  future: [],
  maxHistory: 20,
  mode: 'adjustments',
  cropAspectRatio: 'free',
  presetId: null,
  presetPack: readPersistedPresetPack(),
  presetStrength: 100,
  canUndo: false,
  canRedo: false,
  showOriginalPreview: false,

  setOriginalImage: (image) => {
    const current = get().originalImage;
    if (current && current.objectUrl !== image.objectUrl) {
      URL.revokeObjectURL(current.objectUrl);
    }

    set({
      originalImage: image,
      pipeline: createPipeline(),
      history: [],
      future: [],
      presetId: null,
      canUndo: false,
      canRedo: false,
      showOriginalPreview: false,
      presetPack: readPersistedPresetPack(),
      presetStrength: 100
    });
  },

  setPipeline: (next) => {
    const state = get();
    if (JSON.stringify(state.pipeline.operations) === JSON.stringify(next.operations)) {
      return;
    }
    const history = pushHistory(state.history, state.pipeline, state.maxHistory);
    const nextPresetId = getLatestOperation(next, 'preset')?.payload.presetId ?? null;

    set({
      pipeline: clonePipeline(next),
      history,
      future: [],
      presetId: nextPresetId,
      canUndo: history.length > 0,
      canRedo: false
    });
  },

  setPipelinePreview: (next) => {
    const nextPresetId = getLatestOperation(next, 'preset')?.payload.presetId ?? null;
    set({
      pipeline: clonePipeline(next),
      presetId: nextPresetId
    });
  },

  loadProjectSnapshot: (next, presetId) => {
    set({
      pipeline: clonePipeline(next),
      history: [],
      future: [],
      presetId,
      presetStrength: 100,
      canUndo: false,
      canRedo: false
    });
  },

  setMode: (mode) => set({ mode }),

  setCropAspectRatio: (cropAspectRatio) => set({ cropAspectRatio }),

  setPreset: (presetId) => set({ presetId }),

  setPresetPack: (presetPack) => {
    persistPresetPack(presetPack);
    set({ presetPack });
  },

  setPresetStrength: (presetStrength) => set({ presetStrength: clamp(Math.round(presetStrength), 0, 100) }),

  setShowOriginalPreview: (showOriginalPreview) => set({ showOriginalPreview }),

  undo: () => {
    const state = get();
    if (state.history.length === 0) {
      return;
    }

    const previous = state.history[state.history.length - 1];
    const history = state.history.slice(0, -1);
    const future = [clonePipeline(state.pipeline), ...state.future];
    const previousPresetId = getLatestOperation(previous, 'preset')?.payload.presetId ?? null;

    set({
      pipeline: clonePipeline(previous),
      history,
      future,
      presetId: previousPresetId,
      canUndo: history.length > 0,
      canRedo: future.length > 0
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) {
      return;
    }

    const [next, ...remainingFuture] = state.future;
    const history = pushHistory(state.history, state.pipeline, state.maxHistory);
    const nextPresetId = getLatestOperation(next, 'preset')?.payload.presetId ?? null;

    set({
      pipeline: clonePipeline(next),
      history,
      future: remainingFuture,
      presetId: nextPresetId,
      canUndo: history.length > 0,
      canRedo: remainingFuture.length > 0
    });
  },

  reset: () => {
    set({
      pipeline: createPipeline(),
      history: [],
      future: [],
      presetId: null,
      presetStrength: 100,
      canUndo: false,
      canRedo: false,
      showOriginalPreview: false
    });
  }
}));
