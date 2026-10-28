import { Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PageIntro } from '../../components/page-intro/page-intro';
import { ShopSection } from '../../components/shop-section/shop-section';

/** /jovie/shop: every Jovie product. */
@Component({
  selector: 'app-jovie-shop-page',
  imports: [TranslatePipe, PageIntro, ShopSection],
  template: `
    <app-page-intro [title]="'jovie.page.shop.title' | translate" [lead]="'jovie.page.shop.lead' | translate" />
    <app-shop-section />
  `,
  styles: ':host { display: block; }',
})
export class JovieShopPage {}
