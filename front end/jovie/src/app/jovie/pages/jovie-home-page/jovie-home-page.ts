import { Component } from '@angular/core';
import { HomeParents } from '../../components/home/home-parents';
import { HomeProducts } from '../../components/home/home-products';
import { HomeSolution } from '../../components/home/home-solution';
import { HomeWhere } from '../../components/home/home-where';
import { JovieHero } from '../../components/jovie-hero/jovie-hero';
import { ShopSection } from '../../components/shop-section/shop-section';

/**
 * Jovie store home (/jovie): the sections of the official jovieproducts.com home in their order,
 * with one addition, the Shop cards, straight after the hero.
 */
@Component({
  selector: 'app-jovie-home-page',
  imports: [JovieHero, ShopSection, HomeSolution, HomeParents, HomeProducts, HomeWhere],
  template: `
    <app-jovie-hero />
    <app-shop-section [summary]="true" />
    <app-home-solution />
    <app-home-parents />
    <app-home-products />
    <app-home-where />
  `,
  styles: ':host { display: block; }',
})
export class JovieHomePage {}
