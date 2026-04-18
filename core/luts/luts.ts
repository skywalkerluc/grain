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
  }
];

export function getLutById(id: string): LutDefinition | undefined {
  return LUTS.find((lut) => lut.id === id);
}
