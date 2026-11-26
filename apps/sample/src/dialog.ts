/**
 * Accessible modal dialog built on the native <dialog> element.
 *
 * Native `showModal()` already gives us: role="dialog", aria-modal, an inert background
 * and Escape to close. We add two things browsers do not guarantee consistently:
 *  - a focus trap, so Tab and Shift+Tab cycle inside the dialog instead of escaping
 *    to the browser chrome;
 *  - focus restoration, so closing the dialog returns focus to the button that opened it.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogOptions {
  trapFocus: boolean;
  restoreFocus: boolean;
}

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden') && el.getClientRects().length > 0,
  );
}

export function setupDialog(options: DialogOptions): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-testid="details-dialog"]');
  const opener = document.querySelector<HTMLButtonElement>('[data-testid="open-details"]');
  if (!dialog || !opener) return;

  let returnFocusTo: HTMLElement | null = null;

  opener.addEventListener('click', () => {
    returnFocusTo = document.activeElement as HTMLElement | null;
    dialog.showModal();
    // Put focus on the first control so keyboard users start inside the dialog.
    getFocusable(dialog)[0]?.focus();
  });

  dialog.querySelector('[data-testid="dialog-close"]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-testid="dialog-ok"]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-testid="dialog-register"]')?.addEventListener('click', () => {
    returnFocusTo = null; // the link moves the user on; let the browser follow it
    dialog.close();
  });

  if (options.trapFocus) {
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  dialog.addEventListener('close', () => {
    if (options.restoreFocus && returnFocusTo) {
      returnFocusTo.focus();
    } else if (!options.restoreFocus) {
      // Broken mode: drop focus on the body, the classic "where am I?" bug.
      (document.activeElement as HTMLElement | null)?.blur();
    }
    returnFocusTo = null;
  });
}
