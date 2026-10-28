import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Remembers, for the current browser session only, that the visitor dismissed the Jovie intro
 * notice. sessionStorage is cleared when the session ends, so the notice shows again in a new
 * session. If storage is unavailable (blocked, private mode, quota), the dismissal is kept in
 * memory, which still hides the notice until the page is reloaded.
 */
@Injectable({ providedIn: 'root' })
export class IntroDialogService {
  static readonly STORAGE_KEY = 'jovie.intro.dismissed';

  private readonly document = inject(DOCUMENT);
  private dismissedInMemory = false;

  shouldShow(): boolean {
    if (this.dismissedInMemory) {
      return false;
    }
    try {
      return this.storage()?.getItem(IntroDialogService.STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  }

  dismiss(): void {
    this.dismissedInMemory = true;
    try {
      this.storage()?.setItem(IntroDialogService.STORAGE_KEY, '1');
    } catch {
      // Storage blocked or full: the in-memory flag above still applies.
    }
  }

  private storage(): Storage | null {
    return this.document.defaultView?.sessionStorage ?? null;
  }
}
