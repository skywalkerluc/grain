# Presets v5.1 Comparison

Comparison between v5 (previous baseline) and v5.1 tuning.

## Preset by preset (before -> after)

| Preset | Main changes | LUT intensity |
|---|---|---|
| Sienna Dust | brightness 6->4, contrast -6->-8, saturation -8->-10, temperature 18->16, fade 24->22, grain 22->20 | warm-kodak 0.78->0.74 |
| Linen Fade | brightness 10->8, saturation -16->-14, temperature 10->8, fade 34->30, grain 26->24, sharpness 4->2 | faded-portra 0.90->0.82 |
| Amber 35 | contrast 4->2, saturation -10->-12, temperature 22->20, fade 18->16, grain 28->26 | warm-kodak 0.92->0.86 |
| Crisp Day | contrast 10->8, saturation 6->4, grain 6->4 | no LUT |
| Natural Pop | contrast 8->6, saturation 10->8, grain 10->8 | faded-portra 0.35->0.28 |
| Cool Glass | brightness 10->8, contrast 14->12, temperature -20->-16, grain 8->6 | cool-bleach 0.55->0.48 |
| Ink Night | brightness -20->-18, contrast 26->22, vignette 28->24, grain 24->22 | noir-silver 0.50->0.44 |
| Graphite | contrast 22->20, saturation -22->-20, grain 20->18 | noir-silver 0.74->0.66 |
| Neon Alley | contrast 24->20, saturation 8->6, temperature -18->-16 | cinematic-teal 0.92->0.82 |
| ISO 160 | contrast 10->8, fade 10->8, grain 32->28 | faded-portra 0.84->0.76 |
| ISO 400 | contrast 14->12, grain 44->38 | warm-kodak 0.68->0.62 |
| Cross Dev | contrast 20->18, grain 36->32 | cross-process 0.88->0.80 |

## Grain curve changes (v5.1)

The grain renderer now uses a profile curve by intensity band:

- low (`grain < 18`): cleaner, finer specks, subtle clumps.
- mid (`18 <= grain < 36`): balanced organic texture.
- high (`36 <= grain < 56`): denser grain and stronger shadow weighting.
- ultra (`grain >= 56`): coarse texture with larger micro-clumps and stronger opacity bounds.

This keeps clean presets cleaner while giving ISO-like presets stronger character without forcing all presets into heavy noise.
