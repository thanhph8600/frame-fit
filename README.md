# FrameFit

Phân tích ảnh khuôn mặt và gợi ý gọng kính phù hợp — hoàn toàn chạy trên trình duyệt (client-side only), không có backend hay máy chủ xử lý ảnh.

## Cách hoạt động

1. Chụp ảnh qua webcam hoặc tải ảnh khuôn mặt lên.
2. [MediaPipe FaceLandmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (chạy bằng WASM ngay trong trình duyệt) trích xuất tối đa 478 điểm mốc trên khuôn mặt.
3. Các điểm mốc được chuyển sang hệ tọa độ pixel thực và (khi có đủ điểm mống mắt) hiệu chỉnh ra đơn vị mm, sau đó dùng để phân loại dáng mặt (oval, round, square, heart, oblong, diamond, triangle) bằng thuật toán chấm điểm mờ (fuzzy scoring), tránh việc dáng mặt "nhảy" giữa hai lựa chọn chỉ vì sai số đo nhỏ.
4. Bộ máy gợi ý chấm điểm từng mẫu gọng kính trong danh mục demo dựa trên dáng mặt, kích thước khuôn mặt, khoảng cách hai mắt và độ rộng sống mũi, rồi trả về danh sách gọng kính phù hợp kèm lý do (tiếng Việt).
5. Gọng kính được vẽ bằng SVG tham số (không dùng ảnh sản phẩm thật).

## Bắt đầu

```bash
npm install
npm run dev       # chạy dev server (mặc định http://localhost:5173)
```

## Các lệnh khác

```bash
npm run build      # kiểm tra kiểu (tsc -b) rồi build production
npm run lint        # oxlint
npm run preview     # xem thử bản build production
```

## Công nghệ sử dụng

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (qua `@tailwindcss/vite`, không cần file cấu hình riêng)
- `@mediapipe/tasks-vision` — nhận diện điểm mốc khuôn mặt (WASM + model tải từ CDN lúc chạy)
- oxlint — linting

## Ghi chú

- Không có test suite/framework nào được cài đặt sẵn.
- Dữ liệu gọng kính trong `src/data/glasses.ts` là dữ liệu demo, không phải sản phẩm thật.
- Toàn bộ nội dung hiển thị cho người dùng đều bằng tiếng Việt.

Xem thêm chi tiết kiến trúc trong [CLAUDE.md](CLAUDE.md).
