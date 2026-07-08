import type { FrameStyle } from '../types';
import { FRAME_GAP, FRAME_LENS_WIDTH } from '../lib/frameGeometry';

interface GlassesIconProps {
  style: FrameStyle;
  color: string;
  accentColor: string;
  className?: string;
}

interface LensShape {
  width: number;
  height: number;
  rx: number;
  fillOnly?: boolean;
  browBar?: boolean;
  catEye?: boolean;
  aviator?: boolean;
}

const SHAPES: Record<FrameStyle, LensShape> = {
  round: { width: FRAME_LENS_WIDTH.round, height: 60, rx: 30 },
  square: { width: FRAME_LENS_WIDTH.square, height: 50, rx: 5 },
  rectangle: { width: FRAME_LENS_WIDTH.rectangle, height: 38, rx: 6 },
  'cat-eye': { width: FRAME_LENS_WIDTH['cat-eye'], height: 46, rx: 10, catEye: true },
  aviator: { width: FRAME_LENS_WIDTH.aviator, height: 56, rx: 14, aviator: true },
  browline: { width: FRAME_LENS_WIDTH.browline, height: 48, rx: 5, browBar: true },
  rimless: { width: FRAME_LENS_WIDTH.rimless, height: 50, rx: 8, fillOnly: false },
  oversized: { width: FRAME_LENS_WIDTH.oversized, height: 64, rx: 20 },
};

function Lens({ shape, color, mirror }: { shape: LensShape; color: string; mirror?: boolean }) {
  const { width, height, rx } = shape;
  const x = -width / 2;
  const y = -height / 2;

  if (shape.catEye) {
    // Rounded rect with an upswept outer-top corner.
    const outerX = mirror ? x : x + width;
    const sweepY = y - height * 0.18;
    return (
      <path
        d={`M ${x} ${y + rx}
            Q ${x} ${y} ${x + rx} ${y}
            L ${outerX * 0.35 + (x + width) * 0.65} ${sweepY}
            L ${x + width} ${y + height * 0.12}
            L ${x + width} ${y + height - rx}
            Q ${x + width} ${y + height} ${x + width - rx} ${y + height}
            L ${x + rx} ${y + height}
            Q ${x} ${y + height} ${x} ${y + height - rx}
            Z`}
        fill={color}
        opacity={0.9}
      />
    );
  }

  if (shape.aviator) {
    return (
      <path
        d={`M ${x + width * 0.5} ${y}
            C ${x + width * 0.95} ${y} ${x + width} ${y + height * 0.25} ${x + width} ${y + height * 0.55}
            C ${x + width} ${y + height * 0.9} ${x + width * 0.7} ${y + height} ${x + width * 0.5} ${y + height}
            C ${x + width * 0.3} ${y + height} ${x} ${y + height * 0.9} ${x} ${y + height * 0.55}
            C ${x} ${y + height * 0.25} ${x + width * 0.05} ${y} ${x + width * 0.5} ${y}
            Z`}
        fill={color}
        opacity={0.9}
      />
    );
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={shape.fillOnly === false ? 'none' : color}
      stroke={color}
      strokeWidth={shape.fillOnly === false ? 5 : 0}
      opacity={0.9}
    />
  );
}

export function GlassesIcon({ style, color, accentColor, className }: GlassesIconProps) {
  const shape = SHAPES[style];
  const gap = FRAME_GAP;
  const cx = shape.width / 2 + gap / 2;

  return (
    <svg viewBox="-100 -60 200 120" className={className} aria-hidden="true">
      {/* bridge */}
      <path
        d={`M ${-gap / 2} ${-shape.height * 0.15} Q 0 ${-shape.height * 0.28} ${gap / 2} ${-shape.height * 0.15}`}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      {/* temples */}
      <line
        x1={-cx - shape.width / 2}
        y1={-shape.height * 0.1}
        x2={-cx - shape.width / 2 - 14}
        y2={-shape.height * 0.28}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={cx + shape.width / 2}
        y1={-shape.height * 0.1}
        x2={cx + shape.width / 2 + 14}
        y2={-shape.height * 0.28}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />

      <g transform={`translate(${-cx}, 0)`}>
        <Lens shape={shape} color={color} mirror />
      </g>
      <g transform={`translate(${cx}, 0) scale(-1, 1)`}>
        <Lens shape={shape} color={color} />
      </g>

      {shape.browBar && (
        <>
          <rect x={-cx - shape.width / 2} y={-shape.height / 2 - 8} width={shape.width} height={7} rx={3} fill={accentColor} />
          <rect x={cx - shape.width / 2} y={-shape.height / 2 - 8} width={shape.width} height={7} rx={3} fill={accentColor} />
        </>
      )}
    </svg>
  );
}
