import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Parse a date from various formats (ISO string, Date object, timestamp)
 */
function parseDate(date: Date | string | number): Date | null {
  try {
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }
    if (typeof date === 'number') {
      const d = new Date(date);
      return isValid(d) ? d : null;
    }
    if (typeof date === 'string') {
      // Try ISO parse first
      let d = parseISO(date);
      if (isValid(d)) return d;
      // Fallback to native Date parsing
      d = new Date(date);
      if (isValid(d)) return d;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatDate(date: Date | string | number | undefined | null): string {
  if (date === undefined || date === null) return '—';
  const d = parseDate(date);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: Date | string | number | undefined | null): string {
  if (date === undefined || date === null) return '—';
  const d = parseDate(date);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatTime(date: Date | string | number | undefined | null): string {
  if (date === undefined || date === null) return '—';
  const d = parseDate(date);
  if (!d) return '—';
  return format(d, 'h:mm a');
}

export function formatRelativeTime(date: Date | string | number | undefined | null): string {
  if (date === undefined || date === null) return '—';
  const d = parseDate(date);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
