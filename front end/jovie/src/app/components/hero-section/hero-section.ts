import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements OnDestroy {
  private readonly content = inject(SiteContentService);

  /** Licensed photographs (Pexels / Unsplash licences), square crops for the round frame. */
  private static readonly DEFAULT_SLIDES = [
    '/assets/images/corporate-v3/hero-hands-capsules.webp',
    '/assets/images/corporate-v3/hero-hands-care.webp',
    '/assets/images/corporate-v3/hero-hands-tablets.webp',
  ];

  /** The slides managed in the dashboard (Home: top section), or the bundled ones until they load. */
  protected readonly slides = computed(() => {
    const remote = (this.content.list('home.hero_slides') ?? [])
      .map((item) => item.image?.url ?? '')
      .filter((url) => url !== '');
    return remote.length ? remote : HeroSection.DEFAULT_SLIDES;
  });

  /** CSS background for a slide; quoted so file names with spaces still load. */
  protected background(url: string): string {
    return `url("${url.replace(/"/g, '%22')}")`;
  }

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
