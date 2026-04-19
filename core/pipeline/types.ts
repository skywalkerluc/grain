export type AdjustmentKey =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'temperature'
  | 'sharpness'
  | 'vignette'
  | 'fade'
  | 'grain';

export type AdjustmentValues = Record<AdjustmentKey, number>;

export type PipelineOperation =
  | {
      id: string;
      type: 'adjustments';
      payload: AdjustmentValues;
    }
  | {
      id: string;
      type: 'preset';
      payload: {
        presetId: string;
        strength?: number;
      };
    }
  | {
      id: string;
      type: 'crop';
      payload: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }
  | {
      id: string;
      type: 'rotate';
      payload: {
        angle: 90 | 180 | 270;
      };
    }
  | {
      id: string;
      type: 'flip';
      payload: {
        horizontal: boolean;
        vertical: boolean;
      };
    }
  | {
      id: string;
      type: 'lut';
      payload: {
        lutId: string;
        intensity: number;
      };
    }
    | {
      id: string;
      type: 'overlay';
      payload: {
        overlayId: string;
        opacity: number;
        blendMode:
          | 'normal'
          | 'multiply'
          | 'screen'
          | 'overlay'
          | 'darken'
          | 'lighten'
          | 'color-dodge'
          | 'color-burn'
          | 'hard-light'
          | 'soft-light';
      };
    }
  | {
      id: string;
      type: 'text';
      payload: {
        text: string;
        x: number;
        y: number;
        color: string;
        fontFamily: string;
        fontSize: number;
        align: CanvasTextAlign;
      };
    };

export type PipelineState = {
  version: 1;
  operations: PipelineOperation[];
};

export type ExportFormat = 'image/jpeg' | 'image/png';

export type ExportOptions = {
  format: ExportFormat;
  quality?: number;
  maxSide?: number;
};
