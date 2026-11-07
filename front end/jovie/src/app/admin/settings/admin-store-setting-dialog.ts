import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { apiErrorMessages } from '../products/api-errors';
import { egpToPiastres, piastresToEgp } from '../products/money';
import { MAX_PIASTRES, SettingsList, StoreSettingDefinition } from './admin-settings.models';
import { AdminSettingsService, changedMeanwhile } from './admin-settings.service';

/** A store setting's value as the dashboard shows it ("On", "EGP 25", "30 minutes", "Not set"…). */
export function settingText(definition: StoreSettingDefinition, value: unknown, language: LanguageService): string {
  switch (definition.kind) {
    case 'switch':
      return language.translate(value === true ? 'admin.settings.on' : 'admin.settings.off');
    case 'money':
      if (typeof value !== 'number') {
        return language.translate(definition.key === 'store.free_shipping_threshold_piastres' ? 'admin.store.noFreeShipping' : 'admin.store.notSet');
      }
      return formatPrice({ amount_piastres: value, currency: 'EGP' }, language.currentLanguage());
    case 'minutes':
      return typeof value === 'number'
        ? language.translate('admin.store.minutes', { count: new Intl.NumberFormat(language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value) })
        : language.translate('admin.store.notSet');
  }
}

/**
 * Changes one store setting in two steps: the new value, then a review that says what it affects
 * (confirmed before anything is sent). The API saves only if the value the admin saw is still
 * current, and validates the value and the rules between settings again.
 */
