const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const number = new Intl.NumberFormat('en-IN');

export const fmtNumber = (n) => number.format(n ?? 0);
export const fmtTime = (d) => time.format(new Date(d)).replace(' ', ' ');

const sameDay = (a, b) => a.toDateString() === b.toDateString();

export function fmtDay(d, now = new Date()) {
  const date = new Date(d);
  if (sameDay(date, now)) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'Tomorrow';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  return day.format(date);
}

export function fmtWindow(start, end, now) {
  const s = new Date(start);
  const e = new Date(end);
  const prefix = fmtDay(s, now);
  return sameDay(s, e)
    ? `${prefix}, ${fmtTime(s)} – ${fmtTime(e)}`
    : `${prefix} ${fmtTime(s)} – ${fmtDay(e, now)} ${fmtTime(e)}`;
}

export function fmtDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
  return `${Math.round(hours / 24)} days`;
}

// How long until the food stops being safe, plus an urgency level for styling.
export function freshness(expiresAt, now = Date.now()) {
  const left = new Date(expiresAt) - now;
  if (left <= 0) return { left, label: 'Past best-before', urgency: 'gone' };
  return {
    left,
    label: `${fmtDuration(left)} left`,
    urgency: left < 60 * 60 * 1000 ? 'urgent' : left < 3 * 60 * 60 * 1000 ? 'soon' : 'fine',
  };
}

export const pickupCode = (id = '') => id.slice(-6).toUpperCase();

export function fmtAgo(d, now = Date.now()) {
  const mins = Math.round((now - new Date(d)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

// datetime-local inputs need local time without a timezone suffix.
export function toLocalInput(d) {
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// For use mid-sentence: "Pickup today", "Picked up yesterday at 9 pm".
export const fmtDayInline = (d, now) => fmtDay(d, now).replace(/^(Today|Tomorrow|Yesterday)$/, (w) => w.toLowerCase());
