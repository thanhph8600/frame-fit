import type { EyeSpacing, FaceAnalysis, FaceShape, NoseBridgeWidth } from '../types';

interface RawPoint {
  x: number;
  y: number;
  z?: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
}

/**
 * MediaPipe Face Landmarker indices used below (community-standard face mesh
 * topology, 468 face points + 10 iris points = 478 total). Two landmark
 * pairs are averaged per measurement (forehead/cheek/jaw) to reduce noise
 * from any single mis-tracked point.
 */
const LM = {
  foreheadTop: 10,
  chin: 152,
  cheekL: 234,
  cheekR: 454,
  cheekL2: 127,
  cheekR2: 356,
  jawL: 172,
  jawR: 397,
  jawL2: 136,
  jawR2: 365,
  foreheadL: 21,
  foreheadR: 251,
  foreheadL2: 54,
  foreheadR2: 284,
  eyeOuterL: 33,
  eyeOuterR: 263,
  eyeInnerL: 133,
  eyeInnerR: 362,
  irisCenterL: 468,
  irisRingL: [469, 470, 471, 472],
  irisCenterR: 473,
  irisRingR: [474, 475, 476, 477],
  noseAlaL: 129,
  noseAlaR: 358,
  mouthL: 61,
  mouthR: 291,
};

// Average adult horizontal iris diameter — a standard calibration reference
// in face-photogrammetry tools since it varies little between adults (unlike
// interpupillary distance, which is itself one of the things we're measuring).
const IRIS_DIAMETER_MM = 11.7;

// Fallback bizygomatic-width assumption used only to scale/place the glasses
// overlay when iris landmarks aren't available for precise mm calibration
// (measurementsMm stays null in that case — this is a rougher approximation
// good enough for visual placement, not for the reported measurements).
const AVERAGE_FACE_WIDTH_MM = 140;

// A measured shape is only reported as "borderline" (with an alternate
// suggestion) when the runner-up's score comes within this fraction of the
// winner's — otherwise a clear winner is shown alone.
const BORDERLINE_MARGIN = 0.12;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function angleAt(vertex: Point, a: Point, b: Point): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  const cos = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

function irisDiameterPx(points: Point[], center: number, ring: number[]): number {
  const c = points[center];
  const avgRadius = ring.reduce((sum, i) => sum + dist(c, points[i]), 0) / ring.length;
  return avgRadius * 2;
}

/**
 * Smooth 0→1 ramp centered on `threshold`, transitioning over `width`
 * (e.g. width = threshold * 0.15 for a ±15% relative transition zone).
 * Used instead of hard `>`/`<` comparisons so a measurement that's just
 * barely past a cutoff scores ~0.5 (ambiguous) rather than flipping an
 * entire classification the way a boolean branch would — the same small
 * amount of photo-to-photo measurement noise that used to flip the result
 * outright now only nudges the score.
 */
function gate(value: number, threshold: number, width: number, invert = false): number {
  const t = (value - (threshold - width / 2)) / width;
  const clamped = Math.min(1, Math.max(0, t));
  return invert ? 1 - clamped : clamped;
}

interface ShapeRatios {
  lengthToCheek: number;
  jawToCheek: number;
  foreheadToCheek: number;
  foreheadToJaw: number;
  jawAngle: number;
}

/**
 * Per-shape fit scores (0-1), derived from the same defining characteristics
 * as before but as smooth gates instead of nested hard-cutoff branches, so
 * near-boundary faces get comparable (not wildly different) scores across
 * repeated photos instead of flipping labels outright.
 */
