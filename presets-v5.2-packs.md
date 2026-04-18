# Presets v5.2 Packs

v5.2 introduces style packs on top of the current preset baseline, without UI/flow changes.

## Available packs

- `balanced` (default): current tuned baseline.
- `clean`: less grain/fade/vignette, softer LUT intensity, cleaner finish.
- `filmic`: more grain/fade/vignette, softer saturation/contrast, stronger analog feel.
- `bold`: stronger contrast/saturation/sharpness, reduced haze, punchier output.

## How to switch

Edit constant in:

- `core/presets/presets.ts`

```ts
export const ACTIVE_PRESET_PACK: PresetPackId = 'balanced';
```

Set to one of: `balanced | clean | filmic | bold`.

## Notes

- IDs/names are suffixed for non-balanced packs (`-clean`, `-filmic`, `-bold`) to avoid collisions during quick A/B checks.
- Pipeline API remains unchanged.
- Existing preset rendering and tests continue to work with the active pack.
