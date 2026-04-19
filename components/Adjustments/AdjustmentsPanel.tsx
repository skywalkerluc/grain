'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getLatestAdjustments,
  setAdjustment,
  type AdjustmentKey,
  type AdjustmentValues
} from '@/core/pipeline';
import { useEditorStore } from '@/store/editor/editorStore';

type AdjustmentControl = {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

const CONTROLS: AdjustmentControl[] = [
  { key: 'brightness', label: 'Brilho', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: 'Saturação', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: 'Temperatura', min: -100, max: 100, step: 1 },
  { key: 'sharpness', label: 'Nitidez', min: 0, max: 100, step: 1 },
  { key: 'vignette', label: 'Vinheta', min: 0, max: 100, step: 1 },
  { key: 'fade', label: 'Fade', min: 0, max: 100, step: 1 },
  { key: 'grain', label: 'Grão', min: 0, max: 100, step: 1 }
];

const DEFAULT_VALUES: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  sharpness: 0,
  vignette: 0,
  fade: 0,
  grain: 0
};

export function AdjustmentsPanel() {
  const pipeline = useEditorStore((state) => state.pipeline);
  const [values, setValues] = useState<AdjustmentValues>(() => getLatestAdjustments(pipeline));
  const livePipelineRef = useRef(pipeline);
  const dragBaseRef = useRef<typeof pipeline | null>(null);

  useEffect(() => {
    setValues(getLatestAdjustments(pipeline));
    livePipelineRef.current = pipeline;
  }, [pipeline]);

  const entries = useMemo(() => CONTROLS, []);
  const commitPreview = () => {
    const base = dragBaseRef.current;
    dragBaseRef.current = null;
    if (!base) {
      return;
    }
    const state = useEditorStore.getState();
    state.setPipelinePreview(base);
    state.setPipeline(livePipelineRef.current);
  };

  useEffect(
    () => () => {
      const base = dragBaseRef.current;
      dragBaseRef.current = null;
      if (!base) {
        return;
      }
      const state = useEditorStore.getState();
      state.setPipelinePreview(base);
      state.setPipeline(livePipelineRef.current);
    },
    []
  );

  return (
    <div className="space-y-4">
      {entries.map((item) => {
        const defaultValue = DEFAULT_VALUES[item.key];
        const isDirty = values[item.key] !== defaultValue;

        const resetControl = () => {
          if (!isDirty) {
            return;
          }
          const state = useEditorStore.getState();
          const next = setAdjustment(state.pipeline, item.key, defaultValue);
          setValues((previous) => ({ ...previous, [item.key]: defaultValue }));
          state.setPipeline(next);
        };

        return (
          <label key={item.key} className="block">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-white/90">{item.label}</span>
              <span
                role="button"
                tabIndex={isDirty ? 0 : -1}
                onDoubleClick={resetControl}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    resetControl();
                  }
                }}
                title={isDirty ? 'Duplo clique para resetar' : undefined}
                className={`text-white/60 ${isDirty ? 'cursor-pointer underline decoration-dotted' : ''}`}
              >
                {item.min < 0 && values[item.key] > 0 ? `+${values[item.key]}` : values[item.key]}
              </span>
            </div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={values[item.key]}
              onPointerDown={() => {
                const state = useEditorStore.getState();
                dragBaseRef.current = state.pipeline;
                livePipelineRef.current = state.pipeline;
              }}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setValues((previous) => ({ ...previous, [item.key]: nextValue }));
                const state = useEditorStore.getState();
                if (!dragBaseRef.current) {
                  dragBaseRef.current = state.pipeline;
                  livePipelineRef.current = state.pipeline;
                }
                const base = dragBaseRef.current;
                const next = setAdjustment(base, item.key, nextValue);
                livePipelineRef.current = next;
                state.setPipelinePreview(next);
              }}
              onPointerUp={() => {
                commitPreview();
              }}
              onPointerCancel={() => {
                commitPreview();
              }}
              onBlur={() => {
                // Keyboard interactions and some pointer edge-cases may skip pointerup.
                commitPreview();
              }}
              className="h-11 w-full accent-accent"
            />
          </label>
        );
      })}
    </div>
  );
}
