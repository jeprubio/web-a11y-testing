/**
 * Keeps the focused element out from under the sticky header (WCAG 2.4.11 Focus Not Obscured).
 *
 * `scroll-padding-top` in the CSS handles this in Chromium and Firefox, but Safari ignores it
 * when keyboard focus scrolls the page, so the header can cover a field you Shift+Tab back to.
 */
export function setupFocusScroll(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;

  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || header.contains(target) || target.closest('dialog')) return;
    // Keyboard focus only: moving the page under a mouse click would make the click miss.
    if (!target.matches(':focus-visible')) return;
    if (getComputedStyle(header).position !== 'sticky') return;

    const headerBottom = header.getBoundingClientRect().bottom;
    const { top } = target.getBoundingClientRect();
    const gap = 16;
    if (top < headerBottom + gap) {
      window.scrollBy({ top: top - headerBottom - gap, behavior: 'instant' });
    }
  });
}
