import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ADMIN_ROLES, AdminAuthService, AdminRoleName, AdminUser } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { AdminUserDialog } from './admin-user-dialog';
import { AdminUserPage, AdminUserQuery, AdminUserSort, AdminUsersService } from './admin-users.service';
import { adminUsersTranslations } from './admin-users-translations';

const EMPTY: AdminUserQuery = { search: '', role: '', status: '', sort: 'name', page: 1 };

/**
 * /admin/users — dashboard accounts (super admins only: admins.manage). Accounts are never
 * deleted; they are deactivated. Your own row has no deactivate action and its role is locked,
 * and the only active super admin cannot be demoted or deactivated (the API checks all of it).
 */
@Component({
  selector: 'app-admin-users-page',
  imports: [TranslatePipe, AdminState, AdminUserDialog, AdminConfirmDialog],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.css',
})
export class AdminUsersPage {
  private readonly api = inject(AdminUsersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(AdminUserDialog);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly roles = ADMIN_ROLES;
  protected readonly me = this.auth.admin;
  protected readonly query = signal<AdminUserQuery>({ ...EMPTY });
  protected readonly rows = signal<AdminUser[]>([]);
  protected readonly meta = signal<AdminUserPage['meta'] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly busy = signal<number | null>(null);
  protected readonly notice = signal<{ text: string; tone: 'success' | 'error' | 'warning' } | null>(null);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => {
    const q = this.query();
    return q.search !== '' || q.role !== '' || q.status !== '';
  });

  constructor() {
    this.language.addTranslations(adminUsersTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.list(this.query()).subscribe({
      next: (page) => {
        this.rows.set(page.data);
        this.meta.set(page.meta);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected apply(form: HTMLFormElement): void {
    const value = (name: string) => ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '').trim();
    this.query.set({
      search: value('search'),
      role: value('role') as '' | AdminRoleName,
      status: value('status') as AdminUserQuery['status'],
      sort: (value('sort') || 'name') as AdminUserSort,
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

  protected add(): void {
    this.notice.set(null);
    this.dialog().open(null);
  }

  protected edit(user: AdminUser): void {
    this.notice.set(null);
    this.dialog().open(user);
  }

  protected created(event: { user: AdminUser; invitation: 'queued' | 'not_delivered' }): void {
    const params = { name: event.user.name, email: event.user.email };
    this.notice.set(
      event.invitation === 'queued'
        ? { text: this.language.translate('admin.users.createdQueued', params), tone: 'success' }
        : { text: this.language.translate('admin.users.createdNotDelivered', params), tone: 'warning' },
    );
    this.load();
  }

  protected saved(user: AdminUser): void {
    this.replace(user);
    this.notice.set({ text: this.language.translate('admin.users.saved', { name: user.name }), tone: 'success' });
    this.load();
  }

  protected replace(user: AdminUser): void {
    this.rows.update((rows) => rows.map((r) => (r.id === user.id ? user : r)));
  }

  /** The signed-in admin's own row: no deactivation, role locked. */
  protected isMe(user: AdminUser): boolean {
    return user.id === this.me()?.id;
  }

  /** The only active super admin cannot be deactivated (the API refuses it too). */
  protected isLastSuperAdmin(user: AdminUser): boolean {
    return user.role === 'super_admin' && user.is_active && (this.meta()?.active_super_admins ?? 0) <= 1;
  }

  protected async setActive(user: AdminUser, active: boolean): Promise<void> {
    if (this.busy() !== null) {
      return;
    }
    this.notice.set(null);
    const confirmed = await this.confirm().ask({
      title: active ? 'admin.users.activateTitle' : 'admin.users.deactivateTitle',
      message: active ? 'admin.users.activateMessage' : 'admin.users.deactivateMessage',
      confirm: active ? 'admin.users.activate' : 'admin.users.deactivate',
      params: { name: user.name },
      tone: active ? 'default' : 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(user.id);
    this.api.update(user.id, { is_active: active, expected_updated_at: user.updated_at ?? null }).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.replace(updated);
        this.notice.set({
          text: this.language.translate(active ? 'admin.users.activated' : 'admin.users.deactivated', { name: updated.name }),
          tone: 'success',
        });
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(null);
        if (this.sessionEnded(error)) {
          return;
        }
        const current = changedMeanwhile<AdminUser>(error);
        if (current) {
          this.replace(current);
          this.notice.set({ text: this.language.translate('admin.users.changedMeanwhile'), tone: 'error' });
          return;
        }
        this.notice.set({ text: [this.language.translate('admin.users.saveFailed'), ...apiErrorMessages(error)].join(' '), tone: 'error' });
      },
    });
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value))
      : this.language.translate('admin.users.never');
  }

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.endSession();
      return true;
    }
    return false;
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
