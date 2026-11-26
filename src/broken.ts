/**
 * Broken mode: open the page with `?broken=1` to inject common accessibility bugs.
 *
 * It exists so the test suite can be demoed failing for the right reasons.
 * Every bug below is something manual testers regularly report, and every one
 * is caught by at least one automated test (see docs/broken-mode.md).
 */

export function isBrokenMode(search: string): boolean {
  return new URLSearchParams(search).get('broken') === '1';
}

export function applyBrokenMode(doc: Document): void {
  // 1. Focus ring removed and low-contrast card text (CSS under `.broken`).
  doc.body.classList.add('broken');

  // 2. Positive tabindex: the submit button jumps to the front of the tab order.
  doc.querySelector('[data-testid="submit"]')?.setAttribute('tabindex', '1');

  // 3. The email field loses its label, so it has no accessible name.
  doc.querySelector('[data-testid="email-label"]')?.remove();
  doc.querySelector('[data-testid="email"]')?.removeAttribute('aria-describedby');

  // 4. The icon-only close button loses its aria-label.
  doc.querySelector('[data-testid="dialog-close"]')?.removeAttribute('aria-label');

  // 5. A section heading becomes a styled <div>, breaking the heading outline.
  const faqTitle = doc.querySelector<HTMLElement>('[data-testid="faq-title"]');
  if (faqTitle) {
    const fake = doc.createElement('div');
    fake.className = 'fake-heading';
    fake.style.cssText = 'font-size:1.75rem;font-weight:700;margin-bottom:1.25rem';
    fake.dataset.testid = 'faq-title';
    fake.textContent = faqTitle.textContent;
    faqTitle.replaceWith(fake);
  }

  // 6. The name error is no longer linked to its field.
  doc.querySelector('[data-testid="name"]')?.removeAttribute('aria-describedby');

  // 7. The dialog focus trap and focus restoration are disabled in main.ts.
}
