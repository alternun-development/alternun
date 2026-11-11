import { timeAgo } from '../NotificationDropdown';

jest.mock('lucide-react-native', () => ({}));

const t = {
  locale: 'es',
  t: (key, params) => (params?.count === undefined ? key : `${key}:${params.count}`),
};

const NOW = Date.parse('2026-11-11T02:33:30Z');
const at = (iso) => new Date(iso);

describe('timeAgo', () => {
  it('counts from the server time of each notification', () => {
    expect(timeAgo(at('2026-11-11T02:33:10Z'), t, NOW)).toBe('notifications.ui.justNow');
    expect(timeAgo(at('2026-11-11T02:30:21Z'), t, NOW)).toBe('notifications.ui.minutesAgo:3');
    expect(timeAgo(at('2026-11-10T21:30:00Z'), t, NOW)).toBe('notifications.ui.hoursAgo:5');
    expect(timeAgo(at('2026-11-08T02:30:00Z'), t, NOW)).toBe('notifications.ui.daysAgo:3');
  });

  it('treats a device clock behind the server as just now', () => {
    expect(timeAgo(at('2026-11-11T02:35:00Z'), t, NOW)).toBe('notifications.ui.justNow');
  });

  it('shows the date after a week, and nothing for a missing time', () => {
    const old = at('2026-10-01T15:00:00Z');
    expect(timeAgo(old, t, NOW)).toBe(
      old.toLocaleDateString('es', { day: 'numeric', month: 'short' })
    );
    const lastYear = at('2025-10-01T15:00:00Z');
    expect(timeAgo(lastYear, t, NOW)).toBe(
      lastYear.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    );
    expect(timeAgo(new Date(0), t, NOW)).toBe('');
  });
});
