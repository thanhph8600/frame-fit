import { useEffect, useRef, useState } from 'react';

interface PhotoInputProps {
  onImageSelected: (image: HTMLImageElement) => void;
  disabled?: boolean;
}

export function PhotoInput({ onImageSelected, disabled }: PhotoInputProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      // videoRef isn't mounted until after this state update flushes.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError('Không thể truy cập camera. Hãy cho phép quyền camera hoặc tải ảnh lên thay thế.');
    }
  }

  function loadImageFromSrc(src: string) {
    const img = new Image();
    img.onload = () => onImageSelected(img);
    img.src = src;
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    stopCamera();
    loadImageFromSrc(dataUrl);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') loadImageFromSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  if (cameraActive) {
    return (
      <div className="flex flex-col items-center gap-3">
        <video
          ref={videoRef}
          className="rounded-xl w-full max-w-sm scale-x-[-1] bg-black"
          muted
          playsInline
        />
        <div className="flex gap-3">
          <button
            onClick={capturePhoto}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
          >
            Chụp ảnh
          </button>
          <button
            onClick={stopCamera}
            className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        <button
          onClick={startCamera}
          disabled={disabled}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          Dùng Camera
        </button>
        <label className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
          Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-500 max-w-sm text-center">{error}</p>}
    </div>
  );
}
