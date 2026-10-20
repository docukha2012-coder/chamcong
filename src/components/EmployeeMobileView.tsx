import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageService } from '../services/storageService';
import { User, ActionType, AttendanceRecord } from '../types/attendance';
import { formatTimeHHMMSS, formatVietnameseDate, playSoundFeedback } from '../utils/attendanceLogic';

interface Props {
  onOpenAdmin?: () => void;
  onOpenQRPoster?: () => void;
}

export const EmployeeMobileView: React.FC<Props> = ({ onOpenAdmin, onOpenQRPoster }) => {
  // Live clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timeOverride, setTimeOverride] = useState<string>(''); // e.g. "08:14:00" or empty for real time
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string>('realtime');

  // Form states
  const [username, setUsername] = useState<string>('NV001');
  const [password, setPassword] = useState<string>('123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('Kho Tổng - Cổng 1');

  // Success / error feedback
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Network simulation states
  const [isOutsideLAN, setIsOutsideLAN] = useState<boolean>(StorageService.isSimulatedOutsideLAN());
  const [isOfflineSheets, setIsOfflineSheets] = useState<boolean>(StorageService.isSimulatedOffline());
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const rules = StorageService.getRules();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to storage/network events
  useEffect(() => {
    const handleNetworkChange = () => {
      setIsOutsideLAN(StorageService.isSimulatedOutsideLAN());
    };
    const handleSyncChange = () => {
      setIsOfflineSheets(StorageService.isSimulatedOffline());
    };
    const handleLogsChange = () => {
      setUsers(StorageService.getUsers());
    };

    window.addEventListener('qr_attendance_network_change', handleNetworkChange);
    window.addEventListener('qr_attendance_sync_change', handleSyncChange);
    window.addEventListener('qr_attendance_logs_change', handleLogsChange);

    return () => {
      window.removeEventListener('qr_attendance_network_change', handleNetworkChange);
      window.removeEventListener('qr_attendance_sync_change', handleSyncChange);
      window.removeEventListener('qr_attendance_logs_change', handleLogsChange);
    };
  }, []);

  // Effective time string for display and submission
  const displayTimeString = timeOverride || formatTimeHHMMSS(currentTime);

  const handleQuickPresetChange = (preset: string) => {
    setSelectedQuickPreset(preset);
    if (preset === 'realtime') {
      setTimeOverride('');
    } else if (preset === 'ontime') {
      setTimeOverride('08:05:00');
    } else if (preset === 'ontime_close') {
      setTimeOverride('08:14:45');
    } else if (preset === 'late') {
      setTimeOverride('08:22:15');
    } else if (preset === 'special_late') {
      setTimeOverride('09:10:00');
    } else if (preset === 'checkout') {
      setTimeOverride('17:35:00');
    }
  };

  const handleQuickUserSelect = (u: User) => {
    setUsername(u.username);
    setPassword(u.password);
    setErrorMessage('');
  };

  const toggleNetworkLAN = () => {
    const nextVal = !isOutsideLAN;
    StorageService.setSimulatedOutsideLAN(nextVal);
    setIsOutsideLAN(nextVal);
    setErrorMessage('');
  };

  const handleSubmit = (actionType: ActionType) => {
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      // 1. Verify User credentials
      const user = StorageService.verifyCredentials(username, password);
      if (!user) {
        setErrorMessage('Mã nhân viên hoặc mật khẩu không chính xác! (Mặc định: NV001 / mật khẩu: 123)');
        playSoundFeedback('error');
        setIsSubmitting(false);
        return;
      }

      // 2. Perform attendance registration
      const result = StorageService.recordAttendance({
        user,
        actionType,
        timeOverride: timeOverride || undefined,
        note: `Chấm công qua WiFi ${selectedLocation}`,
        wifiSSID: rules.allowedWifiSSID,
        ipAddress: isOutsideLAN ? '14.232.180.45' : '192.168.1.108',
      });

      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Có lỗi xảy ra trong quá trình chấm công.');
        playSoundFeedback('error');
        return;
      }

      // 3. Success!
      if (result.record) {
        setSuccessRecord(result.record);
        setStatusMessage(result.statusMessage || '');

        if (result.record.status === 'Đúng giờ' || result.record.status === 'Hợp lệ') {
          playSoundFeedback('success');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } else {
          playSoundFeedback('late');
        }
      }
    }, 350);
  };

  const resetFormForNextEmployee = () => {
    setSuccessRecord(null);
    setStatusMessage('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-4 md:p-6">
      {/* Simulation & Tester Bar */}
      <div className="w-full max-w-md mb-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-3 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Giả Lập Kiểm Thử Nghiệp Vụ (PRD):
          </span>
          <button
            onClick={toggleNetworkLAN}
            className={`px-2 py-0.5 rounded-full font-medium transition flex items-center gap-1 ${
              isOutsideLAN 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isOutsideLAN ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {isOutsideLAN ? 'Đang bật: 4G/Ngoài LAN' : 'WiFi Nội Bộ LAN (192.168.1.x)'}
          </button>
        </div>

        {/* Time Simulator Presets */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px]">
          <button
            onClick={() => handleQuickPresetChange('realtime')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'realtime'
                ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            Giờ thực tế
          </button>
          <button
            onClick={() => handleQuickPresetChange('ontime')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'ontime'
                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-750'
            }`}
          >
            08:05 (Đúng)
          </button>
          <button
            onClick={() => handleQuickPresetChange('ontime_close')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'ontime_close'
                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                : 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            08:14 (Sát nút)
          </button>
          <button
            onClick={() => handleQuickPresetChange('late')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'late'
                ? 'bg-amber-600 text-white border-amber-500 font-semibold'
                : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            08:22 (Trễ)
          </button>
          <button
            onClick={() => handleQuickPresetChange('special_late')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'special_late'
                ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            09:10 (Trễ đặc biệt)
          </button>
          <button
            onClick={() => handleQuickPresetChange('checkout')}
            className={`py-1 px-1.5 rounded-lg border text-center transition ${
              selectedQuickPreset === 'checkout'
                ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                : 'bg-slate-800 text-purple-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            17:35 (Tan ca)
          </button>
        </div>
      </div>

      {/* Main Mobile App Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 backdrop-blur rounded-xl">
                <Building2 className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide leading-tight">CHẤM CÔNG NỘI BỘ</h1>
                <p className="text-[11px] text-emerald-100/80">Hệ thống QR WiFi & Google Sheets</p>
              </div>
            </div>

            {/* WiFi Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/20 backdrop-blur rounded-full text-xs font-medium border border-white/10">
              {isOutsideLAN ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span className="text-rose-200">Ngoài LAN</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="text-emerald-100">WiFi OK</span>
                </>
              )}
            </div>
          </div>

          {/* Subnet / IP Info */}
          <div className="flex items-center justify-between text-[11px] text-emerald-100/90 pt-1 border-t border-white/10">
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {rules.allowedWifiSSID}
            </span>
            <span className="font-mono">
              IP: {isOutsideLAN ? '14.232.180.45 (Cấm)' : '192.168.1.108'}
            </span>
          </div>
        </div>

        {/* Dynamic Digital Clock Section */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatVietnameseDate(currentTime)}</span>
          </div>

          <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.25)] flex items-center justify-center gap-1">
            <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 inline-block mr-1 opacity-80" />
            <span>{displayTimeString}</span>
          </div>

          {timeOverride && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/60">
              <span>Đang giả lập mốc: {timeOverride}</span>
              <button
                onClick={() => handleQuickPresetChange('realtime')}
                className="hover:underline ml-1 text-slate-300"
              >
                (Hủy)
              </button>
            </div>
          )}

          {/* Rules Banner */}
          <div className="mt-3 flex items-center justify-around text-[10px] text-slate-400 bg-slate-900/60 rounded-xl p-2 border border-slate-800">
            <div>
              <span className="text-emerald-400 font-bold block">06:00 - 08:15</span>
              <span>Đúng giờ</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-amber-400 font-bold block">08:15 - 08:30</span>
              <span>Đi trễ</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-rose-400 font-bold block">&gt; 08:30</span>
              <span>Trễ đặc biệt</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          {!successRecord ? (
            /* --- FORM CHECK-IN / CHECK-OUT --- */
            <div className="space-y-4">
              {/* Outside LAN Alert */}
              {isOutsideLAN && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-300 font-semibold mb-0.5">Không Thể Chấm Công Từ Mạng Ngoài!</strong>
                    Thiết bị của bạn đang kết nối 4G hoặc WiFi ngoài. Theo quy định chống gian lận, bạn phải kết nối WiFi nội bộ văn phòng/kho (192.168.1.x) để thực hiện.
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Quick Select Employee Chips */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Chọn nhanh nhân viên kiểm thử:
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {users.slice(0, 5).map((u) => {
                    const isSelected = username === u.username;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickUserSelect(u)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs whitespace-nowrap transition ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {u.username.substring(2)}
                        </span>
                        <span>{u.fullName.split(' ').slice(-1)[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mã Nhân Viên / Username:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ví dụ: NV001"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium uppercase"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mật Khẩu Cá Nhân:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu của bạn"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Điểm Chấm Công (Vị trí QR dán):
                </label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium"
                  >
                    <option value="Kho Tổng - Cổng 1">Kho Tổng - Cổng Chính 1 (WiFi Kho)</option>
                    <option value="Văn Phòng - Tầng 2">Văn Phòng Làm Việc - Tầng 2</option>
                    <option value="Xưởng Kỹ Thuật - Cửa Nam">Xưởng Kỹ Thuật - Cửa Nam</option>
                    <option value="Phòng Họp & Dự Án">Phòng Họp & Khối Dự Án</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* 2 Big Action Buttons as specified in PRD Prompt 3 */}
              <div className="pt-2 grid grid-cols-2 gap-3">
                {/* VÀO CA (CHECK-IN) */}
                <button
                  type="button"
                  onClick={() => handleSubmit('CHECK-IN')}
                  disabled={isSubmitting}
                  className="py-3.5 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/40 active:scale-98 transition flex flex-col items-center justify-center gap-1 border border-emerald-400/30 group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs uppercase tracking-wider">VÀO CA</span>
                  <span className="text-[10px] text-emerald-100 font-normal opacity-90">(CHECK-IN)</span>
                </button>

                {/* TAN CA (CHECK-OUT) */}
                <button
                  type="button"
                  onClick={() => handleSubmit('CHECK-OUT')}
                  disabled={isSubmitting}
                  className="py-3.5 px-3 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-lg shadow-amber-900/40 active:scale-98 transition flex flex-col items-center justify-center gap-1 border border-amber-400/30 group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs uppercase tracking-wider">TAN CA</span>
                  <span className="text-[10px] text-amber-100 font-normal opacity-90">(CHECK-OUT)</span>
                </button>
              </div>

              {/* Security Footnote */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mã hóa bảo mật & xác thực IP nội bộ theo thời gian thực</span>
              </div>
            </div>
          ) : (
            /* --- SUCCESS CONFIRMATION SCREEN (Prompt 3 PRD) --- */
            <div className="space-y-4 text-center py-2 animate-fade-in">
              {/* Success Badge */}
              <div className="relative inline-block mx-auto mb-1">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce-subtle">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                  Thành Công
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">CHẤM CÔNG THÀNH CÔNG!</h2>
                <p className="text-xs text-slate-400 mt-0.5">{statusMessage}</p>
              </div>

              {/* Confirmation Card */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Họ và tên nhân viên:</span>
                  <span className="text-sm font-bold text-white">{successRecord.fullName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Mã định danh:</span>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                    {successRecord.employeeCode}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Loại thao tác:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    successRecord.actionType === 'CHECK-IN'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {successRecord.actionType}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Thời gian ghi nhận:</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {successRecord.recordTime} ({successRecord.date})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Đánh giá trạng thái:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    successRecord.status === 'Đúng giờ' || successRecord.status === 'Hợp lệ'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : successRecord.status === 'Đi trễ'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {successRecord.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Google Sheets Sync:</span>
                  {successRecord.syncedToSheets ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã đồng bộ tức thì
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Lưu tạm SQLite (Chờ sync)
                    </span>
                  )}
                </div>
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={resetFormForNextEmployee}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-2xl transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Chấm công cho nhân viên tiếp theo</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center flex items-center justify-around text-xs text-slate-400">
          {onOpenQRPoster && (
            <button
              onClick={onOpenQRPoster}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Xem Mã QR Dán Tường
            </button>
          )}

          <span className="text-slate-700">|</span>

          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-slate-300 hover:text-white font-medium flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Quản Trị &amp; Google Sheets
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
