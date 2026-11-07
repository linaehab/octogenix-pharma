import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { AdminSettingsNav } from './admin-settings-nav';
import { STORE_SETTINGS, SettingsList, SettingsMeta, StoreSettingDefinition } from './admin-settings.models';
import { AdminSettingsService } from './admin-settings.service';
import { adminSettingsTranslations } from './admin-settings-translations';
import { AdminStoreSettingDialog, settingText } from './admin-store-setting-dialog';

/**
 * /admin/settings/store — the existing store settings (config/settings.php) that control checkout,
 * each with what it means and its current value. Values change one at a time, after a review.
 * Contact details and notification emails are not managed here.
 */
@Component({
  selector: 'app-admin-store-settings-page',
  imports: [TranslatePipe, AdminState, AdminSettingsNav, AdminStoreSettingDialog],
  templateUrl: './admin-store-settings-page.html',
  styleUrl: './admin-store-settings-page.css',
})
export class AdminStoreSettingsPage {
  private readonly api = inject(AdminSettingsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(AdminStoreSettingDialog);

  protected readonly values = signal<Record<string, unknown>>({});
  protected readonly meta = signal<SettingsMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly notice = signal<string | null>(null);
  private request: Subscription | null = null;

  protected readonly rows = computed(() => {
    const values = this.values();
    return STORE_SETTINGS.filter((definition) => definition.key in values).map((definition) => ({ definition, value: values[definition.key] }));
  });

  protected readonly provider = computed(() => {
    const provider = this.values()['store.card_provider'];
    if (typeof provider !== 'string' || provider === '') {
      return this.language.translate('admin.store.providerNone');
    }
    return provider === 'mock' ? this.language.translate('admin.store.providerMock') : provider;
  });

  constructor() {
    this.language.addTranslations(adminSettingsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.settings().subscribe({
      next: (list) => {
        this.apply(list);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.endSession();
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected change(definition: StoreSettingDefinition): void {
    this.notice.set(null);
    this.dialog().open(definition, this.values()[definition.key], {
      values: this.values(),
      cardProviders: this.meta()?.card_providers ?? [],
    });
  }

  protected saved(event: { list: SettingsList; key: string }): void {
    this.apply(event.list);
    this.notice.set(this.language.translate('admin.store.saved', { name: this.language.translate(`admin.store.name.${event.key}`) }));
  }

  /** Changed by someone else meanwhile: show the current values. */
  protected changed(current: Record<string, unknown>): void {
    this.values.update((values) => ({ ...values, ...current }));
  }

  protected text(definition: StoreSettingDefinition, value: unknown): string {
    return settingText(definition, value, this.language);
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  private apply(list: SettingsList): void {
    this.values.set(Object.fromEntries(list.data.map((setting) => [setting.key, setting.value])));
    this.meta.set(list.meta);
  }
}
