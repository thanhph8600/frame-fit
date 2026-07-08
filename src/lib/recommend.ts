import { GLASSES } from '../data/glasses';
import { FACE_SHAPE_INFO } from '../data/faceShapeInfo';
import type { FaceAnalysis, ScoredGlassesItem } from '../types';

export interface RecommendationResult {
  recommended: ScoredGlassesItem[];
  others: ScoredGlassesItem[];
}

const FACE_SHAPE_MATCH_SCORE = 3;
const ALTERNATE_FACE_SHAPE_MATCH_SCORE = 1.5;
const FRAME_WIDTH_FIT_SCORE = 2;
const EYE_SPACING_FIT_SCORE = 1;
const BRIDGE_FIT_SCORE = 1;
const RECOMMENDED_THRESHOLD = 3;

export function recommendGlasses(analysis: FaceAnalysis): RecommendationResult {
  const scored: ScoredGlassesItem[] = GLASSES.map((item) => {
    let score = 0;
    const reasons: string[] = [];

    if (item.suitableFaceShapes.includes(analysis.faceShape)) {
      score += FACE_SHAPE_MATCH_SCORE;
      reasons.push(`Hợp dáng mặt ${FACE_SHAPE_INFO[analysis.faceShape].label.toLowerCase()}`);
    } else if (
      analysis.alternateFaceShape &&
      item.suitableFaceShapes.includes(analysis.alternateFaceShape)
    ) {
      // Face sits near a shape boundary — give partial credit so the
      // recommended list stays fairly stable even if the primary label
      // flips to the alternate shape on a different photo.
      score += ALTERNATE_FACE_SHAPE_MATCH_SCORE;
      reasons.push(
        `Cũng hợp dáng mặt ${FACE_SHAPE_INFO[analysis.alternateFaceShape].label.toLowerCase()} (khuôn mặt bạn gần ranh giới hai dáng)`,
      );
    }

    if (analysis.recommendedFrameWidthMm) {
      const [lo, hi] = analysis.recommendedFrameWidthMm;
      if (item.frameWidthMm >= lo && item.frameWidthMm <= hi) {
        score += FRAME_WIDTH_FIT_SCORE;
        reasons.push(`Cỡ gọng ~${item.frameWidthMm}mm khớp chiều rộng khuôn mặt`);
      }
    }

    if (analysis.eyeSpacing === 'wide-set' && item.goodForWideSetEyes) {
      score += EYE_SPACING_FIT_SCORE;
      reasons.push('Cầu gọng nổi bật, cân bằng mắt hơi xa nhau');
    } else if (analysis.eyeSpacing === 'close-set' && item.goodForCloseSetEyes) {
      score += EYE_SPACING_FIT_SCORE;
      reasons.push('Cầu gọng mảnh, giúp mắt trông xa nhau hơn');
    }

    if (analysis.noseBridgeWidth === 'narrow' && item.lowBridgeFit) {
      score += BRIDGE_FIT_SCORE;
      reasons.push('Đệm mũi điều chỉnh được, hợp sống mũi thanh mảnh');
    }

    return { ...item, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    recommended: scored.filter((item) => item.score >= RECOMMENDED_THRESHOLD),
    others: scored.filter((item) => item.score < RECOMMENDED_THRESHOLD),
  };
}
