import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

/** Session key set once the intro has been shown in this visit (browser tab session). */
const INTRO_SEEN_KEY = 'octogenix.introSeen';

/** Remembers that the intro was shown in this visit. Storage may be unavailable: then nothing is kept. */
export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // private mode or blocked storage: the intro may show again, the site still works
  }
}

function introSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** The intro is shown once per visit: afterwards the site address opens the Home page directly. */
export const introOnce: CanActivateFn = () => {
  if (isPlatformBrowser(inject(PLATFORM_ID)) && introSeen()) {
    return inject(Router).parseUrl('/home');
  }
  return true;
};
