import { useEffect, useRef, useState } from 'react';
import type { FaceFitAnchor, ScoredGlassesItem } from '../types';
import { GLASSES_VIEWBOX, getFrameSpan } from '../lib/frameGeometry';
import { GlassesIcon } from './GlassesIcon';

interface FaceGlassesOverlayProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  fit: FaceFitAnchor;
  selected: ScoredGlassesItem | null;
  className?: string;
}

export function FaceGlassesOverlay({
  imageSrc,
  imageWidth,
  imageHeight,
  fit,
  selected,
  className,
}: FaceGlassesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const overlayStyle =
    selected && size.width > 0
      ? (() => {
          const frameWidthPx = ((selected.frameWidthMm * fit.pctPerMm) / 100) * size.width;
          const scale = frameWidthPx / getFrameSpan(selected.style);
          return {
            left: (fit.centerXPct / 100) * size.width,
            top: (fit.centerYPct / 100) * size.height,
            width: scale * GLASSES_VIEWBOX.width,
            height: scale * GLASSES_VIEWBOX.height,
            transform: `translate(-50%, -50%) rotate(${fit.rotationDeg}deg)`,
          };
        })()
      : null;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900 ${className ?? ''}`}
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <img
        src={imageSrc}
        alt="Ảnh khuôn mặt của bạn"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {overlayStyle && selected && (
        <div className="absolute pointer-events-none" style={overlayStyle}>
          <GlassesIcon
            style={selected.style}
            color={selected.color}
            accentColor={selected.accentColor}
            className="w-full h-full drop-shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
