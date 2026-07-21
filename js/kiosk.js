// Keeps a long-running kiosk healthy: one reload a day, off-hours, so
// the display picks up deployed changes and Chromium never accumulates
// weeks of drift or leaks.
export const RELOAD_HOUR = 3;

export function msUntilDailyReload(now) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RELOAD_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function scheduleDailyReload() {
  setTimeout(() => window.location.reload(), msUntilDailyReload(new Date()));
}
