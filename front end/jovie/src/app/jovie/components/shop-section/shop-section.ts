import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { JovieCatalogService } from '../../data/jovie-catalog.service';
import { DecorShape } from '../decor-shape/decor-shape';
import { ProductCard } from '../product-card/product-card';
import { TestModeNotice } from '../../store/test-mode-notice';

@Component({
  selector: 'app-shop-section',
  imports: [RouterLink, TranslatePipe, ProductCard, DecorShape, TestModeNotice],
  templateUrl: './shop-section.html',
  styleUrl: './shop-section.css',
})
export class ShopSection {
  protected readonly catalog = inject(JovieCatalogService);
  /** Home: heading, cards and a link to /jovie/shop. Shop page: the cards under the page intro. */
  readonly summary = input(false);
  protected readonly skeletons = [1, 2, 3];

  constructor() {
    this.catalog.load();
  }
}
