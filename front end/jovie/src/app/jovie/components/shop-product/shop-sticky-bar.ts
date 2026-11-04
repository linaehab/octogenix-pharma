import { Component, input, output } from '@angular/core';

/** The product page's sticky Add to Cart bar (kabrita.com), shown once the main button scrolled away. */
@Component({
  selector: 'app-shop-sticky-bar',
  host: { '[class.is-shown]': 'shown()', '[attr.aria-hidden]': '!shown()', '[attr.inert]': "shown() ? null : ''" },
  template: `
    <div class="jv-container row">
      @if (image()) {
        <img [src]="image()" alt="" width="48" height="48" />
      }
      <strong>{{ name() }}</strong>
      <button class="add" type="button" [disabled]="disabled()" (click)="add.emit()">{{ label() }}</button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      z-index: 40;
      padding-block: 0.6rem;
      background: var(--jv-white);
      box-shadow: 0 -6px 20px rgba(32, 53, 100, 0.12);
      transform: translateY(110%);
      transition: transform 0.3s ease;
    }

    :host(.is-shown) {
      transform: none;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }

    img {
      width: 3rem;
      height: 3rem;
      object-fit: contain;
    }

    strong {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .add {
      min-height: 3rem;
      padding: 0.5rem 1.5rem;
      border: 0;
      border-radius: 12px;
      background: var(--jv-night);
      color: var(--jv-white);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .add:hover:not(:disabled) {
      background: var(--jv-sunshine);
      color: var(--jv-night);
    }

    .add:disabled {
      background: #d9dee8;
      color: #4d5d78;
      cursor: not-allowed;
    }

    @media (max-width: 599px) {
      strong {
        display: none;
      }

      .add {
        flex: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `,
})
export class ShopStickyBar {
  readonly shown = input(false);
  readonly image = input<string | undefined>(undefined);
  readonly name = input('');
  readonly label = input('');
  readonly disabled = input(false);
  readonly add = output<void>();
}
