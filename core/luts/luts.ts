export type LutDefinition = {
  id: string;
  name: string;
  matrix: [number, number, number, number, number, number, number, number, number];
  offset: [number, number, number];
};

export const LUTS: LutDefinition[] = [
  {
    id: 'cinematic-teal',
    name: 'Cinematic Teal',
    matrix: [1.08, -0.02, -0.02, -0.03, 1.01, 0.04, -0.04, 0.08, 1.14],
    offset: [0.01, -0.01, 0]
  },
  {
    id: 'warm-kodak',
    name: 'Warm Kodak',
    matrix: [1.12, 0.02, -0.03, -0.01, 1.02, 0.01, -0.03, -0.02, 0.96],
    offset: [0.015, 0, -0.008]
  },
  {
    id: 'faded-portra',
    name: 'Faded Portra',
    matrix: [1.03, -0.01, -0.02, 0.02, 1, -0.01, 0.01, -0.01, 0.96],
    offset: [0.018, 0.012, 0.01]
  },
  {
    id: 'noir-silver',
    name: 'Noir Silver',
    matrix: [0.44, 0.38, 0.18, 0.4, 0.42, 0.18, 0.34, 0.34, 0.32],
    offset: [0, 0, 0]
  },
  {
    id: 'cross-process',
    name: 'Cross Process',
    matrix: [1.15, -0.08, -0.03, -0.06, 1.07, -0.01, 0.03, -0.04, 1.12],
    offset: [0.005, -0.004, 0.004]
  },
  {
    id: 'cool-bleach',
    name: 'Cool Bleach',
    matrix: [1.06, -0.03, -0.01, -0.01, 1.03, 0, -0.02, 0.02, 1.09],
    offset: [-0.005, -0.002, 0.004]
  }
];

export function getLutById(id: string): LutDefinition | undefined {
  return LUTS.find((lut) => lut.id === id);
}
