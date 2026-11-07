import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { INVENTORY_REPORT_ACCESS } from '../admin-sections';
import { MAX_REPORT_DAYS, PeriodPreset, daysBetween, presetPeriod } from './admin-reports.models';
import { AdminReportsService } from './admin-reports.service';
import { adminReportsTranslations } from './admin-reports-translations';
import { periodLabel } from './report-format';

const PRESETS: PeriodPreset[] = ['today', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'];

/**
 * /admin/reports — the period (Egyptian calendar days) shared by every report, and the report tabs.
 * Every figure is calculated by the API; this page only chooses what to ask for.
 */
@Component({
  selector: 'app-admin-reports-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  template: `
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.nav.reports' | translate }}</h1>
        <p>{{ 'admin.reports.lead' | translate }}</p>
      </div>
    </div>

    <form class="adm-panel rep-period" (submit)="$event.preventDefault(); applyCustom(from.value, to.value)">
      <div class="rep-field">
        <label for="rep-preset">{{ 'admin.reports.period' | translate }}</label>
        <select #preset id="rep-preset" (change)="choose(preset.value)">
          @for (p of presets; track p) {
            <option [value]="p" [selected]="mode() === p">{{ 'admin.reports.preset.' + p | translate }}</option>
          }
        </select>
      </div>
      <div class="rep-field" [hidden]="mode() !== 'custom'">
        <label for="rep-from">{{ 'admin.reports.from' | translate }}</label>
        <input #from id="rep-from" type="date" [value]="period().from" [attr.aria-invalid]="!!rangeError()" aria-describedby="rep-range-err" />
      </div>
      <div class="rep-field" [hidden]="mode() !== 'custom'">
        <label for="rep-to">{{ 'admin.reports.to' | translate }}</label>
        <input #to id="rep-to" type="date" [value]="period().to" [attr.aria-invalid]="!!rangeError()" aria-describedby="rep-range-err" />
      </div>
      @if (mode() === 'custom') {
        <button type="submit" class="adm-button">{{ 'admin.reports.applyRange' | translate }}</button>
      }
      <p class="rep-period-note">{{ 'admin.reports.periodNote' | translate: { from: label(period().from), to: label(period().to) } }}</p>
      <p class="rep-error" id="rep-range-err" role="alert">{{ rangeError() }}</p>
    </form>

    <nav class="rep-tabs" [attr.aria-label]="'admin.reports.tabs' | translate">
      @for (tab of tabs(); track tab) {
        <a [routerLink]="'/admin/reports/' + tab" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ 'admin.reports.tab.' + tab | translate }}</a>
      }
    </nav>

    <router-outlet />
  `,
  styleUrl: './admin-reports.css',
  // Shared by the report tabs rendered in the outlet (every class starts with rep-).
  encapsulation: ViewEncapsulation.None,
})
export class AdminReportsPage {
  private readonly reports = inject(AdminReportsService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);

  protected readonly presets = PRESETS;
  protected readonly period = this.reports.period;
  /** The select's value: a preset, or "custom" while the admin types dates. */
  protected readonly mode = signal<PeriodPreset>(this.reports.period().preset);
  protected readonly rangeError = signal<string | null>(null);
  protected readonly tabs = computed(() => ['sales', 'orders', 'products', ...(this.auth.can(INVENTORY_REPORT_ACCESS) ? ['inventory'] : [])]);

  constructor() {
    this.language.addTranslations(adminReportsTranslations);
  }

  protected choose(value: string): void {
    const preset = value as PeriodPreset;
    this.mode.set(preset);
    this.rangeError.set(null);
    if (preset !== 'custom') {
      this.reports.period.set(presetPeriod(preset));
    }
  }

  protected applyCustom(from: string, to: string): void {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && to >= from && daysBetween(from, to) <= MAX_REPORT_DAYS;
    if (!valid) {
      this.rangeError.set(this.language.translate('admin.reports.errRange'));
      return;
    }
    this.rangeError.set(null);
    this.reports.period.set({ preset: 'custom', from, to });
  }

  protected label(date: string): string {
    return periodLabel(date, this.language.currentLanguage());
  }
}