function scoreShapes(r: ShapeRatios): Record<FaceShape, number> {
  const triangle = gate(r.jawToCheek, 1.05, 0.1) * gate(r.foreheadToJaw, 0.9, 0.15, true);
  // lengthToCheek thresholds (1.15/1.25/1.35/1.45) are only 0.10 apart, so
  // these gates use narrower (~0.08) transition bands than the others —
  // wider bands here would make a single measurement simultaneously
  // "borderline" against three unrelated shapes instead of its one real
  // neighbor.
  const heart = gate(r.foreheadToJaw, 1.15, 0.2) * gate(r.lengthToCheek, 1.25, 0.08);
  const diamond =
    gate(r.foreheadToCheek, 0.85, 0.1, true) *
    gate(r.jawToCheek, 0.85, 0.1, true) *
    gate(r.lengthToCheek, 1.35, 0.08, true);
  const oblong = gate(r.lengthToCheek, 1.45, 0.1);
  const roundOrSquareBase = gate(r.lengthToCheek, 1.15, 0.08, true) * gate(r.jawToCheek, 0.85, 0.1);
  const square = roundOrSquareBase * gate(r.jawAngle, 130, 20, true);
  const round = roundOrSquareBase * gate(r.jawAngle, 130, 20);

  const others = { triangle, heart, diamond, oblong, square, round };
  const oval = Math.max(0, 1 - Math.max(...Object.values(others)));

  return { ...others, oval };
}

/**
 * Classifies face shape and estimates real-world facial measurements from
 * MediaPipe Face Landmarker output.
 *
 * `imageWidth`/`imageHeight` (the source image's pixel dimensions) are
 * required to convert MediaPipe's per-axis normalized coordinates (0-1
 * relative to width and height independently) into a common pixel space —
 * skipping this step distorts every distance on non-square photos.
 *
 * Distances use x/y/z (not just x/y): MediaPipe's z is roughly on the same
 * scale as x, and including it makes measurements noticeably less sensitive
 * to head yaw/pitch (a slightly turned or tilted head foreshortens 2D-only
 * projected widths — this is the main reason the same person can measure
 * differently across two photos).
 *
 * This is a rule-based heuristic tuned against common styling-guide
 * descriptions and anthropometric averages, not a trained model or a
 * medical-grade measurement.
 */
