export interface User {
  id: string;
  username: string; // Mã NV (e.g. NV001)
  fullName: string;
  department: string;
  position: string;
  password: string;
  avatar?: string;
  phone?: string;
}

export type ActionType = 'CHECK-IN' | 'CHECK-OUT';

export type AttendanceStatus = 'Đúng giờ' | 'Đi trễ' | 'Hợp lệ' | 'Trễ đặc biệt';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeCode: string; // Mã NV (Cột B)
  fullName: string; // Họ và tên (Cột C)
  actionType: ActionType; // CHECK-IN / CHECK-OUT (Cột D)
  recordTime: string; // HH:MM:SS (Cột E)
  status: AttendanceStatus; // Trạng thái (Cột F)
  note: string; // Ghi chú (Cột G)
  syncedToSheets: boolean;
  syncedAt?: string;
  deviceInfo?: string;
  wifiSSID?: string;
  ipAddress?: string;
  rawTimestamp: number;
}

export interface AttendanceRuleConfig {
  checkInStart: string; // "06:00:00"
  onTimeEnd: string; // "08:15:00"
  lateEnd: string; // "08:30:00"
  checkOutStart: string; // "16:30:00"
  allowedWifiSSID: string;
  allowedSubnet: string;
  googleSheetName: string;
  googleSheetId: string;
  webhookUrl: string;
}

export interface SyncQueueItem {
  id: string;
  record: AttendanceRecord;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}
