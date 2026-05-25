/**
 * Affine 2x3 transforms.
 *
 *  [ a c e ]   [ x ]   [ a*x + c*y + e ]
 *  [ b d f ] * [ y ] = [ b*x + d*y + f ]
 *  [ 0 0 1 ]   [ 1 ]   [        1      ]
 *
 * Matrices compose left-to-right: `compose(M1, M2)` means "apply M1 first, then M2".
 * This module is the algebraic substrate for image<->viewport mapping and
 * the future homography-rectification step.
 */

import type { Vec2 } from './bbox';

export type Transform2D = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export const identity: Transform2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function translate(tx: number, ty: number): Transform2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function scale(sx: number, sy: number = sx): Transform2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function multiply(m1: Transform2D, m2: Transform2D): Transform2D {
  // (m2 ∘ m1)(p) = m2(m1(p))
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export function compose(...ms: Transform2D[]): Transform2D {
  return ms.reduce((acc, m) => multiply(acc, m), identity);
}

export function applyT(m: Transform2D, p: Vec2): Vec2 {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function invertT(m: Transform2D): Transform2D {
  const det = m.a * m.d - m.b * m.c;
  if (det === 0) throw new Error('Transform2D not invertible (singular)');
  const invDet = 1 / det;
  return {
    a: m.d * invDet,
    b: -m.b * invDet,
    c: -m.c * invDet,
    d: m.a * invDet,
    e: (m.c * m.f - m.d * m.e) * invDet,
    f: (m.b * m.e - m.a * m.f) * invDet,
  };
}

/**
 * Map image-space → viewport-space (CSS pixels in the canvas div).
 * viewport = pan + (image · fitScale · zoom)
 */
export function imageToViewport(
  p: Vec2,
  fitScale: number,
  zoom: number,
  pan: Vec2,
): Vec2 {
  const s = fitScale * zoom;
  return { x: p.x * s + pan.x, y: p.y * s + pan.y };
}

export function viewportToImage(
  p: Vec2,
  fitScale: number,
  zoom: number,
  pan: Vec2,
): Vec2 {
  const s = fitScale * zoom;
  return { x: (p.x - pan.x) / s, y: (p.y - pan.y) / s };
}
