import { Component, input } from '@angular/core';

export type CxIconName =
  | 'story' | 'mission' | 'vision' | 'values'
  | 'marketing' | 'contracting' | 'order' | 'delivery' | 'payment' | 'support'
  | 'distribution' | 'regulatory' | 'agency' | 'import' | 'export' | 'scientific'
  | 'person' | 'pin' | 'quality' | 'innovation' | 'integrity' | 'growth'
  | 'medicine' | 'supplement' | 'infant' | 'partnership'
  | 'pharmacy' | 'hospital' | 'clinic'
  | 'team' | 'responsibility' | 'professionalism' | 'efficiency' | 'personal-growth' | 'trust';

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
        @case ('pharmacy') {
          <path class="l" d="M7 20h34v22H7z" /><path class="l2" d="M5 12 9 6h30l4 6v6a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0z" />
          <path d="M5 12 9 6h30l4 6v6a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0zM5 12h38M7 21v21h34V21M4 42h40" />
          <path class="w" d="M21 25h6v4h4v6h-4v4h-6v-4h-4v-6h4z" /><path d="M21 25h6v4h4v6h-4v4h-6v-4h-4v-6h4z" />
        }
        @case ('hospital') {
          <path class="l" d="M8 18h32v24H8z" /><rect class="l2" x="16" y="6" width="16" height="14" rx="1" />
          <path d="M8 18h8M32 18h8v24H8V18M16 6h16v36H16zM4 42h40M21 42v-6h6v6M22 13h4M24 11v4M11 24h2M11 30h2M35 24h2M35 30h2" />
        }
        @case ('clinic') {
          <circle class="l" cx="34" cy="30" r="8" />
          <path d="M12 6H9a2 2 0 0 0-2 2v10a9 9 0 0 0 18 0V8a2 2 0 0 0-2-2h-3M16 27v5a10 10 0 0 0 20 0v-2" /><circle cx="34" cy="30" r="8" /><circle class="l2" cx="34" cy="30" r="3" /><circle cx="34" cy="30" r="3" />
        }
        @case ('team') {
          <circle class="l2" cx="24" cy="13" r="6" /><path class="l2" d="M14 34a10 10 0 0 1 20 0z" />
          <circle class="l" cx="11" cy="18" r="4.5" /><circle class="l" cx="37" cy="18" r="4.5" />
          <path class="l" d="M3 36a8 8 0 0 1 13-6M45 36a8 8 0 0 0-13-6" />
          <circle cx="24" cy="13" r="6" /><path d="M14 34a10 10 0 0 1 20 0z" />
          <circle cx="11" cy="18" r="4.5" /><circle cx="37" cy="18" r="4.5" /><path d="M3 36a8 8 0 0 1 13-6M45 36a8 8 0 0 0-13-6" />
        }
        @case ('responsibility') {
          <path class="l2" d="M24 22s-8-4.6-8-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.4-8 10-8 10z" />
          <path class="l" d="M6 22c4 0 6 3 8 6l4 6h-6l-6-6zM42 22c-4 0-6 3-8 6l-4 6h6l6-6z" />
          <path d="M24 22s-8-4.6-8-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.4-8 10-8 10z" />
          <path d="M6 22c4 0 6 3 8 6l4 6M42 22c-4 0-6 3-8 6l-4 6M6 22l-1 14 9 7h6v-9M42 22l1 14-9 7h-6v-9" />
        }
        @case ('professionalism') {
          <path class="l" d="m24 5 5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 33.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" />
          <path d="m24 5 5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 33.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" />
        }
        @case ('efficiency') {
          <path class="l" d="M24 4l4 4.5 6-1 1.8 5.8 5.7 2.2-1 6 4.5 4.5-4.5 4 1 6-5.8 1.8-2.2 5.7-6-1L24 44l-4-4.5-6 1-1.8-5.8-5.7-2.2 1-6L3 22.5 7.5 18l-1-6 5.8-1.8L14.5 4.5l6 1z" />
          <path d="M24 4l4 4.5 6-1 1.8 5.8 5.7 2.2-1 6 4.5 4.5-4.5 4 1 6-5.8 1.8-2.2 5.7-6-1L24 44l-4-4.5-6 1-1.8-5.8-5.7-2.2 1-6L3 22.5 7.5 18l-1-6 5.8-1.8L14.5 4.5l6 1z" />
          <circle class="w" cx="24" cy="24" r="10" /><circle cx="24" cy="24" r="10" /><path d="m19.5 24 3.2 3.2 6-6.4" />
        }
        @case ('personal-growth') {
          <circle class="l2" cx="17" cy="15" r="7" /><path class="l" d="M4 42a13 13 0 0 1 26 0z" />
          <circle cx="17" cy="15" r="7" /><path d="M4 42a13 13 0 0 1 26 0z" />
          <path d="M28 24 43 9M34 9h9v9" />
        }
        @case ('trust') {
          <circle class="l2" cx="18" cy="15" r="7" /><path class="l" d="M5 42a13 13 0 0 1 26 0z" />
          <circle cx="18" cy="15" r="7" /><path d="M5 42a13 13 0 0 1 26 0z" />
          <path d="m31 17 4.5 4.5L45 12" />
        }
        @case ('medicine') {
          <path class="l" d="M9.5 26.5 22 14a7.8 7.8 0 0 1 11 11L20.5 37.5a7.8 7.8 0 0 1-11-11z" /><path class="l2" d="M15.75 20.25 22 14a7.8 7.8 0 0 1 11 11l-6.25 6.25z" />
          <path d="M9.5 26.5 22 14a7.8 7.8 0 0 1 11 11L20.5 37.5a7.8 7.8 0 0 1-11-11zM15.75 20.25l11 11" />
          <circle class="l" cx="36" cy="36" r="7" /><circle cx="36" cy="36" r="7" /><path d="m31 31 10 10" />
        }
        @case ('supplement') {
          <rect class="l" x="12" y="14" width="24" height="28" rx="4" /><rect class="l2" x="15" y="6" width="18" height="8" rx="2" />
          <rect x="12" y="14" width="24" height="28" rx="4" /><rect x="15" y="6" width="18" height="8" rx="2" />
          <path d="M24 36c-5-2-6-7-3-12 4 1 7 4 3 12zM24 36c0-4 1-7 3-9" />
        }
        @case ('infant') {
          <path class="l" d="M16 20h16v18a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" /><path class="l2" d="M21 8a3 3 0 0 1 6 0l2 8H19z" />
          <path d="M16 20h16v18a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4zM19 16h10v4H19zM21 8a3 3 0 0 1 6 0l2 8H19zM16 27h5M16 33h5" />
        }
        @case ('partnership') {
          <circle class="l" cx="24" cy="24" r="17" />
          <circle cx="24" cy="24" r="17" /><path d="M7 24h34M24 7c-6 6-6 28 0 34M24 7c6 6 6 28 0 34" />
          <circle class="l2" cx="38" cy="10" r="5" /><circle cx="38" cy="10" r="5" /><circle class="l2" cx="10" cy="38" r="5" /><circle cx="10" cy="38" r="5" />
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