export function analyzeFace(
  landmarks: RawPoint[],
  imageWidth: number,
  imageHeight: number,
): FaceAnalysis {
  const px: Point[] = landmarks.map((p) => ({
    x: p.x * imageWidth,
    y: p.y * imageHeight,
    z: (p.z ?? 0) * imageWidth,
  }));
  const p = (i: number) => px[i];

  const faceLengthPx = dist(p(LM.foreheadTop), p(LM.chin));
  const cheekWidthPx =
    (dist(p(LM.cheekL), p(LM.cheekR)) + dist(p(LM.cheekL2), p(LM.cheekR2))) / 2;
  const foreheadWidthPx =
    (dist(p(LM.foreheadL), p(LM.foreheadR)) + dist(p(LM.foreheadL2), p(LM.foreheadR2))) / 2;
  const jawWidthPx = (dist(p(LM.jawL), p(LM.jawR)) + dist(p(LM.jawL2), p(LM.jawR2))) / 2;

  const leftJawAngle = angleAt(p(LM.jawL), p(LM.cheekL), p(LM.chin));
  const rightJawAngle = angleAt(p(LM.jawR), p(LM.cheekR), p(LM.chin));
  const jawAngle = (leftJawAngle + rightJawAngle) / 2;

  const ratios: ShapeRatios = {
    lengthToCheek: faceLengthPx / cheekWidthPx,
    jawToCheek: jawWidthPx / cheekWidthPx,
    foreheadToCheek: foreheadWidthPx / cheekWidthPx,
    foreheadToJaw: foreheadWidthPx / jawWidthPx,
    jawAngle,
  };

  const scores = scoreShapes(ratios);
  const ranked = (Object.entries(scores) as [FaceShape, number][]).sort((a, b) => b[1] - a[1]);
  const faceShape = ranked[0][0];
  const [topScore, runnerUpScore] = [ranked[0][1], ranked[1][1]];
  const alternateFaceShape =
    topScore > 0 && topScore - runnerUpScore < BORDERLINE_MARGIN ? ranked[1][0] : null;

  const noseWidthPx = dist(p(LM.noseAlaL), p(LM.noseAlaR));
  const mouthWidthPx = dist(p(LM.mouthL), p(LM.mouthR));
  const eyeSpanPx = dist(p(LM.eyeOuterL), p(LM.eyeOuterR));

  const hasIris = landmarks.length >= 478;
  const ipdPx = hasIris ? dist(p(LM.irisCenterL), p(LM.irisCenterR)) : eyeSpanPx * 0.55;

  const eyeSpacingRatio = ipdPx / cheekWidthPx;
  let eyeSpacing: EyeSpacing = 'average';
  if (eyeSpacingRatio < 0.44) eyeSpacing = 'close-set';
  else if (eyeSpacingRatio > 0.5) eyeSpacing = 'wide-set';

  const noseWidthRatio = noseWidthPx / cheekWidthPx;
  let noseBridgeWidth: NoseBridgeWidth = 'average';
  if (noseWidthRatio < 0.23) noseBridgeWidth = 'narrow';
  else if (noseWidthRatio > 0.29) noseBridgeWidth = 'wide';

  let measurementsMm: FaceAnalysis['measurementsMm'] = null;
  let recommendedFrameWidthMm: FaceAnalysis['recommendedFrameWidthMm'] = null;
  // px-per-mm at this photo's scale, used to size the glasses overlay from a
  // catalog item's frameWidthMm; refined below when iris landmarks let us
  // calibrate precisely instead of relying on the average-width fallback.
  let pxPerMm = cheekWidthPx / AVERAGE_FACE_WIDTH_MM;

  if (hasIris) {
    const irisPxL = irisDiameterPx(px, LM.irisCenterL, LM.irisRingL);
    const irisPxR = irisDiameterPx(px, LM.irisCenterR, LM.irisRingR);
    pxPerMm = (irisPxL + irisPxR) / 2 / IRIS_DIAMETER_MM;
    const mmPerPx = 1 / pxPerMm;

    const faceWidthMm = cheekWidthPx * mmPerPx;
    measurementsMm = {
      faceWidth: faceWidthMm,
      faceLength: faceLengthPx * mmPerPx,
      jawWidth: jawWidthPx * mmPerPx,
      foreheadWidth: foreheadWidthPx * mmPerPx,
      interpupillaryDistance: ipdPx * mmPerPx,
      noseWidth: noseWidthPx * mmPerPx,
      mouthWidth: mouthWidthPx * mmPerPx,
    };
    recommendedFrameWidthMm = [faceWidthMm - 4, faceWidthMm + 4];
  }

  // Eye-line anchor for the glasses overlay: prefer iris centers (most
  // precise), falling back to eye-corner midpoints when iris landmarks
  // aren't available. Points are ordered by on-image x (not anatomical
  // L/R) so the rotation reflects actual visual head tilt regardless of
  // which side MediaPipe's own L/R naming corresponds to on screen.
  const eyeCenterA = hasIris
    ? p(LM.irisCenterL)
    : {
        x: (p(LM.eyeOuterL).x + p(LM.eyeInnerL).x) / 2,
        y: (p(LM.eyeOuterL).y + p(LM.eyeInnerL).y) / 2,
        z: 0,
      };
  const eyeCenterB = hasIris
    ? p(LM.irisCenterR)
    : {
        x: (p(LM.eyeOuterR).x + p(LM.eyeInnerR).x) / 2,
        y: (p(LM.eyeOuterR).y + p(LM.eyeInnerR).y) / 2,
        z: 0,
      };
  const [imgLeftEye, imgRightEye] =
    eyeCenterA.x <= eyeCenterB.x ? [eyeCenterA, eyeCenterB] : [eyeCenterB, eyeCenterA];
  const rotationDeg =
    (Math.atan2(imgRightEye.y - imgLeftEye.y, imgRightEye.x - imgLeftEye.x) * 180) / Math.PI;

  const fit: FaceAnalysis['fit'] = {
    centerXPct: ((imgLeftEye.x + imgRightEye.x) / 2 / imageWidth) * 100,
    centerYPct: ((imgLeftEye.y + imgRightEye.y) / 2 / imageHeight) * 100,
    rotationDeg,
    pctPerMm: (pxPerMm / imageWidth) * 100,
  };

  return {
    faceShape,
    alternateFaceShape,
    measurementsMm,
    eyeSpacing,
    noseBridgeWidth,
    recommendedFrameWidthMm,
    fit,
  };
}
