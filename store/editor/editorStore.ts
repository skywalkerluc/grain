import { create } from 'zustand';
import { clonePipeline, createPipeline, type PipelineState } from '@/core/pipeline';

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
  canUndo: boolean;
  canRedo: boolean;
  showOriginalPreview: boolean;
  setOriginalImage: (image: OriginalImageRef) => void;
  setPipeline: (next: PipelineState) => void;
  setMode: (mode: EditorMode) => void;
  setCropAspectRatio: (ratio: CropAspectRatio) => void;
  setPreset: (presetId: string | null) => void;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  originalImage: null,
  pipeline: createPipeline(),
  history: [],
  future: [],
  maxHistory: 20,
  mode: 'adjustments',
  cropAspectRatio: 'free',
  presetId: null,
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
      canUndo: false,
      canRedo: false,
      showOriginalPreview: false
    });
  },

  setPipeline: (next) => {
    const state = get();
    const history = pushHistory(state.history, state.pipeline, state.maxHistory);

    set({
      pipeline: clonePipeline(next),
      history,
      future: [],
      canUndo: history.length > 0,
      canRedo: false
    });
  },

  setMode: (mode) => set({ mode }),

  setCropAspectRatio: (cropAspectRatio) => set({ cropAspectRatio }),

  setPreset: (presetId) => set({ presetId }),

  setShowOriginalPreview: (showOriginalPreview) => set({ showOriginalPreview }),

  undo: () => {
    const state = get();
    if (state.history.length === 0) {
      return;
    }

    const previous = state.history[state.history.length - 1];
    const history = state.history.slice(0, -1);
    const future = [clonePipeline(state.pipeline), ...state.future];

    set({
      pipeline: clonePipeline(previous),
      history,
      future,
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

    set({
      pipeline: clonePipeline(next),
      history,
      future: remainingFuture,
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
      canUndo: false,
      canRedo: false,
      showOriginalPreview: false
    });
  }
}));
