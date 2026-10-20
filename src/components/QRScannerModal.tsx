import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, Scan, Sparkles, Smartphone } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedUrl: string) => void;
}

export const QRScannerModal: React.FC<Props> = ({ isOpen, onClose, onScanSuccess }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Trình duyệt không hỗ trợ truy cập camera hoặc quyền bị chặn trong iframe.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Camera permission or availability error:', err);
      setCameraError('Không thể mở camera thiết bị (thường do chính sách bảo mật iframe hoặc không có camera). Bạn có thể dùng tính năng "Mô Phỏng Quét QR Ngay" bên dưới!');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulateScan = (loc = 'Kho Tổng - Cổng 1') => {
    stopCamera();
    onScanSuccess(`http://192.168.1.100:8000/checkin?token=SEC-20261019-LAN&loc=${encodeURIComponent(loc)}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Quét Mã QR Chấm Công</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black h-72 flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="text-center p-6 text-slate-400 space-y-2">
              <Scan className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
              {cameraError ? (
                <p className="text-xs text-rose-300 leading-relaxed max-w-xs mx-auto">
                  {cameraError}
                </p>
              ) : (
                <p className="text-xs">Đang kết nối camera điện thoại...</p>
              )}
            </div>
          )}

          {/* Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400" />

              {/* Animated scan line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-scan" />
            </div>
          </div>
        </div>

        {/* Simulation Shortcut Options */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div className="text-center">
            <span className="text-xs font-semibold text-slate-300 block mb-1">
              Thử Nghiệm Nhanh Luồng Quét QR:
            </span>
            <p className="text-[11px] text-slate-400">
              Nhân viên quét mã tại cửa kho hoặc văn phòng để mở link chấm công nội bộ.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSimulateScan('Kho Tổng - Cổng 1')}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Quét QR Kho Tổng</span>
            </button>

            <button
              onClick={() => handleSimulateScan('Văn Phòng Tầng 2')}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Quét QR Văn Phòng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
