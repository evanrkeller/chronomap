// Keeps a long-running kiosk healthy: one reload a day, off-hours, so
// the display picks up deployed changes and Chromium never accumulates
// weeks of drift or leaks.
export const RELOAD_HOUR = 3;

// If the network happens to be down at reload time, try again later
// rather than stranding an error page on the TV.
export const RELOAD_RETRY_MS = 30 * 60 * 1000;

export function msUntilDailyReload(now) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RELOAD_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function reloadWhenReachable() {
  try {
    await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    window.location.reload();
  } catch {
    console.log('chronomap reload deferred: site unreachable, retrying soon');
    setTimeout(reloadWhenReachable, RELOAD_RETRY_MS);
  }
}

export function scheduleDailyReload() {
  setTimeout(reloadWhenReachable, msUntilDailyReload(new Date()));
}
