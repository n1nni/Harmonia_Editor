/**
 * Subset of Bravura's `engravingDefaults` we use at render time.
 * All values in staff spaces. Multiply by `lineSpacing` to get pixels.
 * Source: bravura_metadata.json (Bravura 1.39+).
 */
export const ENGRAVING_DEFAULTS = {
  staffLineThickness: 0.13,
  stemThickness: 0.12,
  beamThickness: 0.5,
  slurEndpointThickness: 0.1,
  slurMidpointThickness: 0.22,
  legerLineThickness: 0.16,
  legerLineExtension: 0.4,
} as const;
