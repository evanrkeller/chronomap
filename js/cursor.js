// Cursor auto-hide: interactive viewers see their pointer whenever the
// mouse moves; a wall kiosk whose mouse never moves keeps a clean
// screen. Replaces the old unconditional kiosk `cursor: none`.
export const CURSOR_IDLE_MS = 5000;

export function initCursorAutoHide(element, idleMs = CURSOR_IDLE_MS) {
  let timer = null;
  element.addEventListener('mousemove', () => {
    element.classList.remove('cursor-idle');
    clearTimeout(timer);
    timer = setTimeout(() => element.classList.add('cursor-idle'), idleMs);
  });
  // Boot hidden: the kiosk never moves a mouse.
  element.classList.add('cursor-idle');
}
