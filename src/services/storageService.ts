import { User, AttendanceRecord, AttendanceRuleConfig, SyncQueueItem, ActionType } from '../types/attendance';
import { INITIAL_USERS, INITIAL_ATTENDANCE_LOGS, DEFAULT_RULES } from '../data/mockData';
import { evaluateAttendance, formatTimeHHMMSS, formatDateYYYYMMDD } from '../utils/attendanceLogic';

const USERS_KEY = 'qr_attendance_users_v1';
const LOGS_KEY = 'qr_attendance_logs_v1';
const RULES_KEY = 'qr_attendance_rules_v1';
const QUEUE_KEY = 'qr_attendance_sync_queue_v1';
const SIMULATED_OFFLINE_KEY = 'qr_attendance_sim_offline_v1';
const SIMULATED_OUTSIDE_LAN_KEY = 'qr_attendance_sim_outside_lan_v1';

export class StorageService {
  // --- Users (bảng users trong SQLite) ---
  static getUsers(): User[] {
    try {
      const data = localStorage.getItem(USERS_KEY);
      if (!data) {
        localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  }

  static findUser(username: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.username.trim().toUpperCase() === username.trim().toUpperCase());
  }

  static verifyCredentials(username: string, password: string): User | null {
    const user = this.findUser(username);
    if (!user) return null;
    if (user.password === password) return user;
    return null;
  }

  // --- Rules ---
  static getRules(): AttendanceRuleConfig {
    try {
      const data = localStorage.getItem(RULES_KEY);
      if (!data) {
        localStorage.setItem(RULES_KEY, JSON.stringify(DEFAULT_RULES));
        return DEFAULT_RULES;
      }
      return { ...DEFAULT_RULES, ...JSON.parse(data) };
    } catch {
      return DEFAULT_RULES;
    }
  }

  static saveRules(rules: AttendanceRuleConfig): void {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  }

  // --- Attendance Logs (bảng attendance_logs trong SQLite) ---
  static getLogs(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      if (!data) {
        localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_ATTENDANCE_LOGS));
        return INITIAL_ATTENDANCE_LOGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ATTENDANCE_LOGS;
    }
  }

  /**
   * Find today's records for this user (for duplicate check)
   */
  static getTodayLogsForUser(username: string, dateStr: string = formatDateYYYYMMDD()): AttendanceRecord[] {
    const logs = this.getLogs();
    const code = username.trim().toUpperCase();
    return logs.filter((l) => l.employeeCode.toUpperCase() === code && l.date === dateStr);
  }

  /**
   * Check duplicate according to PRD rule:
   * "Trong cùng 1 ngày, nếu đã Check-in thành công thì chỉ cho phép Check-out, tránh bị ghi đè trùng lặp dữ liệu."
   */
  static checkDuplicateAction(
    username: string,
    action: ActionType,
    dateStr: string = formatDateYYYYMMDD()
  ): { allowed: boolean; existingRecord?: AttendanceRecord; reason?: string } {
    const todayLogs = this.getTodayLogsForUser(username, dateStr);
    const existingCheckIn = todayLogs.find((l) => l.actionType === 'CHECK-IN');
    const existingCheckOut = todayLogs.find((l) => l.actionType === 'CHECK-OUT');

    if (action === 'CHECK-IN') {
      if (existingCheckIn) {
        return {
          allowed: false,
          existingRecord: existingCheckIn,
          reason: `Bạn đã Check-in hôm nay lúc ${existingCheckIn.recordTime} (${existingCheckIn.status}). Vui lòng chọn CHECK-OUT khi kết thúc ca làm.`,
        };
      }
    } else if (action === 'CHECK-OUT') {
      if (existingCheckOut) {
        return {
          allowed: false,
          existingRecord: existingCheckOut,
          reason: `Bạn đã ghi nhận Check-out hôm nay lúc ${existingCheckOut.recordTime}.`,
        };
      }
    }

    return { allowed: true };
  }

  // --- Network / Offline Simulation ---
  static isSimulatedOffline(): boolean {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  }

  static setSimulatedOffline(val: boolean): void {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, String(val));
    window.dispatchEvent(new Event('qr_attendance_sync_change'));
  }

  static isSimulatedOutsideLAN(): boolean {
    return localStorage.getItem(SIMULATED_OUTSIDE_LAN_KEY) === 'true';
  }

  static setSimulatedOutsideLAN(val: boolean): void {
    localStorage.setItem(SIMULATED_OUTSIDE_LAN_KEY, String(val));
    window.dispatchEvent(new Event('qr_attendance_network_change'));
  }

  // --- Sync Queue (PRD Edge Case Handling) ---
  static getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToSyncQueue(record: AttendanceRecord, errorReason: string = 'Mất kết nối Google Sheets'): void {
    const queue = this.getSyncQueue();
    queue.push({
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      record,
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      error: errorReason,
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('qr_attendance_sync_change'));
  }

  static processSyncQueue(): { syncedCount: number; remainingCount: number } {
    if (this.isSimulatedOffline()) {
      return { syncedCount: 0, remainingCount: this.getSyncQueue().length };
    }

    const queue = this.getSyncQueue();
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    const logs = this.getLogs();
    const syncedIds = new Set<string>();

    queue.forEach((item) => {
      syncedIds.add(item.record.id);
    });

    // Mark corresponding records as synced in main log
    const updatedLogs = logs.map((log) => {
      if (syncedIds.has(log.id)) {
        return {
          ...log,
          syncedToSheets: true,
          syncedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
      }
      return log;
    });

    localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    localStorage.removeItem(QUEUE_KEY);
    window.dispatchEvent(new Event('qr_attendance_sync_change'));
    window.dispatchEvent(new Event('qr_attendance_logs_change'));

    return { syncedCount: queue.length, remainingCount: 0 };
  }

  // --- Record Attendance Transaction ---
  static recordAttendance(params: {
    user: User;
    actionType: ActionType;
    timeOverride?: string;
    note?: string;
    wifiSSID?: string;
    ipAddress?: string;
  }): { success: boolean; record?: AttendanceRecord; error?: string; statusMessage?: string } {
    const { user, actionType, timeOverride, note, wifiSSID, ipAddress } = params;
    const rules = this.getRules();

    // Check outside LAN restriction
    if (this.isSimulatedOutsideLAN()) {
      return {
        success: false,
        error: 'Truy cập bị từ chối: Thiết bị của bạn không kết nối mạng WiFi nội bộ của công ty (192.168.1.x). Vui lòng kết nối WiFi văn phòng/kho để chấm công.',
      };
    }

    const todayStr = formatDateYYYYMMDD();
    const recordTime = timeOverride || formatTimeHHMMSS();

    // Duplicate check
    const dupCheck = this.checkDuplicateAction(user.username, actionType, todayStr);
    if (!dupCheck.allowed) {
      return {
        success: false,
        error: dupCheck.reason,
      };
    }

    // Evaluate on-time / late status
    const evalResult = evaluateAttendance(actionType, recordTime, rules);

    const isOffline = this.isSimulatedOffline();

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: todayStr,
      employeeCode: user.username,
      fullName: user.fullName,
      actionType,
      recordTime,
      status: evalResult.status,
      note: note || (actionType === 'CHECK-IN' ? 'Check-in qua WiFi Nội Bộ' : 'Tan ca qua WiFi Nội Bộ'),
      syncedToSheets: !isOffline,
      syncedAt: !isOffline ? `${todayStr} ${recordTime}` : undefined,
      deviceInfo: navigator.userAgent.includes('iPhone')
        ? 'Thiết bị iOS'
        : navigator.userAgent.includes('Android')
        ? 'Thiết bị Android'
        : 'Thiết bị Web',
      wifiSSID: wifiSSID || rules.allowedWifiSSID,
      ipAddress: ipAddress || '192.168.1.105',
      rawTimestamp: Date.now(),
    };

    // Save to local logs (SQLite mock)
    const logs = this.getLogs();
    logs.unshift(newRecord);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

    // Handle Google Sheets sync
    if (isOffline) {
      this.addToSyncQueue(newRecord, 'Mạng Google Sheets gián đoạn (Đã lưu tạm SQLite)');
    } else {
      // Optional forward to real webhook if provided
      if (rules.webhookUrl && rules.webhookUrl.startsWith('https://')) {
        try {
          fetch(rules.webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord),
          }).catch(() => {
            // Ignore no-cors errors in simulation
          });
        } catch {
          // Ignore
        }
      }
    }

    window.dispatchEvent(new Event('qr_attendance_logs_change'));

    return {
      success: true,
      record: newRecord,
      statusMessage: evalResult.message,
    };
  }

  // Reset to initial mock data
  static resetDemoData(): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_ATTENDANCE_LOGS));
    localStorage.setItem(RULES_KEY, JSON.stringify(DEFAULT_RULES));
    localStorage.removeItem(QUEUE_KEY);
    localStorage.setItem(SIMULATED_OFFLINE_KEY, 'false');
    localStorage.setItem(SIMULATED_OUTSIDE_LAN_KEY, 'false');
    window.dispatchEvent(new Event('qr_attendance_logs_change'));
    window.dispatchEvent(new Event('qr_attendance_sync_change'));
    window.dispatchEvent(new Event('qr_attendance_network_change'));
  }
}
