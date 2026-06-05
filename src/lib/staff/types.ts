/**
 * Staff editing domain — types.
 *
 * A `StaffKey` is `${part_id}-${staff_in_part}` (e.g. "P1-0"). Every other
 * piece of staff-edit state is keyed by it.
 *
 * `StaffTransform` is the compact representation of an affine 2×3 used for
 * Phase 8: translation, non-uniform scale, and reserved rotation. Phase
 * 8a treats this as the identity in all stored values (until the user
 * actually moves something in 8b); we lay the type down now so the rest
 * of the pipeline can already pass it around.
 */

export type StaffKey = string;

export interface StaffTransform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  /** Radians. Reserved for Phase 8e; identity = 0. */
  theta: number;
}

export const IDENTITY_TRANSFORM: StaffTransform = Object.freeze({
  tx: 0,
  ty: 0,
  sx: 1,
  sy: 1,
  theta: 0,
});

export function isIdentity(t: StaffTransform): boolean {
  return (
    t.tx === 0 &&
    t.ty === 0 &&
    t.sx === 1 &&
    t.sy === 1 &&
    t.theta === 0
  );
}
