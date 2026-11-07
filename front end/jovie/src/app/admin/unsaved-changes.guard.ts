import { CanDeactivateFn } from '@angular/router';

/** A page with an edit form that may hold unsaved changes. */
export interface LeavesSafely {
  canLeave(): boolean | Promise<boolean>;
}

/** Asks the page before leaving it, so unsaved changes are not lost by accident. */
export const unsavedChanges: CanDeactivateFn<LeavesSafely> = (page) => page.canLeave();
