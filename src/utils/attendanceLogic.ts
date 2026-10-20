import { ActionType, AttendanceStatus } from '../types/attendance';

export interface TimeEvaluationResult {
  status: AttendanceStatus;
  message: string;
  isLate: boolean;
  isSpecialLate: boolean;
  isOnTime: boolean;
}

/**
 * Convert time string HH:MM:SS or HH:MM to total seconds from 00:00:00
 */
export function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format Date to HH:MM:SS
 */
export function formatTimeHHMMSS(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateYYYYMMDD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format full Vietnamese date: "Thứ Hai, 19/10/2026"
 */
export function formatVietnameseDate(date: Date = new Date()): string {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${dayName}, ${d}/${m}/${y}`;
}

/**
 * Evaluate attendance status based on PRD business rules:
 * - CHECK_IN:
 *   + 06:00:00 - 08:15:00: 'Đúng giờ' (On Time)
 *   + 08:15:01 - 08:30:00: 'Đi trễ' (Late)
 *   + Sau 08:30:00: 'Trễ đặc biệt' (Cảnh báo quá giờ)
 * - CHECK_OUT:
 *   + Ghi nhận thời gian thực tế 'Hợp lệ'
 */
export function evaluateAttendance(
  actionType: ActionType,
  timeStr: string,
  rules = {
    checkInStart: '06:00:00',
    onTimeEnd: '08:15:00',
    lateEnd: '08:30:00',
  }
): TimeEvaluationResult {
  if (actionType === 'CHECK-OUT') {
    return {
      status: 'Hợp lệ',
      message: 'Ghi nhận tan ca hợp lệ. Chúc bạn buổi chiều vui vẻ!',
      isLate: false,
      isSpecialLate: false,
      isOnTime: true,
    };
  }

  const currentSec = timeStringToSeconds(timeStr);
  const startSec = timeStringToSeconds(rules.checkInStart);
  const onTimeEndSec = timeStringToSeconds(rules.onTimeEnd);
  const lateEndSec = timeStringToSeconds(rules.lateEnd);

  if (currentSec >= startSec && currentSec <= onTimeEndSec) {
    return {
      status: 'Đúng giờ',
      message: 'Chúc mừng bạn đã vào ca đúng giờ!',
      isLate: false,
      isSpecialLate: false,
      isOnTime: true,
    };
  } else if (currentSec > onTimeEndSec && currentSec <= lateEndSec) {
    const lateMinutes = Math.ceil((currentSec - onTimeEndSec) / 60);
    return {
      status: 'Đi trễ',
      message: `Bạn đã vào ca trễ ${lateMinutes} phút so với mốc 08:15:00.`,
      isLate: true,
      isSpecialLate: false,
      isOnTime: false,
    };
  } else {
    return {
      status: 'Trễ đặc biệt',
      message: currentSec > lateEndSec 
        ? 'Cảnh báo: Đã quá khung giờ 08:30. Hệ thống ghi nhận Đi trễ đặc biệt.' 
        : 'Cảnh báo: Vào ca trước 06:00 sáng. Ghi nhận ca sớm đặc biệt.',
      isLate: true,
      isSpecialLate: true,
      isOnTime: false,
    };
  }
}

/**
 * Play pleasant synthesizer tones for check-in / check-out
 */
export function playSoundFeedback(type: 'success' | 'late' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant rising major chord chime (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } else if (type === 'late') {
      // Warning double chime
      [440, 415.3].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.3);
      });
    } else {
      // Error low buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Audio feedback failed or not supported:', e);
  }
}
