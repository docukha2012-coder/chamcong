import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  Wifi, 
  ShieldAlert, 
  RefreshCw, 
  Building2, 
  Smartphone, 
  ArrowRight, 
  Sparkles,
  QrCode as QrIcon
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  onNavigateToMobile: () => void;
}

export const QRPosterGenerator: React.FC<Props> = ({ onNavigateToMobile }) => {
  const [companyName, setCompanyName] = useState<string>('CÔNG TY CỔ PHẦN THƯƠNG MẠI & KHO VẬN ASIA');
  const [locationName, setLocationName] = useState<string>('ĐIỂM CHẤM CÔNG KHO TỔNG - CỔNG CHÍNH 1');
  const [serverHost, setServerHost] = useState<string>('192.168.1.100:8000');
  const [useCurrentHost, setUseCurrentHost] = useState<boolean>(true);
  const [dailyToken, setDailyToken] = useState<string>('SEC-20261019-LAN');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const posterRef = useRef<HTMLDivElement>(null);

  const rules = StorageService.getRules();

  // Compute final QR target link
  const computedUrl = useCurrentHost && typeof window !== 'undefined'
    ? `${window.location.origin}?token=${dailyToken}&loc=${encodeURIComponent(locationName)}`
    : `http://${serverHost}/checkin?token=${dailyToken}&loc=${encodeURIComponent(locationName)}`;

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(computedUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [computedUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Cham_Cong_${locationName.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const generateNewToken = () => {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setDailyToken(`SEC-${today}-${rand}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar (Hidden in Print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrIcon className="w-5 h-5 text-emerald-400" />
              Tạo &amp; In Mã QR Code Dán Tường (Khổ A4/A5)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tùy chỉnh thông tin công ty, vị trí dán bảng và xuất bản poster vật lý chuẩn mực.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In Poster Ngay (Ctrl+P)</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Tải Ảnh PNG</span>
            </button>
          </div>
        </div>

        {/* Customization Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Tên Công Ty / Đơn Vị:</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Vị Trí Dán Poster:</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">Mã Token Động (Chống Gian Lận):</label>
              <button
                type="button"
                onClick={generateNewToken}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <RefreshCw className="w-3 h-3" /> Đổi mới
              </button>
            </div>
            <input
              type="text"
              value={dailyToken}
              onChange={(e) => setDailyToken(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-emerald-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleCurrentHost"
                checked={useCurrentHost}
                onChange={(e) => setUseCurrentHost(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
              />
              <label htmlFor="toggleCurrentHost" className="text-slate-300 cursor-pointer">
                Sử dụng URL trực tiếp của ứng dụng này để nhân viên quét mở ngay trên điện thoại
              </label>
            </div>

            {!useCurrentHost && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">IP LAN:</span>
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="192.168.1.100:8000"
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white w-40"
                />
              </div>
            )}

            <button
              onClick={onNavigateToMobile}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>Thử nghiệm giao diện Chấm Công</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Poster Container (Standard A4 / A5 Ratio) */}
      <div className="flex justify-center">
        <div 
          ref={posterRef}
          className="print:w-full print:max-w-none print:shadow-none print:m-0 print:border-none w-full max-w-2xl bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-slate-900 relative overflow-hidden font-sans"
        >
          {/* Decorative Corner Badges */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-emerald-600 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-emerald-600 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-emerald-600 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-emerald-600 rounded-br-xl pointer-events-none" />

          {/* Company Brand Header */}
          <div className="text-center pb-6 border-b-2 border-slate-200">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
              <Building2 className="w-4 h-4" />
              <span>{companyName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
              BẢNG QUÉT MÃ CHẤM CÔNG NỘI BỘ
            </h1>
            <div className="mt-2 inline-block px-4 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm">
              {locationName}
            </div>
          </div>

          {/* QR Code Centerpiece */}
          <div className="my-8 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-white border-4 border-dashed border-slate-300 rounded-3xl shadow-lg relative group">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code Chấm Công" 
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto" 
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  Đang khởi tạo QR...
                </div>
              )}

              {/* Target Scan URL caption */}
              <div className="mt-2 text-[11px] font-mono text-slate-500 break-all max-w-xs">
                {computedUrl}
              </div>
            </div>

            {/* WiFi Requirement Ribbon */}
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm font-bold shadow-sm">
              <Wifi className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>YÊU CẦU KẾT NỐI WIFI: <span className="underline">{rules.allowedWifiSSID}</span></span>
            </div>
          </div>

          {/* 3 Steps Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mx-auto mb-2">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Kết Nối WiFi</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Bật WiFi trên điện thoại &amp; kết nối vào mạng công ty.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mx-auto mb-2">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Quét Mã QR</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Mở camera điện thoại quét mã QR ở trên để vào Web App.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mx-auto mb-2">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Bấm Vào/Tan Ca</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Nhập Mã NV và chọn Check-in / Check-out để hoàn tất.
              </p>
            </div>
          </div>

          {/* Security & Anti-Fraud Notice */}
          <div className="mt-6 pt-4 border-t-2 border-slate-200 flex items-start gap-3 text-left">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900 font-bold block mb-0.5">QUY ĐỊNH BẢO MẬT &amp; CHỐNG GIAN LẬN:</strong>
              Hệ thống chỉ chấp nhận lượt chấm công từ dải IP nội bộ mạng LAN của công ty ({rules.allowedSubnet}*). Thiết bị sử dụng 4G hoặc WiFi ngoài sẽ bị máy chủ tự động chặn truy cập. Nghiêm cấm hành vi chụp ảnh mã QR gửi ra ngoài để chấm công hộ.
            </div>
          </div>

          {/* Footer Time Rules */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Khung giờ đúng giờ: 06:00:00 - 08:15:00</span>
            <span>Khung giờ đi trễ: 08:15:01 - 08:30:00</span>
            <span>Đồng bộ Google Sheets thời gian thực</span>
          </div>
        </div>
      </div>
    </div>
  );
};
