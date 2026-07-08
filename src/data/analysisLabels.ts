import type { EyeSpacing, NoseBridgeWidth } from '../types';

export const EYE_SPACING_LABEL: Record<EyeSpacing, string> = {
  'close-set': 'Hơi gần nhau',
  average: 'Trung bình',
  'wide-set': 'Hơi xa nhau',
};

export const NOSE_BRIDGE_LABEL: Record<NoseBridgeWidth, string> = {
  narrow: 'Thanh mảnh',
  average: 'Trung bình',
  wide: 'Rộng',
};
