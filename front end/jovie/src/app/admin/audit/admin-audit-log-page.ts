import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { adminNotificationsTranslations } from '../notifications/admin-notifications-translations';
import { AdminAuditService, AuditEntry, AuditPage, AuditQuery } from './admin-audit.service';

const EMPTY: AuditQuery = { search: '', admin_id: '', category: '', subject_type: '', from: '', to: '', page: 1 };

/** /admin/audit-log — who changed what and when, newest first (read-only; admins.manage). */
@Component({
  selector: 'app-admin-audit-log-page',
  imports: [TranslatePipe, AdminState],
  templateUrl: './admin-audit-log-page.html',
  styleUrl: './admin-audit-log-page.css',
})
export class AdminAuditLogPage {
  private readonly api = inject(AdminAuditService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly query = signal<AuditQuery>({ ...EMPTY });
  protected readonly page = signal<AuditPage | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly expanded = signal<number | null>(null);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => Object.entries(this.query()).some(([key, value]) => key !== 'page' && value !== ''));

  constructor() {
    this.language.addTranslations(adminNotificationsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.expanded.set(null);
    this.request = this.api.list(this.query()).subscribe({
      next: (page) => {
        this.page.set(page);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.sessionEnded();
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.state.set('error');
      },
    });
  }

  protected apply(form: HTMLFormElement): void {
    const value = (name: string) => ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '').trim();
    this.query.set({
      search: value('search'),
      admin_id: value('admin_id'),
      category: value('category'),
      subject_type: value('subject_type'),
      from: value('from'),
      to: value('to'),
      page: 1,
    });
    this.load();
  }

  protected clear(form: HTMLFormElement): void {
    form.reset();
    this.query.set({ ...EMPTY });
    this.load();
  }

  protected goTo(page: number): void {
    this.query.update((q) => ({ ...q, page }));
    this.load();
  }

  protected toggle(entry: AuditEntry): void {
    this.expanded.update((id) => (id === entry.id ? null : entry.id));
  }

  protected changes(entry: AuditEntry): { field: string; from: string; to: string }[] {
    return Object.entries(entry.changes ?? {}).map(([field, change]) => ({
      field,
      from: this.value(field, change?.from),
      to: this.value(field, change?.to),
    }));
  }

  protected actionLabel(action: string): string {
    const key = `admin.audit.actionName.${action}`;
    const text = this.language.translate(key);
    return text === key ? action : text;
  }

  protected typeLabel(type: string): string {
    const key = `admin.audit.typeName.${type}`;
    const text = this.language.translate(key);
    return text === key ? type : text;
  }

  protected date(iso: string): string {
    return new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Africa/Cairo',
    }).format(new Date(iso));
  }

  /** A recorded value as text: piastre amounts in EGP, yes/no, lists, and "—" for empty. */
  private value(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return this.language.translate('admin.audit.empty');
    }
    if (typeof value === 'boolean') {
      return this.language.translate(value ? 'admin.audit.yes' : 'admin.audit.no');
    }
    if (typeof value === 'number' && /piastres/.test(field)) {
      return formatPrice({ amount_piastres: value, currency: 'EGP' }, this.language.currentLanguage());
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}
