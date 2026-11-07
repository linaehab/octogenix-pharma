import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Loading, empty and error states of a dashboard panel. Loading is announced politely; errors
 * are alerts and offer a retry when the page handles one.
 */
@Component({
  selector: 'app-admin-state',
  imports: [TranslatePipe],
  template: `
    @switch (kind()) {
      @case ('loading') {
        <div class="adm-state" role="status" aria-live="polite">
          <span class="adm-spinner" aria-hidden="true"></span>
          <p>{{ (message() ?? 'admin.state.loading') | translate }}</p>
        </div>
      }
      @case ('empty') {
        <div class="adm-state is-empty">
          <p>{{ (message() ?? 'admin.state.empty') | translate }}</p>
        </div>
      }
      @case ('error') {
        <div class="adm-state is-error" role="alert">
          <p>{{ (message() ?? 'admin.state.error') | translate }}</p>
          @if (retryable()) {
            <button type="button" class="adm-button is-light" (click)="retry.emit()">{{ 'admin.state.retry' | translate }}</button>
          }
        </div>
      }
    }
  `,
})
export class AdminState {
  readonly kind = input.required<'loading' | 'empty' | 'error'>();
  /** Translation key; each kind has a default text. */
  readonly message = input<string | null>(null);
  readonly retryable = input(true);
  readonly retry = output<void>();
}
