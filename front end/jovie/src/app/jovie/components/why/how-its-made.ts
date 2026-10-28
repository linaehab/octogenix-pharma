import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { WHY_IMAGES } from '../../data/why-content';
import { injectWhyContent } from './why-content';

/** Seconds each step stays before the carousel moves on by itself. */
export const STEP_INTERVAL_MS = 5000;

/**
 * "How it's Made" (official him-block): the six production steps as a carousel with the official
 * step badges, masked photos and range navigation (Previous / dots / Next). It also moves on by
 * itself with a smooth slide, pausing while hovered or focused, and not at all when the visitor
 * prefers reduced motion.
 */
@Component({
  selector: 'app-how-its-made',
  templateUrl: './how-its-made.html',
  styleUrl: './how-its-made.css',
  host: { '(mouseenter)': 'paused.set(true)', '(mouseleave)': 'paused.set(false)', '(focusin)': 'paused.set(true)', '(focusout)': 'paused.set(false)' },
})
export class HowItsMade {
  protected readonly content = injectWhyContent();
  protected readonly images = WHY_IMAGES.steps;
  protected readonly active = signal(0);
  protected readonly paused = signal(false);

  constructor() {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const window = document.defaultView;
      if (!window || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const timer = window.setInterval(() => {
        if (!this.paused()) {
          this.next();
        }
      }, STEP_INTERVAL_MS);
      destroyRef.onDestroy(() => window.clearInterval(timer));
    });
  }

  protected go(index: number): void {
    const count = this.content().howItsMade.slides.length;
    this.active.set((index + count) % count);
  }

  protected next(): void {
    this.go(this.active() + 1);
  }

  protected previous(): void {
    this.go(this.active() - 1);
  }
}
