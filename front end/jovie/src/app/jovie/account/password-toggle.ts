import { Component, ElementRef, contentChild, input, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Show / hide for the password input projected inside it:
 * `<app-password-toggle><input type="password" ... /></app-password-toggle>`.
 * The button sits on the input's inline end (right in English, left in Arabic).
 */
@Component({
  selector: 'app-password-toggle',
  imports: [TranslatePipe],
  template: `
    <ng-content />
    <button type="button" class="toggle" [attr.aria-pressed]="visible()" [attr.aria-controls]="inputId()"
      [attr.aria-label]="(visible() ? 'account.password.hide' : 'account.password.show') | translate" (click)="toggle()">
      @if (visible()) {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.4 12.4 0 0 1-3 3.7M6.4 7.6C4.5 8.9 3.2 10.6 2.5 12c1 2 4.5 6 9.5 6a9.6 9.6 0 0 0 4.2-1M9.9 10a3 3 0 0 0 4.1 4.1" /></svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" /><circle cx="12" cy="12" r="3" /></svg>
      }
    </button>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    :host ::ng-deep input {
      padding-inline-end: 3.25rem;
    }

    .toggle {
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0.25rem;
      display: grid;
      place-items: center;
      width: 2.75rem;
      margin-block: auto;
      height: 2.75rem;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: none;
      color: var(--jv-night, #203564);
      cursor: pointer;
    }

    .toggle:focus-visible {
      outline: 3px solid var(--jv-night, #203564);
      outline-offset: -3px;
    }

    svg {
      width: 1.35rem;
      height: 1.35rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class PasswordToggle {
  private readonly field = contentChild.required<ElementRef<HTMLInputElement>>('password');
  readonly inputId = input<string | null>(null);
  protected readonly visible = signal(false);

  protected toggle(): void {
    const next = !this.visible();
    this.visible.set(next);
    this.field().nativeElement.type = next ? 'text' : 'password';
  }
}
