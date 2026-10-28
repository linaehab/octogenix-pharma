import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PatternOverlay } from '../pattern-overlay/pattern-overlay';
import { HERO_MEDIA } from './hero-media';

/**
 * Hero after the official Jovie home: text on the yellow pattern, and the video (or its poster
 * until the video is supplied) in a curved frame reaching the top and the far edge, with a wavy
 * yellow bottom edge. The frame is mirrored in Arabic.
 */
@Component({
  selector: 'app-jovie-hero',
  imports: [RouterLink, TranslatePipe, PatternOverlay],
  templateUrl: './jovie-hero.html',
  styleUrl: './jovie-hero.css',
})
export class JovieHero {
  protected readonly media = HERO_MEDIA;
  protected readonly isPlaying = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    const document = inject(DOCUMENT);
    // Autoplay (muted) only when the visitor has not asked for reduced motion.
    afterNextRender(() => {
      const video = this.video()?.nativeElement;
      const reduceMotion = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (video && !reduceMotion) {
        video.play().then(() => this.isPlaying.set(true)).catch(() => this.isPlaying.set(false));
      }
    });
  }

  protected togglePlayback(): void {
    const video = this.video()?.nativeElement;
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play().then(() => this.isPlaying.set(true)).catch(() => this.isPlaying.set(false));
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
  }
}
