import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { markIntroSeen } from './intro-seen';

/** Time on the intro before the website opens: the logo reveal and one pass of light. */
const INTRO_MS = 3600;
/** Shorter stay when the visitor prefers reduced motion (no animation is played). */
const INTRO_REDUCED_MS = 1200;

/**
 * Opening page at the site address, after the reference intro: a dark charcoal screen, the
 * official logo revealed in the centre, and a band of light sweeping across the whole screen
 * (through the logo). The logo is the white version of the official logo (charcoal parts in
 * white, the lime arm unchanged), over a faint glow, with the company line under it. The website
 * then opens by itself (Home, replacing the intro in the history so Back does not return to it).
 */
@Component({
  selector: 'app-welcome-page',
  imports: [TranslatePipe],
  template: `
    <main class="welcome">
      <span class="welcome-beam" aria-hidden="true"></span>

      <div class="welcome-center">
        <h1 class="welcome-mark">
          <span class="welcome-glow" aria-hidden="true"></span>
          <img
            src="/assets/images/brand/octogenix-logo-white.png"
            [alt]="'company.name' | translate"
            width="640"
            height="219"
          />
        </h1>
        <p class="welcome-line">{{ 'header.tagline' | translate }}</p>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .welcome {
      position: relative;
      display: grid;
      min-height: 100vh;
      min-height: 100svh;
      place-items: center;
      overflow: hidden;
      padding: 32px 20px;
      background: radial-gradient(ellipse at 50% 46%, #3f4143 0%, #313234 38%, #262729 72%, #1f2021 100%);
      /* outside the corporate layout, so the site's font stack is set here */
      font-family: 'Onest', 'IBM Plex Sans Arabic', sans-serif;
    }

    :host-context([dir='rtl']) .welcome {
      font-family: 'IBM Plex Sans Arabic', 'Onest', sans-serif;
    }

    /* Band of light crossing the whole screen, through the logo, then resting before the next pass */
    .welcome-beam {
      position: absolute;
      z-index: 2;
      top: -30%;
      left: 0;
      width: clamp(120px, 14vw, 220px);
      height: 160%;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.07) 30%,
        rgba(232, 244, 205, 0.22) 50%,
        rgba(255, 255, 255, 0.07) 70%,
        rgba(255, 255, 255, 0) 100%
      );
      filter: blur(2px);
      transform: translateX(-30vw) skewX(-16deg);
      animation: welcome-beam 6.5s cubic-bezier(0.45, 0.05, 0.35, 1) 1.1s infinite;
      pointer-events: none;
    }

    .welcome-center {
      position: relative;
      z-index: 1;
      display: grid;
      justify-items: center;
      gap: 0;
      text-align: center;
    }

    /* The white logo over a faint light (no box, no edges) */
    .welcome-mark {
      position: relative;
      display: grid;
      place-items: center;
      margin: 0;
      padding: clamp(40px, 5vw, 64px) clamp(56px, 8vw, 110px) clamp(14px, 1.6vw, 20px);
    }

    .welcome-glow {
      position: absolute;
      inset: -18% -14%;
      border-radius: 50%;
      background: radial-gradient(
        closest-side,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 45%,
        rgba(255, 255, 255, 0) 100%
      );
      animation: welcome-glow 1400ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }

    .welcome-mark img {
      position: relative;
      display: block;
      width: auto;
      height: clamp(78px, 9.5vw, 128px);
      max-width: 78vw;
      object-fit: contain;
      animation: welcome-logo 1300ms cubic-bezier(0.2, 0.7, 0.2, 1) 250ms both;
    }

    .welcome-line {
      margin: 0;
      color: #b0d35b;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      animation: welcome-fade 800ms ease 1300ms both;
    }

    :host-context([dir='rtl']) .welcome-line {
      font-size: 14px;
      letter-spacing: 0;
    }

    @keyframes welcome-glow {
      from {
        opacity: 0;
        transform: scale(0.6);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    /* The logo comes into focus: from soft and slightly small to sharp */
    @keyframes welcome-logo {
      from {
        opacity: 0;
        filter: blur(10px);
        transform: translateY(10px) scale(0.92);
      }
      60% {
        opacity: 1;
        filter: blur(0);
      }
      to {
        opacity: 1;
        filter: none;
        transform: none;
      }
    }

    /* One pass across the screen in the first ~40% of the cycle, then a pause */
    @keyframes welcome-beam {
      0% {
        transform: translateX(-30vw) skewX(-16deg);
      }
      40%,
      100% {
        transform: translateX(130vw) skewX(-16deg);
      }
    }

    @keyframes welcome-fade {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .welcome-glow,
      .welcome-mark img,
      .welcome-line {
        animation: none;
      }

      .welcome-beam {
        display: none;
      }
    }
  `,
})
export class WelcomePage {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Browser only: the server-rendered page stays on the intro and the browser takes it on.
    afterNextRender(() => {
      markIntroSeen();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timer = window.setTimeout(
        () => void this.router.navigateByUrl('/home', { replaceUrl: true }),
        reduced ? INTRO_REDUCED_MS : INTRO_MS,
      );
      this.destroyRef.onDestroy(() => window.clearTimeout(timer));
    });
  }
}
