type LutSampler = (r: number, g: number, b: number) => [number, number, number];

export type MatrixLutDefinition = {
  id: string;
  name: string;
  kind: 'matrix';
  matrix: [number, number, number, number, number, number, number, number, number];
  offset: [number, number, number];
};

export type CubeLutDefinition = {
  id: string;
  name: string;
  kind: 'cube';
  size: number;
  sample: LutSampler;
};

export type LutDefinition = MatrixLutDefinition | CubeLutDefinition;

const cubeTableCache = new Map<string, Float32Array>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeMatrixLut(
  id: string,
  name: string,
  matrix: MatrixLutDefinition['matrix'],
  offset: MatrixLutDefinition['offset']
): MatrixLutDefinition {
  return { id, name, kind: 'matrix', matrix, offset };
}

function makeCubeLut(id: string, name: string, size: number, sample: LutSampler): CubeLutDefinition {
  return {
    id,
    name,
    kind: 'cube',
    size,
    sample
  };
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function tone(value: number, gamma: number): number {
  return Math.pow(clamp(value, 0, 1), gamma);
}

export const LUTS: LutDefinition[] = [
  makeMatrixLut(
    'cinematic-teal',
    'Cinematic Teal',
    [1.08, -0.02, -0.02, -0.03, 1.01, 0.04, -0.04, 0.08, 1.14],
    [0.01, -0.01, 0]
  ),
  makeMatrixLut(
    'warm-kodak',
    'Warm Kodak',
    [1.18, 0.06, -0.06, 0.0, 1.04, -0.02, -0.06, -0.04, 0.92],
    [0.022, 0.008, -0.012]
  ),
  makeMatrixLut(
    'faded-portra',
    'Faded Portra',
    [1.03, -0.01, -0.02, 0.02, 1, -0.01, 0.01, -0.01, 0.96],
    [0.018, 0.012, 0.01]
  ),
  makeMatrixLut(
    'noir-silver',
    'Noir Silver',
    [0.44, 0.38, 0.18, 0.4, 0.42, 0.18, 0.34, 0.34, 0.32],
    [0, 0, 0]
  ),
  makeMatrixLut(
    'cross-process',
    'Cross Process',
    [1.22, -0.14, 0.0, -0.06, 1.10, -0.04, 0.08, -0.08, 1.18],
    [-0.004, 0.006, 0.004]
  ),
  makeMatrixLut(
    'cool-bleach',
    'Cool Bleach',
    [0.76, 0.18, 0.06, 0.22, 0.68, 0.10, 0.10, 0.12, 0.78],
    [-0.002, 0.0, 0.006]
  ),
  makeCubeLut('expired-analog', 'Expired Analog', 17, (r, g, b) => {
    const y = luma(r, g, b);
    const shadowLift = (1 - y) * 0.14;
    const highlightFade = tone(y, 1.55) * 0.09;

    const nr = clamp(r * 0.95 + g * 0.06 + shadowLift + 0.025 - highlightFade * 0.45, 0, 1);
    const ng = clamp(g * 0.92 + r * 0.04 + shadowLift * 0.65 + 0.02 - highlightFade * 0.2, 0, 1);
    const nb = clamp(b * 0.78 + g * 0.08 - shadowLift * 0.35 - 0.028 + highlightFade * 0.35, 0, 1);

    return [tone(nr, 0.95), tone(ng, 0.97), tone(nb, 1.08)];
  }),
  makeCubeLut('polaroid-fade', 'Polaroid Fade', 17, (r, g, b) => {
    const y = luma(r, g, b);
    const fade = 0.065 + (1 - y) * 0.03;

    const nr = clamp(r * 0.9 + b * 0.03 + fade * 0.8, 0, 1);
    const ng = clamp(g * 0.93 + r * 0.02 + fade * 0.9, 0, 1);
    const nb = clamp(b * 1.08 + g * 0.03 + fade * 1.25, 0, 1);

    return [tone(nr, 0.98), tone(ng, 1), tone(nb, 0.92)];
  }),
  makeCubeLut('lomo-chrome', 'Lomo Chrome', 17, (r, g, b) => {
    const y = luma(r, g, b);
    const contrastBoost = (y - 0.5) * 0.18;

    const nr = clamp((r + contrastBoost) * 1.1 + g * 0.02 - b * 0.02, 0, 1);
    const ng = clamp((g + contrastBoost * 0.8) * 1.02 - r * 0.02, 0, 1);
    const nb = clamp((b + contrastBoost * 1.2) * 1.2 - g * 0.03, 0, 1);

    return [tone(nr, 0.92), tone(ng, 1), tone(nb, 0.9)];
  })
];

export function getLutById(id: string): LutDefinition | undefined {
  return LUTS.find((lut) => lut.id === id);
}

export function buildCubeTable(lut: CubeLutDefinition): Float32Array {
  const cached = cubeTableCache.get(lut.id);
  if (cached) {
    return cached;
  }

  const size = lut.size;
  const table = new Float32Array(size * size * size * 3);
  let index = 0;

  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) {
        const inR = r / (size - 1);
        const inG = g / (size - 1);
        const inB = b / (size - 1);
        const [outR, outG, outB] = lut.sample(inR, inG, inB);

        table[index] = clamp(outR, 0, 1);
        table[index + 1] = clamp(outG, 0, 1);
        table[index + 2] = clamp(outB, 0, 1);
        index += 3;
      }
    }
  }

  cubeTableCache.set(lut.id, table);
  return table;
}
