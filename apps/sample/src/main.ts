import './style.css';
import { setupDialog } from './dialog';
import { setupForm } from './form';
import { setupEffects } from './effects';
import { setupFocusScroll } from './focus-scroll';
import { applyBrokenMode, isBrokenMode } from './broken';

const broken = isBrokenMode(window.location.search);

setupDialog({ trapFocus: !broken, restoreFocus: !broken });
setupForm();
setupFocusScroll();
setupEffects();

if (broken) {
  applyBrokenMode(document);
}

// Lets tests know every script above has run, instead of guessing with network idle.
document.documentElement.dataset.ready = 'true';
