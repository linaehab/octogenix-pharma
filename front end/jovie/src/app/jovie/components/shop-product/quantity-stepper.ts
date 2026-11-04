import { Component, input, output } from '@angular/core';

/** − [n] + quantity control (1…max); emits the new quantity. */
@Component({
  selector: 'app-quantity-stepper',
  host: { role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    <button type="button" [disabled]="value() <= 1" [attr.aria-label]="decreaseLabel()" (click)="emit(value() - 1)">−</button>
    <input type="number" inputmode="numeric" min="1" [max]="max()" [value]="value()" [attr.aria-label]="label()"
      (change)="typed($event)" />
    <button type="button" [disabled]="value() >= max()" [attr.aria-label]="increaseLabel()" (click)="emit(value() + 1)">+</button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      min-height: 3.2rem;
      border: 1px solid rgba(32, 53, 100, 0.45);
      border-radius: 999px;
    }

    button {
      width: 2.9rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 1.3rem;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.35;
      cursor: default;
    }

    input {
      width: 2.6rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: center;
      appearance: textfield;
    }

    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }
  `,
})
export class QuantityStepper {
  readonly value = input.required<number>();
  readonly max = input(99);
  readonly label = input('');
  readonly decreaseLabel = input('');
  readonly increaseLabel = input('');
  readonly changed = output<number>();

  protected emit(value: number): void {
    this.changed.emit(Math.max(1, Math.min(this.max(), Math.floor(value))));
  }

  protected typed(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number.parseInt(input.value, 10);
    if (Number.isFinite(value)) {
      this.emit(value);
    }
    input.value = String(this.value());
  }
}
