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
    matrix: [1.18, 0.06, -0.06, 0.0, 1.04, -0.02, -0.06, -0.04, 0.92],
    offset: [0.022, 0.008, -0.012]
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
    matrix: [1.22, -0.14, 0.0, -0.06, 1.10, -0.04, 0.08, -0.08, 1.18],
    offset: [-0.004, 0.006, 0.004]
  },
  {
    id: 'cool-bleach',
    name: 'Cool Bleach',
    matrix: [0.76, 0.18, 0.06, 0.22, 0.68, 0.10, 0.10, 0.12, 0.78],
    offset: [-0.002, 0.0, 0.006]
  },
  {
    id: 'expired-analog',
    name: 'Expired Analog',
    matrix: [1.10, 0.12, -0.04, 0.04, 1.06, -0.06, -0.16, 0.06, 0.80],
    offset: [0.022, 0.014, -0.016]
  },
  {
    id: 'polaroid-fade',
    name: 'Polaroid Fade',
    matrix: [0.92, -0.02, 0.04, -0.01, 0.94, 0.08, -0.03, 0.04, 1.14],
    offset: [0.010, 0.014, 0.022]
  },
  {
    id: 'lomo-chrome',
    name: 'Lomo Chrome',
    matrix: [1.14, -0.08, 0.02, -0.06, 1.12, -0.04, -0.08, -0.04, 1.22],
    offset: [-0.006, -0.010, 0.008]
  }
];

export function getLutById(id: string): LutDefinition | undefined {
  return LUTS.find((lut) => lut.id === id);
}
