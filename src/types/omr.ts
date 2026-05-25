/**
 * Raw shape of the OMR service response.
 * Coordinates are in pixel-space of the rectified (perspective-corrected) image
 * carried in `rectified_image_b64`. Origin is top-left.
 */

export type SymbolClass =
  | 'noteheadBlack'
  | 'noteheadHalf'
  | 'clefG'
  | 'clefF'
  | 'clef8'
  | 'keySharp'
  | 'accidentalSharp'
  | 'augmentationDot'
  | 'slur'
  | 'beam'
  | 'restDoubleWhole';

export interface Detection {
  id: string;
  class: SymbolClass;
  conf: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  part_id: string;
  staff_in_part: number;
}

export interface RawStaff {
  part_id: string;
  staff_in_part: number;
  detections: Detection[];
  line_positions: number[];
  line_spacing: number;
  top_y: number;
  bot_y: number;
  crop_x1: number;
  crop_y1: number;
  total_detections?: number;
}

export interface OmrResponse {
  detections: RawStaff[];
  job_id: string;
  rectified_image_b64: string;
  rectified_image_mime: string;
  xml: string;
}
