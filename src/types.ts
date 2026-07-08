export type FaceShape =
  | 'oval'
  | 'round'
  | 'square'
  | 'heart'
  | 'oblong'
  | 'diamond'
  | 'triangle';

export type FrameStyle =
  | 'round'
  | 'square'
  | 'rectangle'
  | 'cat-eye'
  | 'aviator'
  | 'browline'
  | 'rimless'
  | 'oversized';

export type EyeSpacing = 'close-set' | 'average' | 'wide-set';
export type NoseBridgeWidth = 'narrow' | 'average' | 'wide';

export interface FaceMeasurementsMm {
  faceWidth: number;
  faceLength: number;
  jawWidth: number;
  foreheadWidth: number;
  interpupillaryDistance: number;
  noseWidth: number;
  mouthWidth: number;
}

export interface FaceAnalysis {
  faceShape: FaceShape;
  /**
   * Set when the measured face sits close to the boundary between two
   * shapes (e.g. oval/heart) — the runner-up is close enough that a
   * different photo of the same person could plausibly classify as this
   * shape instead. `recommendGlasses` gives it partial weight so the
   * recommended list doesn't swing wildly if the primary label flips
   * between photos.
   */
  alternateFaceShape: FaceShape | null;
  /** null when iris landmarks aren't available to calibrate a real-world scale. */
  measurementsMm: FaceMeasurementsMm | null;
  eyeSpacing: EyeSpacing;
  noseBridgeWidth: NoseBridgeWidth;
  /** Suggested total frame width range, derived from measured face width. */
  recommendedFrameWidthMm: [number, number] | null;
}

export interface GlassesItem {
  id: string;
  name: string;
  style: FrameStyle;
  color: string;
  accentColor: string;
  description: string;
  suitableFaceShapes: FaceShape[];
  /** Typical total frame width in mm (temple to temple), for sizing fit. */
  frameWidthMm: number;
  /** Typical nose bridge width in mm. */
  bridgeMm: number;
  /** Bridge/temple detailing bold enough to visually pull wide-set eyes closer. */
  goodForWideSetEyes: boolean;
  /** Thin or rimless bridge that visually widens close-set eyes. */
  goodForCloseSetEyes: boolean;
  /** Has adjustable/built-up nose pads suited to a low or narrow nose bridge. */
  lowBridgeFit: boolean;
}

export interface ScoredGlassesItem extends GlassesItem {
  score: number;
  reasons: string[];
}
