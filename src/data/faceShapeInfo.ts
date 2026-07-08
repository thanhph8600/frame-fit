import type { FaceShape } from '../types';

export const FACE_SHAPE_INFO: Record<
  FaceShape,
  { label: string; description: string }
> = {
  oval: {
    label: 'Trái xoan',
    description:
      'Tỉ lệ cân đối, hầu hết các kiểu gọng đều hợp. Ưu tiên gọng vuông, chữ nhật hoặc phi công để tạo điểm nhấn góc cạnh.',
  },
  round: {
    label: 'Tròn',
    description:
      'Đường nét mềm mại, chiều dài và chiều rộng gần bằng nhau. Nên chọn gọng vuông hoặc chữ nhật để tạo góc cạnh, cân bằng khuôn mặt.',
  },
  square: {
    label: 'Vuông',
    description:
      'Hàm và trán rộng, góc hàm rõ. Nên chọn gọng tròn hoặc oval để làm mềm các đường nét góc cạnh.',
  },
  heart: {
    label: 'Trái tim',
    description:
      'Trán rộng, cằm nhỏ nhọn. Nên chọn gọng oval, cat-eye nhẹ hoặc không viền dưới để cân bằng phần dưới khuôn mặt.',
  },
  oblong: {
    label: 'Dài',
    description:
      'Khuôn mặt dài hơn rộng. Nên chọn gọng oversized hoặc gọng có chiều ngang rộng, họa tiết ở gọng để tạo cảm giác ngắn lại.',
  },
  diamond: {
    label: 'Kim cương',
    description:
      'Gò má là điểm rộng nhất, trán và hàm hẹp hơn. Nên chọn gọng cat-eye hoặc oval để làm nổi bật gò má và làm mềm góc cạnh.',
  },
  triangle: {
    label: 'Tam giác',
    description:
      'Hàm rộng hơn trán. Nên chọn gọng browline hoặc cat-eye để tạo điểm nhấn ở phần trên, cân bằng với phần hàm.',
  },
};
