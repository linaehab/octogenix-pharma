import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { DecorShape } from '../decor-shape/decor-shape';

/**
 * Feeding guide page, between the feeding chart and "How To Prepare Formula": the Jovie process
 * animation (src/assets/jovie assets/jovie shop/Jovie process animation FINAL.mp4, 1:11, encoded
 * H.264 1920 × 1080 with its sound, ~18 MB; the poster is its "The process behind Jovie" title) in
 * a wide rounded frame, almost the screen's width, over a pale Jovie band, with the official
 * graphic elements at its corners.
 * It plays muted and looped while on screen (not when the visitor prefers reduced motion), with
 * buttons to pause/play and to turn the sound on/off.
 */
@Component({
  selector: 'app-feeding-film',
  imports: [TranslatePipe, DecorShape],
  template: `
    <section class="film" [attr.aria-label]="'jovie.film.label' | translate">
      <div class="jv-container stage">
        <app-decor-shape class="decor decor--berry" shape="berry-leaves" />
        <app-decor-shape class="decor decor--cloud" shape="cloud-lightblue" />
        <app-decor-shape class="decor decor--ring" shape="striped-circle-green" />
        <app-decor-shape class="decor decor--leaves" shape="circle-leaves-yellow-blue" />

        <div class="frame">
          <!-- [muted] is a property binding: the attribute alone does not mute a video created by script. -->
          <video #video [muted]="muted()" loop playsinline preload="metadata"
            poster="/assets/images/jovie/feeding-guide-process-poster.jpg"
            [attr.aria-label]="'jovie.film.label' | translate"
            (play)="playing.set(true)" (pause)="playing.set(false)">
            <source src="/assets/images/jovie/feeding-guide-process.mp4" type="video/mp4" />
          </video>

          <div class="controls">
            <button type="button" class="control" (click)="togglePlay()"
              [attr.aria-label]="(playing() ? 'jovie.film.pause' : 'jovie.film.play') | translate">
              @if (playing()) {
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" /></svg>
              } @else {
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="fill" d="M8 5.5v13l10.5-6.5z" /></svg>
              }
            </button>
            <button type="button" class="control" (click)="toggleSound()" [attr.aria-pressed]="!muted()"
              [attr.aria-label]="(muted() ? 'jovie.film.unmute' : 'jovie.film.mute') | translate">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path class="fill" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                @if (muted()) {
                  <path d="M16 9.5l5 5M21 9.5l-5 5" />
                } @else {
                  <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './feeding-film.css',
})
export class FeedingFilm {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly playing = signal(false);
  protected readonly muted = signal(true);
  /** Paused by the visitor: scrolling it back into view does not start it again. */
  private pausedByVisitor = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      const reduceMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || typeof view?.IntersectionObserver !== 'function') {
        return;
      }
      // Watches the section itself and plays the video element of the moment (robust if the view
      // re-renders its contents).
      const observer = new view.IntersectionObserver(
        ([entry]) => {
          const video = this.video().nativeElement;
          if (entry.isIntersecting && !this.pausedByVisitor) {
            video.play().catch(() => this.playing.set(false));
          } else if (!entry.isIntersecting) {
            video.pause();
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected togglePlay(): void {
    const video = this.video().nativeElement;
    if (video.paused) {
      this.pausedByVisitor = false;
      video.play().catch(() => this.playing.set(false));
    } else {
      this.pausedByVisitor = true;
      video.pause();
    }
  }

  protected toggleSound(): void {
    const video = this.video().nativeElement;
    video.muted = !video.muted;
    this.muted.set(video.muted);
    if (!video.muted && video.paused) {
      this.pausedByVisitor = false;
      video.play().catch(() => this.playing.set(false));
    }
  }
}