@Component({
  selector: 'app-admin-store-setting-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="set-dialog" aria-labelledby="set-store-title" (cancel)="close()">
      @if (definition(); as d) {
        @if (step() === 'edit') {
          <form (submit)="$event.preventDefault(); review()" novalidate>
            <h2 id="set-store-title">{{ 'admin.store.name.' + d.key | translate }}</h2>
            <p class="set-help">{{ 'admin.store.help.' + d.key | translate }}</p>
            <p class="set-current">{{ 'admin.store.current' | translate }}: <strong>{{ text(value()) }}</strong></p>
            @if (error(); as e) {
              <p class="adm-notice is-error" role="alert">{{ e }}</p>
            }
            @if (d.kind === 'switch') {
              <fieldset class="set-choices" aria-describedby="set-store-err">
                <legend>{{ 'admin.store.newValue' | translate }}</legend>
                <label [class.is-disabled]="!canTurnOn()">
                  <input type="radio" name="set-switch" value="on" [checked]="draftOn()" [disabled]="!canTurnOn()" (change)="draftOn.set(true)" />
                  {{ 'admin.settings.on' | translate }}
                </label>
                <label>
                  <input type="radio" name="set-switch" value="off" [checked]="!draftOn()" (change)="draftOn.set(false)" />
                  {{ 'admin.settings.off' | translate }}
                </label>
              </fieldset>
              @if (!canTurnOn()) {
                <p class="set-help">{{ 'admin.store.errCardNoProvider' | translate }}</p>
              }
              <p class="set-error" id="set-store-err">{{ problem() }}</p>
            } @else {
              <div class="set-field">
                <label for="set-store-value">{{ (d.kind === 'money' ? 'admin.store.amountLabel' : 'admin.store.minutesLabel') | translate }}</label>
                <input #input id="set-store-value" [attr.inputmode]="d.kind === 'money' ? 'decimal' : 'numeric'" dir="ltr" autocomplete="off" maxlength="16"
                  [value]="draftText()" (input)="draftText.set(input.value)" [attr.aria-invalid]="!!problem()" aria-describedby="set-store-help set-store-err" />
                <p class="set-help" id="set-store-help">
                  @if (d.kind === 'money') {
                    {{ 'admin.store.amountHelp' | translate }}
                  } @else {
                    {{ 'admin.store.errMinutes' | translate: { min: d.min ?? 0, max: d.max ?? 0 } }}
                  }
                </p>
                <p class="set-error" id="set-store-err">{{ problem() }}</p>
              </div>
            }
            <div class="set-dialog-actions">
              <button type="button" class="adm-button is-light" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
              <button type="submit" class="adm-button">{{ 'admin.settings.review' | translate }}</button>
            </div>
          </form>
        } @else {
          <h2 id="set-store-title">{{ 'admin.settings.reviewTitle' | translate }}</h2>
          @if (error(); as e) {
            <p class="adm-notice is-error" role="alert">{{ e }}</p>
          }
          <ul class="set-review">
            <li>{{ 'admin.store.reviewLine' | translate: { name: ('admin.store.name.' + d.key | translate), from: text(value()), to: text(pending()) } }}</li>
          </ul>
          @if (d.key === 'store.enabled') {
            <p class="set-note is-warning">{{ (pending() ? 'admin.store.reviewStoreOn' : 'admin.store.reviewStoreOff') | translate }}</p>
          } @else if (d.sensitive) {
            <p class="set-note is-warning">{{ 'admin.store.reviewSensitive' | translate }}</p>
          }
          @if (d.kind === 'money') {
            <p class="set-note">{{ 'admin.store.reviewNewOnly' | translate }}</p>
          }
          <div class="set-dialog-actions">
            <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="back()">{{ 'admin.settings.back' | translate }}</button>
            <button #confirm type="button" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()" (click)="save()">{{ 'admin.settings.confirmSave' | translate }}</button>
          </div>
        }
      }
    </dialog>
  `,
  styleUrl: './admin-settings-dialog.css',
})
export class AdminStoreSettingDialog {
  private readonly api = inject(AdminSettingsService);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirm');

  /** All settings as saved by the API, and the key that changed. */
  readonly saved = output<{ list: SettingsList; key: string }>();
  /** Someone else changed settings meanwhile: their current values. */
  readonly changed = output<Record<string, unknown>>();
  readonly sessionEnded = output<void>();

  protected readonly definition = signal<StoreSettingDefinition | null>(null);
  /** The value the admin saw (sent back as "expected"). */
  protected readonly value = signal<unknown>(null);
  protected readonly step = signal<'edit' | 'review'>('edit');
  protected readonly draftOn = signal(false);
  protected readonly draftText = signal('');
  protected readonly pending = signal<unknown>(null);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Other settings the rules between settings depend on (COD fee, card provider). */
  private context: { values: Record<string, unknown>; cardProviders: string[] } = { values: {}, cardProviders: [] };

  protected canTurnOn(): boolean {
    if (this.definition()?.key !== 'store.card_payments_enabled' || this.value() === true) {
      return true;
    }
    const provider = this.context.values['store.card_provider'];
    return typeof provider === 'string' && this.context.cardProviders.includes(provider);
  }

  open(definition: StoreSettingDefinition, value: unknown, context: { values: Record<string, unknown>; cardProviders: string[] }): void {
    this.definition.set(definition);
    this.context = context;
    this.error.set(null);
    this.reset(value);
    const element = this.dialog().nativeElement;
    if (!element.open) {
      typeof element.showModal === 'function' ? element.showModal() : element.setAttribute('open', '');
    }
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    const element = this.dialog().nativeElement;
    if (element.open) {
      typeof element.close === 'function' ? element.close() : element.removeAttribute('open');
    }
  }

  protected review(): void {
    const definition = this.definition();
    if (!definition) {
      return;
    }
    this.error.set(null);
    const next = this.parse(definition);
    if (next === undefined) {
      return;
    }
    this.problem.set(null);
    if (next === this.value()) {
      this.error.set(this.language.translate('admin.settings.unchanged'));
      return;
    }
    this.pending.set(next);
    this.step.set('review');
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected back(): void {
    this.step.set('edit');
    this.error.set(null);
  }

  protected save(): void {
    const definition = this.definition();
    if (!definition || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.updateSettings({ [definition.key]: this.pending() }, { [definition.key]: this.value() }).subscribe({
      next: (list) => {
        this.saving.set(false);
        this.close();
        this.saved.emit({ list, key: definition.key });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.close();
          this.sessionEnded.emit();
          return;
        }
        const current = changedMeanwhile<Record<string, unknown>>(error);
        if (current) {
          this.changed.emit(current);
          this.context = { ...this.context, values: { ...this.context.values, ...current } };
          if (definition.key in current) {
            this.reset(current[definition.key]);
          } else {
            this.step.set('edit');
          }
          this.error.set(this.language.translate('admin.settings.changedMeanwhile'));
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 422) {
          this.step.set('edit');
        }
        this.error.set([this.language.translate('admin.settings.saveFailed'), ...apiErrorMessages(error)].join(' '));
      },
    });
  }

  protected text(value: unknown): string {
    const definition = this.definition();
    return definition ? settingText(definition, value, this.language) : '';
  }

  /** The new value, or undefined (with the reason shown) when it is not valid. */
  private parse(definition: StoreSettingDefinition): unknown {
    const fail = (key: string, params?: Record<string, string | number>): undefined => {
      this.problem.set(this.language.translate(key, params));
      return undefined;
    };

    if (definition.kind === 'switch') {
      const on = this.draftOn();
      if (on && !this.canTurnOn()) {
        return fail('admin.store.errCardNoProvider');
      }
      if (on && definition.key === 'store.cod_enabled' && typeof this.context.values['store.cod_fee_piastres'] !== 'number') {
        return fail('admin.store.errCodNeedsFee');
      }
      return on;
    }

    const text = this.draftText().trim();
    if (definition.kind === 'money') {
      const piastres = egpToPiastres(text);
      if (piastres === null) {
        return definition.optional ? null : fail('admin.store.errAmountRequired');
      }
      if (Number.isNaN(piastres)) {
        return fail('admin.store.errAmount');
      }
      return piastres > MAX_PIASTRES ? fail('admin.store.errAmountMax') : piastres;
    }

    const min = definition.min ?? 0;
    const max = definition.max ?? Number.MAX_SAFE_INTEGER;
    const digits = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    if (!/^\d{1,6}$/.test(digits) || Number(digits) < min || Number(digits) > max) {
      return fail('admin.store.errMinutes', { min, max });
    }
    return Number(digits);
  }

  private reset(value: unknown): void {
    const definition = this.definition();
    this.value.set(value);
    this.draftOn.set(value === true);
    this.draftText.set(definition?.kind === 'money' ? piastresToEgp(typeof value === 'number' ? value : null) : value === null || value === undefined ? '' : String(value));
    this.pending.set(null);
    this.step.set('edit');
    this.problem.set(null);
  }
}
