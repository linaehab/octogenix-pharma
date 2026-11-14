import { Component, input } from '@angular/core';

export type CxIconName =
  | 'story' | 'mission' | 'vision' | 'values'
  | 'marketing' | 'contracting' | 'order' | 'delivery' | 'payment' | 'support'
  | 'distribution' | 'regulatory' | 'agency' | 'import' | 'export' | 'scientific'
  | 'person' | 'pin' | 'quality' | 'innovation' | 'integrity' | 'growth';

/**
 * Corporate icons in the reference style: a charcoal outline over soft lime fills (duotone).
 * Decorative: always aria-hidden; the text next to an icon carries the meaning.
 */
@Component({
  selector: 'app-cx-icon',
  template: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('story') {
          <path class="l" d="M6 12c6-2 12-1 18 3v25c-6-4-12-5-18-3z" /><path class="l2" d="M42 12c-6-2-12-1-18 3v25c6-4 12-5 18-3z" />
          <path d="M6 12c6-2 12-1 18 3 6-4 12-5 18-3v25c-6-2-12-1-18 3-6-4-12-5-18-3zM24 15v25" />
        }
        @case ('mission') {
          <circle class="l" cx="22" cy="26" r="16" /><circle class="l2" cx="22" cy="26" r="8" />
          <circle cx="22" cy="26" r="16" /><circle cx="22" cy="26" r="8" /><path d="M22 26 40 8M34 8h6v6" />
        }
        @case ('vision') {
          <circle class="l" cx="24" cy="24" r="17" />
          <circle cx="24" cy="24" r="17" /><path d="M7 24h34M24 7c-6 6-6 28 0 34M24 7c6 6 6 28 0 34M10 15h28M10 33h28" />
        }
        @case ('values') {
          <path class="l" d="M24 40S8 30 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 22-16 22z" />
          <path d="M24 40S8 30 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 22-16 22z" /><path d="m17 22 5 5 9-9" />
        }
        @case ('marketing') {
          <rect class="l" x="8" y="22" width="32" height="18" rx="2" /><rect class="l2" x="10" y="6" width="11" height="8" rx="1" /><rect class="l2" x="27" y="6" width="11" height="8" rx="1" />
          <rect x="8" y="22" width="32" height="18" rx="2" /><path d="M4 40h40M10 6h11v8H10zM10 6l5.5 4L21 6M27 6h11v8H27zM27 6l5.5 4L38 6M17 14l3 5M31 14l-3 5" />
        }
        @case ('contracting') {
          <path class="l" d="M10 6h20l8 8v28H10z" />
          <path d="M10 6h20l8 8v28H10zM30 6v8h8M16 18h14M16 24h14M16 30h7" /><path d="m26 36 3-3 3 3 4-5" />
        }
        @case ('order') {
          <rect class="l" x="10" y="8" width="28" height="34" rx="3" />
          <rect x="10" y="8" width="28" height="34" rx="3" /><path d="M18 8V5h12v3M16 20l2 2 4-4M26 20h7M16 30l2 2 4-4M26 30h7" />
        }
        @case ('delivery') {
          <rect class="l" x="4" y="12" width="24" height="20" rx="1" /><path class="l2" d="M28 18h9l7 8v6H28z" />
          <path d="M4 12h24v20H4zM28 18h9l7 8v6H28" /><circle class="w" cx="13" cy="35" r="4" /><circle class="w" cx="36" cy="35" r="4" />
        }
        @case ('payment') {
          <rect class="l" x="5" y="11" width="38" height="26" rx="3" /><path class="d" d="M5 17h38v6H5z" />
          <rect x="5" y="11" width="38" height="26" rx="3" /><path d="M11 30h8M25 30h4" />
        }
        @case ('support') {
          <path class="l" d="M8 26a16 16 0 0 1 32 0v8H32V24h8M8 24h8v10H8z" />
          <path d="M8 34V26a16 16 0 0 1 32 0v8M8 24h8v10H8zM32 24h8v10h-8zM36 34c0 5-4 7-10 7" /><circle cx="24" cy="41" r="2" />
        }
        @case ('distribution') {
          <rect class="l" x="20" y="14" width="16" height="16" rx="1" />
          <path d="M8 6h4l6 28h22M20 14h16v16H20zM24 14v6h8v-6" /><circle class="w" cx="18" cy="38" r="4" /><circle cx="36" cy="38" r="2" />
        }
        @case ('regulatory') {
          <path class="l" d="M24 4 40 10v12c0 10-7 17-16 22-9-5-16-12-16-22V10z" />
          <path d="M24 4 40 10v12c0 10-7 17-16 22-9-5-16-12-16-22V10z" /><path d="m16 24 6 6 10-12" />
        }
        @case ('agency') {
          <rect class="l" x="6" y="16" width="36" height="24" rx="3" /><path class="l2" d="M6 24h36v4H6z" />
          <rect x="6" y="16" width="36" height="24" rx="3" /><path d="M18 16v-5h12v5M6 26h36M22 26v4h4v-4" />
        }
        @case ('import') {
          <circle class="l" cx="20" cy="20" r="14" /><rect class="l2" x="26" y="26" width="16" height="14" rx="1" />
          <circle cx="20" cy="20" r="14" /><path d="M6 20h28M20 6c-5 5-5 23 0 28M20 6c5 5 5 23 0 28M26 26h16v14H26zM34 26v6" /><path d="M34 14v-8M31 9l3-3 3 3" transform="rotate(180 34 10)" />
        }
        @case ('export') {
          <circle class="l" cx="20" cy="20" r="14" /><path class="l2" d="M28 28h8l6 6v6H28z" />
          <circle cx="20" cy="20" r="14" /><path d="M6 20h28M20 6c-5 5-5 23 0 28M20 6c5 5 5 23 0 28M28 28h8l6 6v6H28z" /><circle class="w" cx="32" cy="41" r="2.5" /><circle class="w" cx="40" cy="41" r="2.5" />
        }
        @case ('scientific') {
          <path class="l" d="M14 40h20l-4-14H18z" />
          <path d="M20 4h8M22 4v10l-10 26h24L26 14V4M15 32h18" /><circle cx="22" cy="33" r="1.5" /><circle cx="28" cy="36" r="1.5" />
        }
        @case ('person') {
          <circle class="l" cx="24" cy="15" r="8" /><path class="l2" d="M8 42a16 16 0 0 1 32 0z" />
          <circle cx="24" cy="15" r="8" /><path d="M8 42a16 16 0 0 1 32 0z" />
        }
        @case ('pin') {
          <path class="l" d="M24 44S10 28 10 18a14 14 0 0 1 28 0c0 10-14 26-14 26z" />
          <path d="M24 44S10 28 10 18a14 14 0 0 1 28 0c0 10-14 26-14 26z" /><path d="m18 18 4 4 8-8" />
        }
        @case ('quality') {
          <circle class="l" cx="24" cy="20" r="12" /><path class="l2" d="M16 30l-4 14 12-6 12 6-4-14" />
          <circle cx="24" cy="20" r="12" /><path d="M16 30l-4 14 12-6 12 6-4-14M19 20l4 4 7-7" />
        }
        @case ('innovation') {
          <path class="l" d="M17 32c0-5-6-8-6-15a13 13 0 0 1 26 0c0 7-6 10-6 15z" />
          <path d="M17 32c0-5-6-8-6-15a13 13 0 0 1 26 0c0 7-6 10-6 15zM18 37h12M20 42h8" />
        }
        @case ('integrity') {
          <path class="l" d="M6 26l10-10 8 6 8-6 10 10-14 14h-4z" />
          <path d="M6 26l10-10 8 6 8-6 10 10M6 26l14 14h8l14-14M18 30l4 4M22 26l6 6" />
        }
        @default {
          <path class="l" d="M10 40V26h7v14zM21 40V18h7v22zM32 40V8h7v32z" />
          <path d="M10 40V26h7v14zM21 40V18h7v22zM32 40V8h7v32zM6 42h38" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      width: var(--cx-icon-size, 56px);
      height: var(--cx-icon-size, 56px);
      flex: 0 0 auto;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: #333435;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
      overflow: visible;
    }

    .l,
    .l2,
    .d {
      stroke: none;
    }

    .l {
      fill: #c3df83;
    }

    .l2 {
      fill: #b0d35b;
    }

    .d {
      fill: #333435;
    }

    .w {
      fill: #fff;
    }
  `,
})
export class CxIcon {
  readonly name = input<CxIconName | string>('growth');
}

/** Icon for a service, chosen from its English title (works for dashboard and bundled services). */
export function serviceIcon(englishTitle: string): CxIconName {
  const t = englishTitle.toLowerCase();
  const map: [string, CxIconName][] = [
    ['contract', 'contracting'], ['reception', 'order'], ['delivery', 'delivery'], ['supply', 'delivery'],
    ['payment', 'payment'], ['customer service', 'support'], ['support', 'support'], ['distribution', 'distribution'],
    ['regulatory', 'regulatory'], ['agency', 'agency'], ['marketing', 'marketing'], ['import', 'import'],
    ['export', 'export'], ['scientific', 'scientific'],
  ];
  return map.find(([key]) => t.includes(key))?.[1] ?? 'growth';
}
