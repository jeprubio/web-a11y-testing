import './style.css';
import { setupDialog } from './dialog';
import { setupForm } from './form';
import { setupEffects } from './effects';
import { applyBrokenMode, isBrokenMode } from './broken';

const broken = isBrokenMode(window.location.search);

setupDialog({ trapFocus: !broken, restoreFocus: !broken });
setupForm();
setupEffects();

if (broken) {
  applyBrokenMode(document);
}
