import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  WifiOff, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Share2, 
  AlertTriangle,
  Send,
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AttendanceRecord, SyncQueueItem } from '../types/attendance';

export const GoogleSheetsView: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceRecord[]>(StorageService.getLogs());
  const [queue, setQueue] = useState<SyncQueueItem[]>(StorageService.getSyncQueue());
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(StorageService.isSimulatedOffline());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const rules = StorageService.getRules();

  const refreshData = () => {
    setLogs(StorageService.getLogs());
    setQueue(StorageService.getSyncQueue());
    setIsOfflineMode(StorageService.isSimulatedOffline());
  };

  useEffect(() => {
    refreshData();
    const handleLogsChange = () => refreshData();
    const handleSyncChange = () => refreshData();

    window.addEventListener('qr_attendance_logs_change', handleLogsChange);
    window.addEventListener('qr_attendance_sync_change', handleSyncChange);

    return () => {
      window.removeEventListener('qr_attendance_logs_change', handleLogsChange);
      window.removeEventListener('qr_attendance_sync_change', handleSyncChange);
    };
  }, []);

  const toggleOfflineMode = () => {
    const nextVal = !isOfflineMode;
    StorageService.setSimulatedOffline(nextVal);
    setIsOfflineMode(nextVal);
    if (nextVal) {
      setSyncFeedback('Đã kích hoạt chế độ: Mất mạng Internet / Lỗi Google Sheets API. Dữ liệu mới sẽ lưu vào hàng đợi SQLite!');
    } else {
      setSyncFeedback('Đã khôi phục mạng! Bạn có thể bấm "Đồng Bộ Bù Ngay" để đẩy hàng đợi lên Google Sheets.');
    }
    setTimeout(() => setSyncFeedback(''), 5000);
  };

  const handleManualSyncQueue = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const result = StorageService.processSyncQueue();
      setIsSyncing(false);
      refreshData();
      if (result.syncedCount > 0) {
        setSyncFeedback(`Đã đồng bộ bù thành công ${result.syncedCount} bản ghi lên Google Sheets!`);
      } else if (isOfflineMode) {
        setSyncFeedback('Không thể đồng bộ vì đang bật chế độ ngắt kết nối Sheets.');
      } else {
        setSyncFeedback('Hàng đợi đồng bộ trống, toàn bộ dữ liệu đã được cập nhật.');
      }
      setTimeout(() => setSyncFeedback(''), 4000);
    }, 700);
  };

  const exportToCSV = () => {
    const headers = ['Ngày (Cột A)', 'Mã NV (Cột B)', 'Họ và tên (Cột C)', 'Loại thao tác (Cột D)', 'Thời gian ghi nhận (Cột E)', 'Trạng thái (Cột F)', 'Ghi chú (Cột G)'];
    const rows = logs.map((l) => [
      l.date,
      l.employeeCode,
      `"${l.fullName}"`,
      l.actionType,
      l.recordTime,
      l.status,
      `"${l.note}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Google_Sheets_${rules.googleSheetName}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.note.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.actionType === filterAction;
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;

    return matchesSearch && matchesAction && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Simulation & Edge Case Notification Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Google Sheets Live Sync (Bảng Tính Thời Gian Thực)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Data Dictionary PRD
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tự động đẩy 1 dòng dữ liệu lên file Google Sheets mỗi khi nhân viên Check-in / Check-out.
              </p>
            </div>
          </div>

          {/* Sync status & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleOfflineMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                isOfflineMode
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isOfflineMode ? 'Đang mô phỏng: Rớt mạng Sheets' : 'Kết nối Google Sheets: OK'}</span>
            </button>

            {queue.length > 0 && (
              <button
                onClick={handleManualSyncQueue}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 animate-pulse"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Đồng Bộ Bù ({queue.length} chờ)</span>
              </button>
            )}

            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Sync feedback notification */}
        {syncFeedback && (
          <div className="mt-3 p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Offline Queue Details (PRD Edge Case 3.2) */}
        {queue.length > 0 && (
          <div className="mt-3 p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Hàng Đợi SQLite (Sync Queue):</strong> Có {queue.length} bản ghi chưa được đẩy lên Sheets do rớt mạng. Hệ thống đã lưu trữ an toàn trong cơ sở dữ liệu cục bộ.
              </span>
            </div>
            <button
              onClick={handleManualSyncQueue}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shrink-0 transition"
            >
              Đẩy lên Sheets ngay
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Workspace Simulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Google Sheets Header & Toolbar */}
        <div className="bg-emerald-900/40 border-b border-emerald-800/60 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm font-bold">
              GS
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>{rules.googleSheetName}</span>
                <span className="text-[11px] font-normal text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ID: {rules.googleSheetId.substring(0, 16)}...
                </span>
              </div>
              <div className="text-[10px] text-emerald-300/80">Tự động đồng bộ mỗi khi phát sinh lượt quét QR</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm Mã NV, Tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="ALL">Tất cả thao tác</option>
              <option value="CHECK-IN">CHECK-IN</option>
              <option value="CHECK-OUT">CHECK-OUT</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đúng giờ">Đúng giờ</option>
              <option value="Đi trễ">Đi trễ</option>
              <option value="Hợp lệ">Hợp lệ</option>
              <option value="Trễ đặc biệt">Trễ đặc biệt</option>
            </select>
          </div>
        </div>

        {/* Formula Bar Simulation */}
        <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span className="font-bold text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">fx</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 truncate">
            =ATTENDANCE_LOG(A2:G{filteredLogs.length + 1}) - Tổng số {filteredLogs.length} dòng dữ liệu ghi nhận
          </span>
        </div>

        {/* Spreadsheet Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Column Letters (A, B, C, D, E, F, G) */}
              <tr className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <th className="py-1.5 px-3 w-12 text-center border-r border-slate-800 bg-slate-900/50">#</th>
                <th className="py-1.5 px-3 border-r border-slate-800">A (Ngày)</th>
                <th className="py-1.5 px-3 border-r border-slate-800">B (Mã NV)</th>
                <th className="py-1.5 px-3 border-r border-slate-800">C (Họ và tên)</th>
                <th className="py-1.5 px-3 border-r border-slate-800">D (Loại thao tác)</th>
                <th className="py-1.5 px-3 border-r border-slate-800">E (Thời gian ghi nhận)</th>
                <th className="py-1.5 px-3 border-r border-slate-800">F (Trạng thái)</th>
                <th className="py-1.5 px-3">G (Ghi chú)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có dòng dữ liệu nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const isQueued = !log.syncedToSheets;
                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-slate-800/50 transition font-mono ${
                        isQueued ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 text-center text-slate-500 bg-slate-950/40 border-r border-slate-800 font-medium text-[11px]">
                        {index + 1}
                      </td>

                      {/* Cột A: Ngày */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 text-slate-300 font-sans">
                        {log.date}
                      </td>

                      {/* Cột B: Mã NV */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 font-bold text-emerald-400">
                        {log.employeeCode}
                      </td>

                      {/* Cột C: Họ và tên */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 text-white font-sans font-medium">
                        {log.fullName}
                      </td>

                      {/* Cột D: Loại thao tác */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.actionType === 'CHECK-IN'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>

                      {/* Cột E: Thời gian ghi nhận */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 text-slate-200">
                        {log.recordTime}
                      </td>

                      {/* Cột F: Trạng thái */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          log.status === 'Đúng giờ' || log.status === 'Hợp lệ'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : log.status === 'Đi trễ'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {log.status === 'Đúng giờ' || log.status === 'Hợp lệ' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-400" />
                          )}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      {/* Cột G: Ghi chú */}
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-xs flex items-center justify-between">
                        <span className="truncate max-w-xs">{log.note}</span>
                        {isQueued && (
                          <span className="ml-2 text-[10px] text-amber-400 font-medium px-1.5 py-0.5 bg-amber-950 rounded border border-amber-800 shrink-0">
                            Chờ đồng bộ bù
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Stats */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>Tổng cộng: <strong className="text-white">{filteredLogs.length}</strong> dòng</span>
            <span>Đúng giờ: <strong className="text-emerald-400">{filteredLogs.filter(l => l.status === 'Đúng giờ').length}</strong></span>
            <span>Đi trễ: <strong className="text-amber-400">{filteredLogs.filter(l => l.status === 'Đi trễ').length}</strong></span>
            <span>Tan ca: <strong className="text-blue-400">{filteredLogs.filter(l => l.actionType === 'CHECK-OUT').length}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Định dạng dữ liệu chuẩn Google Sheets API v4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
