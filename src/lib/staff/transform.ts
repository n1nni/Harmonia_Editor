/**
 * Affine 2×3 matrix algebra for staff transforms.
 *
 * Internal storage uses the compact { tx, ty, sx, sy, theta } shape from
 * `./types`. This module converts to/from the full 6-tuple matrix when
 * needed (composition, inversion, SVG serialisation).
 *
 *   [ a c e ]   [ x ]   [ a*x + c*y + e ]
 *   [ b d f ] * [ y ] = [ b*x + d*y + f ]
 *   [ 0 0 1 ]   [ 1 ]   [        1      ]
 *
 * Mapping from { tx, ty, sx, sy, theta }:
 *   a =  cos(theta) * sx
 *   b =  sin(theta) * sx
 *   c = -sin(theta) * sy
 *   d =  cos(theta) * sy
 *   e =  tx
 *   f =  ty
 *
 * For Phase 8a theta is always 0, so cos=1, sin=0:
 *   a = sx, b = 0, c = 0, d = sy, e = tx, f = ty
 */

import type { Vec2 } from '@/lib/geometry/bbox';
import type { StaffTransform } from './types';

export interface Matrix2D {
  a: number; b: number; c: number; d: number; e: number; f: number;
}

export const IDENTITY_MATRIX: Matrix2D = Object.freeze({
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
});

export function transformToMatrix(t: StaffTransform): Matrix2D {
  const cos = Math.cos(t.theta);
  const sin = Math.sin(t.theta);
  return {
    a: cos * t.sx,
    b: sin * t.sx,
    c: -sin * t.sy,
    d: cos * t.sy,
    e: t.tx,
    f: t.ty,
  };
}

/** m2 ∘ m1 — apply m1 first, then m2. */
export function compose(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export function applyMatrix(m: Matrix2D, p: Vec2): Vec2 {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function invertMatrix(m: Matrix2D): Matrix2D {
  const det = m.a * m.d - m.b * m.c;
  if (det === 0) throw new Error('Matrix2D not invertible (singular)');
  const inv = 1 / det;
  return {
    a: m.d * inv,
    b: -m.b * inv,
    c: -m.c * inv,
    d: m.a * inv,
    e: (m.c * m.f - m.d * m.e) * inv,
    f: (m.b * m.e - m.a * m.f) * inv,
  };
}

/** "matrix(a,b,c,d,e,f)" suitable for an SVG `transform` attribute. */
export function matrixToSvg(m: Matrix2D): string {
  return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
}

export function transformToSvg(t: StaffTransform): string {
  return matrixToSvg(transformToMatrix(t));
}
