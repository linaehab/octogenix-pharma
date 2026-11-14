import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements OnDestroy {
  /** Licensed photographs (Unsplash License), resized and compressed for the web. */
  protected readonly slides = [
    '/assets/images/corporate-v2/hero-scientist.jpg',
    '/assets/images/corporate-v2/hero-cells.jpg',
    '/assets/images/corporate-v2/hero-port.jpg',
  ];

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
      this.activeIndex.update((index) => (index + 1) % this.slides.length);
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
