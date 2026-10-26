import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HomeBanner } from '../home-banner/home-banner';

/** Bundled slides, shown until (or unless) the dashboard's hero slides are loaded. */
const DEFAULT_SLIDES = [
  '/assets/images/factory-worker-packaging-boxes.jpg',
  '/assets/images/interior-large-distribution-warehouse-with-shelves-stacked-with-palettes-goods-ready-market.jpg',
  '/assets/images/medium-shot-delivery-man-with-mask.jpg',
];

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, TranslatePipe, HomeBanner],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements OnDestroy {
  private readonly content = inject(SiteContentService);

  protected readonly slides = computed(() => {
    const remote = (this.content.list('home.hero_slides') ?? [])
      .map((item) => item.image?.url)
      .filter((url): url is string => !!url);
    return remote.length ? remote : DEFAULT_SLIDES;
  });

  readonly activeIndex = signal(0);
  private slideIntervalId: number | null = null;

  constructor() {
    this.startSlider();
  }

  ngOnDestroy(): void {
    this.stopSlider();
  }

  protected selectSlide(index: number): void {
    this.activeIndex.set(index);
    this.restartSlider();
  }

  private startSlider(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.stopSlider();
    this.slideIntervalId = window.setInterval(() => {
      this.activeIndex.update((index) => (index + 1) % this.slides().length);
    }, 5000);
  }

  private restartSlider(): void {
    this.stopSlider();
    this.startSlider();
  }

  private stopSlider(): void {
    if (this.slideIntervalId !== null) {
      window.clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
  }
}
