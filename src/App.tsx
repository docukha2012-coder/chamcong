import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Code2, 
  Wifi, 
  WifiOff, 
  Scan, 
  HelpCircle,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { EmployeeMobileView } from './components/EmployeeMobileView';
import { QRPosterGenerator } from './components/QRPosterGenerator';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { AdminDashboard } from './components/AdminDashboard';
import { PythonPackageViewer } from './components/PythonPackageViewer';
import { QRScannerModal } from './components/QRScannerModal';
import { StorageService } from './services/storageService';

type ActiveTab = 'employee' | 'qr_poster' | 'sheets' | 'admin' | 'python_code';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('employee');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isOutsideLAN, setIsOutsideLAN] = useState<boolean>(StorageService.isSimulatedOutsideLAN());
  const [isOfflineSheets, setIsOfflineSheets] = useState<boolean>(StorageService.isSimulatedOffline());
  const [queueCount, setQueueCount] = useState<number>(StorageService.getSyncQueue().length);
  const [showPrdModal, setShowPrdModal] = useState<boolean>(false);

  useEffect(() => {
    const handleNetworkChange = () => {
      setIsOutsideLAN(StorageService.isSimulatedOutsideLAN());
    };
    const handleSyncChange = () => {
      setIsOfflineSheets(StorageService.isSimulatedOffline());
      setQueueCount(StorageService.getSyncQueue().length);
    };

    window.addEventListener('qr_attendance_network_change', handleNetworkChange);
    window.addEventListener('qr_attendance_sync_change', handleSyncChange);

    return () => {
      window.removeEventListener('qr_attendance_network_change', handleNetworkChange);
      window.removeEventListener('qr_attendance_sync_change', handleSyncChange);
    };
  }, []);

  const handleScanSuccess = (_scannedUrl: string) => {
    setActiveTab('employee');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Navigation Bar (Hidden during printing poster) */}
      <header className="print:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>QR Chấm Công Nội Bộ</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-semibold">
                  Google Sheets
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Hệ thống xác thực WiFi LAN &amp; Phân loại Đúng giờ / Đi trễ
              </p>
            </div>
          </div>

          {/* Quick Status Badges & Camera Scanner Action */}
          <div className="flex items-center gap-2">
            {/* Camera Scan Simulation Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Quét mã QR bằng Camera hoặc chạy thử"
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quét QR Camera</span>
            </button>

            {/* Network indicator pill */}
            <button
              onClick={() => {
                const next = !isOutsideLAN;
                StorageService.setSimulatedOutsideLAN(next);
                setIsOutsideLAN(next);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                isOutsideLAN
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
              title="Nhấn để đổi trạng thái mạng WiFi (Nội bộ vs Ngoài LAN)"
            >
              {isOutsideLAN ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden md:inline">{isOutsideLAN ? 'Ngoài LAN (4G)' : 'WiFi LAN 192.168.1.*'}</span>
            </button>

            {/* PRD Summary Button */}
            <button
              onClick={() => setShowPrdModal(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Xem Chi Tiết PRD Nghiệp Vụ"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1.5 border-t border-slate-800/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('employee')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'employee'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. Màn Hình Nhân Viên (Mobile Web App)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr_poster')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'qr_poster'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>2. Poster Mã QR Dán Tường (In A4)</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap relative ${
              activeTab === 'sheets'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. Google Sheets Trực Tiếp</span>
            {queueCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {queueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>4. Bảng Quản Trị &amp; Khung Giờ</span>
          </button>

          <button
            onClick={() => setActiveTab('python_code')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'python_code'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>5. Mã Nguồn Python / FastAPI (LAN Server)</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'employee' && (
          <EmployeeMobileView 
            onOpenAdmin={() => setActiveTab('admin')}
            onOpenQRPoster={() => setActiveTab('qr_poster')}
          />
        )}

        {activeTab === 'qr_poster' && (
          <QRPosterGenerator 
            onNavigateToMobile={() => setActiveTab('employee')}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsView />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard />
        )}

        {activeTab === 'python_code' && (
          <PythonPackageViewer />
        )}
      </main>

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* PRD Logic & Data Flow Modal */}
      {showPrdModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  Quy Trình Nghiệp Vụ PRD &amp; Cấu Trúc Dữ Liệu
                </h3>
              </div>
              <button
                onClick={() => setShowPrdModal(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 uppercase mb-1">1. Quy định Khung Giờ (Business Rules):</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong className="text-white">06:00:00 - 08:15:00:</strong> Trạng thái <strong>Đúng giờ (On Time)</strong>.</li>
                  <li><strong className="text-white">08:15:01 - 08:30:00:</strong> Trạng thái <strong>Đi trễ (Late)</strong>.</li>
                  <li><strong className="text-white">Sau 08:30:00:</strong> Trạng thái <strong>Trễ đặc biệt (Special Late)</strong> kèm cảnh báo.</li>
                  <li><strong className="text-white">CHECK-OUT:</strong> Ghi nhận giờ thực tế tan ca <strong>Hợp lệ</strong>.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 uppercase mb-1">2. Cấu Trúc Google Sheets (Data Dictionary):</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div><strong>Cột A:</strong> Ngày (YYYY-MM-DD)</div>
                  <div><strong>Cột B:</strong> Mã NV (NV001)</div>
                  <div><strong>Cột C:</strong> Họ và tên</div>
                  <div><strong>Cột D:</strong> Loại thao tác (CHECK-IN/OUT)</div>
                  <div><strong>Cột E:</strong> Giờ ghi nhận (HH:MM:SS)</div>
                  <div><strong>Cột F:</strong> Trạng thái (Đúng giờ/Đi trễ)</div>
                  <div className="col-span-2"><strong>Cột G:</strong> Ghi chú (WiFi Kho / Thiết bị)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 uppercase mb-1">3. Kịch bản Xử Lý Ngoại Lệ:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Chống gian lận gửi ảnh QR:</strong> Server LAN chỉ phục vụ cho IP nội bộ 192.168.1.x; thiết bị kết nối 4G hoặc WiFi ngoài sẽ bị chặn.</li>
                  <li><strong>Chống check-in trùng:</strong> Nếu đã check-in trong ngày thì chỉ cho phép check-out.</li>
                  <li><strong>Mất mạng Internet/Google Sheets:</strong> Lưu tạm vào hàng đợi SQLite và đồng bộ bù khi có mạng.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
