/**
 * Anonymous visitor identity and server-time calculation utilities
 */

const STORAGE_KEY = 'the_last_wish_visitor_id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server_rendering_mock';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    // Generate secure anonymous uuid
    if (crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export interface FormatCountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
}

export function formatRemainingTime(ms: number): FormatCountdownResult {
  if (ms <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00:00:00',
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = days > 0 
    ? `${days}天 ${pad(hours)}時 ${pad(minutes)}分 ${pad(seconds)}秒`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    formatted,
    isExpired: false,
  };
}
