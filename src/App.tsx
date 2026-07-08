import { useState } from 'react';
import { PhotoInput } from './components/PhotoInput';
import { GlassesCard } from './components/GlassesCard';
import { FaceGlassesOverlay } from './components/FaceGlassesOverlay';
import { detectFaceLandmarks } from './lib/faceLandmarker';
import { analyzeFace } from './lib/faceAnalysis';
import { recommendGlasses } from './lib/recommend';
import { FACE_SHAPE_INFO } from './data/faceShapeInfo';
import { EYE_SPACING_LABEL, NOSE_BRIDGE_LABEL } from './data/analysisLabels';
import type { FaceAnalysis } from './types';

type Status = 'idle' | 'processing' | 'done' | 'error';

function formatMm(value: number): string {
  return `${Math.round(value)}mm`;
}

function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function handleImageSelected(image: HTMLImageElement) {
    setImageSrc(image.src);
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    setStatus('processing');
    setErrorMsg(null);
    try {
      const landmarks = await detectFaceLandmarks(image);
      if (!landmarks) {
        setStatus('error');
        setErrorMsg(
          'Không tìm thấy khuôn mặt trong ảnh. Hãy thử ảnh có khuôn mặt rõ nét, nhìn thẳng, đủ ánh sáng.',
        );
        return;
      }
      const result = analyzeFace(landmarks, image.naturalWidth, image.naturalHeight);
      setAnalysis(result);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg('Đã có lỗi khi phân tích ảnh. Vui lòng thử lại.');
    }
  }

  function reset() {
    setStatus('idle');
    setImageSrc(null);
    setImageSize(null);
    setAnalysis(null);
    setErrorMsg(null);
    setSelectedId(null);
  }

  const recommendation = analysis ? recommendGlasses(analysis) : null;
  const m = analysis?.measurementsMm;
  const selectedItem = recommendation
    ? ([...recommendation.recommended, ...recommendation.others].find(
        (item) => item.id === selectedId,
      ) ?? recommendation.recommended[0] ?? recommendation.others[0] ?? null)
    : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Tìm mắt kính hợp khuôn mặt
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Chụp hoặc tải ảnh khuôn mặt để nhận gợi ý mẫu gọng kính phù hợp nhất.
          </p>
        </header>

        {status !== 'processing' && !imageSrc && (
          <div className="flex flex-col items-center gap-4">
            <PhotoInput onImageSelected={handleImageSelected} />
            <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm text-center">
              Để kết quả chính xác và ổn định nhất: nhìn thẳng vào camera, giữ đầu không nghiêng,
              đủ ánh sáng trên mặt.
            </p>
          </div>
        )}

        {imageSrc && status !== 'done' && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={imageSrc}
              alt="Ảnh đã chọn"
              className="w-40 h-40 object-cover rounded-full border border-neutral-200 dark:border-neutral-800"
            />
            <button
              onClick={reset}
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Chọn ảnh khác
            </button>
          </div>
        )}

        {status === 'processing' && (
          <p className="text-center mt-6 text-neutral-500 dark:text-neutral-400">
            Đang phân tích khuôn mặt... (lần đầu có thể mất vài giây để tải mô hình)
          </p>
        )}

        {status === 'error' && errorMsg && (
          <p className="text-center mt-6 text-red-500 max-w-md mx-auto">{errorMsg}</p>
        )}

        {status === 'done' && analysis && recommendation && imageSrc && imageSize && (
          <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-8 lg:items-start">
            <div className="lg:sticky lg:top-6 flex flex-col items-center gap-3 mb-8 lg:mb-0">
              <FaceGlassesOverlay
                imageSrc={imageSrc}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                fit={analysis.fit}
                selected={selectedItem}
                className="w-full max-w-sm lg:max-w-none"
              />
              <button
                onClick={reset}
                className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                Chọn ảnh khác
              </button>
            </div>

            <div>
              <div className="text-center lg:text-left mb-6">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Dáng mặt của bạn</p>
                <h2 className="text-2xl font-semibold mt-1">
                  {FACE_SHAPE_INFO[analysis.faceShape].label}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-300 mt-2 max-w-lg lg:max-w-none mx-auto lg:mx-0">
                  {FACE_SHAPE_INFO[analysis.faceShape].description}
                </p>
                {analysis.alternateFaceShape && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 max-w-lg lg:max-w-none mx-auto lg:mx-0">
                    Khuôn mặt bạn nằm gần ranh giới giữa dáng{' '}
                    {FACE_SHAPE_INFO[analysis.faceShape].label.toLowerCase()} và dáng{' '}
                    {FACE_SHAPE_INFO[analysis.alternateFaceShape].label.toLowerCase()} — ảnh khác
                    góc chụp có thể cho kết quả nghiêng về dáng còn lại. Gợi ý bên dưới đã cân nhắc
                    cả hai.
                  </p>
                )}
              </div>

              <h3 className="text-lg font-medium mb-4">Gợi ý phù hợp nhất</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {recommendation.recommended.map((item) => (
                  <GlassesCard
                    key={item.id}
                    item={item}
                    highlighted
                    selected={item.id === selectedItem?.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>

              <h3 className="text-lg font-medium mb-4 text-neutral-500 dark:text-neutral-400">
                Các mẫu khác
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {recommendation.others.map((item) => (
                  <GlassesCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedItem?.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>

              <div className="max-w-lg lg:max-w-none mx-auto lg:mx-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3 text-center">
                  Số đo chi tiết
                </p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Khoảng cách hai mắt
                  </span>
                  <span className="text-right font-medium">
                    {EYE_SPACING_LABEL[analysis.eyeSpacing]}
                    {m ? ` (${formatMm(m.interpupillaryDistance)})` : ''}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">Sống mũi</span>
                  <span className="text-right font-medium">
                    {NOSE_BRIDGE_LABEL[analysis.noseBridgeWidth]}
                    {m ? ` (${formatMm(m.noseWidth)})` : ''}
                  </span>
                  {m && (
                    <>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Chiều rộng khuôn mặt
                      </span>
                      <span className="text-right font-medium">{formatMm(m.faceWidth)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Chiều dài khuôn mặt
                      </span>
                      <span className="text-right font-medium">{formatMm(m.faceLength)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Chiều rộng hàm
                      </span>
                      <span className="text-right font-medium">{formatMm(m.jawWidth)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Chiều rộng miệng
                      </span>
                      <span className="text-right font-medium">{formatMm(m.mouthWidth)}</span>
                    </>
                  )}
                  {analysis.recommendedFrameWidthMm && (
                    <>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Cỡ gọng nên chọn
                      </span>
                      <span className="text-right font-medium">
                        {formatMm(analysis.recommendedFrameWidthMm[0])} –{' '}
                        {formatMm(analysis.recommendedFrameWidthMm[1])}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-3 text-center">
                  Số đo ước lượng từ ảnh, mang tính tham khảo, không thay thế đo đạc trực tiếp.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
