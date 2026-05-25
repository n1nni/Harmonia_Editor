export interface Vec2 {
  x: number;
  y: number;
}

export interface Bbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function bboxWidth(b: Bbox): number {
  return b.x2 - b.x1;
}

export function bboxHeight(b: Bbox): number {
  return b.y2 - b.y1;
}

export function bboxCenter(b: Bbox): Vec2 {
  return { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 };
}

export function bboxUnion(a: Bbox, b: Bbox): Bbox {
  return {
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
    x2: Math.max(a.x2, b.x2),
    y2: Math.max(a.y2, b.y2),
  };
}
