import type { FrameStyle } from '../types';

/** Per-shape lens width, in the icon's local SVG units (see GLASSES_VIEWBOX). */
export const FRAME_LENS_WIDTH: Record<FrameStyle, number> = {
  round: 60,
  square: 56,
  rectangle: 66,
  'cat-eye': 58,
  aviator: 58,
  browline: 56,
  rimless: 58,
  oversized: 74,
};

/** Gap between the two lenses, in the same local units. */
export const FRAME_GAP = 18;

/** GlassesIcon's fixed viewBox — every shape is drawn inside this same box. */
export const GLASSES_VIEWBOX = { width: 200, height: 120 };

/**
 * Real "temple to temple" lens span (local units) for a shape — narrower
 * than the full viewBox width, which also leaves room for the temple arms
 * to angle outward. Used to scale a rendered icon so its lens span matches
 * a real-world frame width (mm) rather than stretching the whole viewBox
 * (which would render different shapes at different physical sizes for the
 * same nominal frame width).
 */
export function getFrameSpan(style: FrameStyle): number {
  return FRAME_LENS_WIDTH[style] * 2 + FRAME_GAP;
}
