import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  RotateCcw, 
  Save, 
  UserCheck, 
  UserX, 
  Plus, 
  Wifi, 
  ShieldCheck,
  TrendingUp,
  Building
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User, AttendanceRecord, AttendanceRuleConfig } from '../types/attendance';
import { formatDateYYYYMMDD } from '../utils/attendanceLogic';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const [logs, setLogs] = useState<AttendanceRecord[]>(StorageService.getLogs());
  const [rules, setRules] = useState<AttendanceRuleConfig>(StorageService.getRules());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);

  // New user form state
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('Kho Vận');
  const [newPassword, setNewPassword] = useState<string>('123');

  const todayStr = formatDateYYYYMMDD();
  const todayLogs = logs.filter((l) => l.date === todayStr);

  const todayCheckIns = todayLogs.filter((l) => l.actionType === 'CHECK-IN');
  const onTimeCount = todayCheckIns.filter((l) => l.status === 'Đúng giờ').length;
  const lateCount = todayCheckIns.filter((l) => l.status === 'Đi trễ' || l.status === 'Trễ đặc biệt').length;
  const onTimeRate = todayCheckIns.length > 0 
    ? Math.round((onTimeCount / todayCheckIns.length) * 100) 
    : 100;

  const refresh = () => {
    setUsers(StorageService.getUsers());
    setLogs(StorageService.getLogs());
    setRules(StorageService.getRules());
  };

  useEffect(() => {
    window.addEventListener('qr_attendance_logs_change', refresh);
    return () => window.removeEventListener('qr_attendance_logs_change', refresh);
  }, []);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveRules(rules);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName) return;
    const existing = StorageService.findUser(newUsername);
    if (existing) {
      alert(`Mã nhân viên ${newUsername} đã tồn tại!`);
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: newUsername.toUpperCase().trim(),
      fullName: newFullName.trim(),
      department: newDepartment,
      position: 'Nhân viên',
      password: newPassword,
    };

    const currentUsers = StorageService.getUsers();
    currentUsers.push(newUser);
    localStorage.setItem('qr_attendance_users_v1', JSON.stringify(currentUsers));
    setUsers(currentUsers);
    setShowAddUserModal(false);
    setNewUsername('');
    setNewFullName('');
  };

  const handleResetData = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu (nhân viên, nhật ký, hàng đợi)?')) {
      StorageService.resetDemoData();
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng lượt check-in hôm nay */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Lượt Check-in Hôm Nay</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{todayCheckIns.length}</span>
            <span className="text-xs text-slate-400">/ {users.length} nhân sự</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {todayCheckIns.length >= users.length ? '100% nhân viên đã điểm danh' : `Còn ${users.length - todayCheckIns.length} người chưa điểm danh`}
          </div>
        </div>

        {/* Card 2: Tỷ lệ Đúng giờ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tỷ Lệ Đúng Giờ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{onTimeRate}%</span>
            <span className="text-xs text-emerald-300">({onTimeCount} ca đúng giờ)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Khung chuẩn 06:00:00 - 08:15:00
          </div>
        </div>

        {/* Card 3: Đi trễ & Quá giờ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Số Ca Đi Trễ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{lateCount}</span>
            <span className="text-xs text-amber-300">nhân viên</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Trễ: 08:15:01 - 08:30:00 &amp; Sau 08:30
          </div>
        </div>

        {/* Card 4: Trạng thái Google Sheets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Bảo Vệ Mạng &amp; Sync</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">LAN WiFi 192.168.*</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Chống quét QR từ mạng ngoài</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Employee Roster & Rule Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Roster Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Danh Sách Nhân Viên &amp; Trạng Thái Điểm Danh Hôm Nay
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi tình trạng vào ca / tan ca thời gian thực của từng nhân sự.
              </p>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Nhân Viên</span>
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3">Mã NV</th>
                  <th className="py-2 px-3">Họ và tên</th>
                  <th className="py-2 px-3">Phòng ban</th>
                  <th className="py-2 px-3">Check-in</th>
                  <th className="py-2 px-3">Check-out</th>
                  <th className="py-2 px-3">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const userCheckIn = todayLogs.find(l => l.employeeCode === u.username && l.actionType === 'CHECK-IN');
                  const userCheckOut = todayLogs.find(l => l.employeeCode === u.username && l.actionType === 'CHECK-OUT');

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {u.username}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{u.fullName}</div>
                        <div className="text-[11px] text-slate-400">{u.position}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {u.department}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {userCheckIn ? (
                          <span className="text-emerald-300">{userCheckIn.recordTime}</span>
                        ) : (
                          <span className="text-slate-500 italic">Chưa check-in</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {userCheckOut ? (
                          <span className="text-purple-300">{userCheckOut.recordTime}</span>
                        ) : (
                          <span className="text-slate-500 italic">Chưa tan ca</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {userCheckIn ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            userCheckIn.status === 'Đúng giờ'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : userCheckIn.status === 'Đi trễ'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {userCheckIn.status}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            Chưa có mặt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Rule Settings Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Cấu Hình Khung Giờ &amp; Quy Định
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập theo đúng yêu cầu nghiệp vụ trong PRD.
              </p>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bắt đầu nhận Check-in:
                </label>
                <input
                  type="text"
                  value={rules.checkInStart}
                  onChange={(e) => setRules({ ...rules, checkInStart: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  placeholder="06:00:00"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mốc kết thúc Đúng Giờ (On Time):
                </label>
                <input
                  type="text"
                  value={rules.onTimeEnd}
                  onChange={(e) => setRules({ ...rules, onTimeEnd: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                  placeholder="08:15:00"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">06:00:00 - 08:15:00 = Đúng giờ</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mốc kết thúc Đi Trễ (Late Limit):
                </label>
                <input
                  type="text"
                  value={rules.lateEnd}
                  onChange={(e) => setRules({ ...rules, lateEnd: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold"
                  placeholder="08:30:00"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">08:15:01 - 08:30:00 = Đi trễ. Sau 08:30 = Trễ đặc biệt</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tên WiFi Nội Bộ Cho Phép (SSID):
                </label>
                <input
                  type="text"
                  value={rules.allowedWifiSSID}
                  onChange={(e) => setRules({ ...rules, allowedWifiSSID: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  placeholder="Office-Internal-WiFi-5G"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dải IP LAN Nội Bộ Cho Phép:
                </label>
                <input
                  type="text"
                  value={rules.allowedSubnet}
                  onChange={(e) => setRules({ ...rules, allowedSubnet: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  placeholder="192.168.1."
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 mt-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaved ? 'Đã Lưu Thành Công!' : 'Lưu Cấu Hình'}</span>
              </button>
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetData}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Khôi Phục Dữ Liệu Mẫu (Demo Reset)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Thêm Nhân Viên Mới</h3>
            <p className="text-xs text-slate-400 mb-4">Cung cấp tài khoản để nhân viên quét QR chấm công.</p>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mã Nhân Viên (Mã định danh):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: NV006"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white uppercase font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Họ và Tên:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hoàng Văn Tuấn"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phòng Ban:</label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  <option value="Kho Vận &amp; Hậu Cần">Kho Vận &amp; Hậu Cần</option>
                  <option value="Kế Toán &amp; Nhân Sự">Kế Toán &amp; Nhân Sự</option>
                  <option value="Kỹ Thuật &amp; Vận Hành">Kỹ Thuật &amp; Vận Hành</option>
                  <option value="Kinh Doanh &amp; Dự Án">Kinh Doanh &amp; Dự Án</option>
                  <option value="Chăm Sóc Khách Hàng">Chăm Sóc Khách Hàng</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mật Khẩu Ban Đầu:</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                >
                  Lưu Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
