import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ADMIN_ROLES, AdminRoleName, AdminUser } from '../admin-auth.service';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { AdminUserChange, AdminUsersService } from './admin-users.service';

interface Draft {
  name: string;
  email: string;
  role: AdminRoleName;
  locale: 'en' | 'ar';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates an admin account or edits one. No password is ever entered: a new admin receives an
 * invitation to choose their own. A role change is confirmed in a second step. The API enforces
 * every rule again (own role, last super admin, valid roles, unique email).
 */
@Component({
  selector: 'app-admin-user-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="set-dialog" aria-labelledby="usr-dialog-title" (cancel)="close()">
      @if (step() === 'edit') {
        <form (submit)="$event.preventDefault(); next()" novalidate>
          <h2 id="usr-dialog-title">{{ (user() ? 'admin.users.dialogEdit' : 'admin.users.dialogNew') | translate }}</h2>
          @if (error(); as e) {
            <p class="adm-notice is-error" role="alert">{{ e }}</p>
          }
          <div class="set-field">
            <label for="usr-name">{{ 'admin.users.nameLabel' | translate }}</label>
            <input #name id="usr-name" maxlength="120" autocomplete="off" [value]="draft().name" (input)="patch({ name: name.value })"
              [attr.aria-invalid]="!!problems().name" aria-describedby="usr-name-err" />
            <p class="set-error" id="usr-name-err">{{ problems().name }}</p>
          </div>
          <div class="set-field">
            <label for="usr-email">{{ 'admin.users.emailLabel' | translate }}</label>
            @if (user(); as u) {
              <input id="usr-email" dir="ltr" [value]="u.email" readonly aria-describedby="usr-email-help" />
              <p class="set-help" id="usr-email-help">{{ 'admin.users.emailFixed' | translate }}</p>
            } @else {
              <input #email id="usr-email" type="email" dir="ltr" maxlength="255" autocomplete="off" [value]="draft().email"
                (input)="patch({ email: email.value })" [attr.aria-invalid]="!!problems().email" aria-describedby="usr-email-err" />
              <p class="set-error" id="usr-email-err">{{ problems().email }}</p>
            }
          </div>
          <div class="set-field">
            <label for="usr-role">{{ 'admin.users.roleLabel' | translate }}</label>
            <select #role id="usr-role" class="usr-select" [disabled]="roleLocked()" (change)="patch({ role: $any(role.value) })"
              [attr.aria-invalid]="!!problems().role" aria-describedby="usr-role-help usr-role-err">
              @for (r of roles; track r) {
                <option [value]="r" [selected]="draft().role === r">{{ 'admin.role.' + r | translate }}</option>
              }
            </select>
            <p class="set-help" id="usr-role-help">
              @if (roleLockReason(); as reason) {
                {{ reason | translate }}
              } @else {
                {{ 'admin.users.roleHelp' | translate: { sections: ('admin.users.sections.' + draft().role | translate) } }}
              }
            </p>
            <p class="set-error" id="usr-role-err">{{ problems().role }}</p>
          </div>
          <div class="set-field">
            <label for="usr-locale">{{ 'admin.users.languageLabel' | translate }}</label>
            <select #locale id="usr-locale" class="usr-select" (change)="patch({ locale: $any(locale.value) })">
              <option value="en" [selected]="draft().locale === 'en'">{{ 'admin.users.languageEn' | translate }}</option>
              <option value="ar" [selected]="draft().locale === 'ar'">{{ 'admin.users.languageAr' | translate }}</option>
            </select>
          </div>
          @if (!user()) {
            <p class="set-note">{{ 'admin.users.passwordNote' | translate }}</p>
          }
          <div class="set-dialog-actions">
            <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
            <button type="submit" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()">
              {{ (user() ? 'admin.users.save' : 'admin.users.create') | translate }}
            </button>
          </div>
        </form>
      } @else if (user(); as u) {
        <h2 id="usr-dialog-title">{{ 'admin.users.roleChangeTitle' | translate: { name: u.name } }}</h2>
        @if (error(); as e) {
          <p class="adm-notice is-error" role="alert">{{ e }}</p>
        }
        <p class="set-note is-warning">
          {{ 'admin.users.roleChangeMessage' | translate: { from: ('admin.role.' + u.role | translate), to: ('admin.role.' + draft().role | translate) } }}
        </p>
        <div class="set-dialog-actions">
          <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="step.set('edit')">{{ 'admin.settings.back' | translate }}</button>
          <button type="button" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()" (click)="save()">{{ 'admin.users.roleChangeConfirm' | translate }}</button>
        </div>
      }
    </dialog>
  `,
  styleUrl: '../settings/admin-settings-dialog.css',
  styles: `
    .usr-select {
      width: 100%;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(32, 51, 102, 0.35);
      border-radius: 10px;
      background: #fff;
      color: inherit;
      font: inherit;
    }
  `,
})
export class AdminUserDialog {
  private readonly api = inject(AdminUsersService);
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** The signed-in admin (to lock their own role). */
  readonly me = input<AdminUser | null>(null);
  /** Active super admins right now (to lock the role of the only one). */
  readonly activeSuperAdmins = input(0);
  readonly created = output<{ user: AdminUser; invitation: 'queued' | 'not_delivered' }>();
  readonly saved = output<AdminUser>();
  readonly changed = output<AdminUser>();
  readonly sessionEnded = output<void>();

  protected readonly roles = ADMIN_ROLES;
  protected readonly user = signal<AdminUser | null>(null);
  protected readonly draft = signal<Draft>({ name: '', email: '', role: 'support', locale: 'en' });
  protected readonly step = signal<'edit' | 'confirm'>('edit');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly serverProblems = signal<Partial<Record<'name' | 'email' | 'role', string>>>({});

  protected readonly roleLockReason = computed(() => {
    const u = this.user();
    if (!u) {
      return null;
    }
    if (u.id === this.me()?.id) {
      return 'admin.users.ownRole';
    }
    if (u.role === 'super_admin' && u.is_active && this.activeSuperAdmins() <= 1) {
      return 'admin.users.lastSuperAdminRole';
    }
    return null;
  });
  protected readonly roleLocked = computed(() => this.roleLockReason() !== null);

  protected readonly problems = computed(() => {
    const problems: Partial<Record<'name' | 'email' | 'role', string>> = { ...this.serverProblems() };
    if (!this.submitted()) {
      return problems;
    }
    const d = this.draft();
    if (d.name.trim() === '' || d.name.trim().length > 120) {
      problems.name = this.language.translate('admin.users.errName');
    }
    if (!this.user() && !EMAIL.test(d.email.trim())) {
      problems.email = this.language.translate('admin.users.errEmail');
    }
    return problems;
  });

  open(user: AdminUser | null): void {
    this.reset(user);
    this.error.set(null);
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

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
    this.serverProblems.set({});
  }

  /** Validates; a role change goes through the confirmation step first. */
  protected next(): void {
    this.submitted.set(true);
    this.serverProblems.set({});
    this.error.set(null);
    if (Object.keys(this.problems()).length) {
      return;
    }
    const u = this.user();
    if (u && this.draft().role !== u.role) {
      this.step.set('confirm');
      return;
    }
    this.save();
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    const d = this.draft();
    const u = this.user();
    this.saving.set(true);
    this.error.set(null);

    if (!u) {
      this.api.create({ name: d.name.trim(), email: d.email.trim(), role: d.role, locale: d.locale }).subscribe({
        next: (result) => {
          this.saving.set(false);
          this.close();
          this.created.emit(result);
        },
        error: (error: unknown) => this.failed(error),
      });
      return;
    }

    const change: AdminUserChange = { expected_updated_at: u.updated_at ?? null };
    if (d.name.trim() !== u.name) {
      change.name = d.name.trim();
    }
    if (d.role !== u.role) {
      change.role = d.role;
    }
    if (d.locale !== (u.locale ?? 'en')) {
      change.locale = d.locale;
    }
    this.api.update(u.id, change).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.close();
        this.saved.emit(updated);
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  private failed(error: unknown): void {
    this.saving.set(false);
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.close();
      this.sessionEnded.emit();
      return;
    }
    const current = changedMeanwhile<AdminUser>(error);
    if (current) {
      this.reset(current);
      this.changed.emit(current);
      this.error.set(this.language.translate('admin.users.changedMeanwhile'));
      return;
    }
    const fields = apiFieldErrors(error);
    const problems: Partial<Record<'name' | 'email' | 'role', string>> = {};
    for (const key of ['name', 'email', 'role'] as const) {
      if (fields[key]?.[0]) {
        problems[key] = fields[key][0];
      }
    }
    this.serverProblems.set(problems);
    this.step.set('edit');
    this.error.set([this.language.translate('admin.users.saveFailed'), ...apiErrorMessages(error)].join(' '));
  }

  private reset(user: AdminUser | null): void {
    this.user.set(user);
    this.step.set('edit');
    this.submitted.set(false);
    this.serverProblems.set({});
    this.draft.set(
      user
        ? { name: user.name, email: user.email, role: user.role, locale: user.locale === 'ar' ? 'ar' : 'en' }
        : { name: '', email: '', role: 'support', locale: 'en' },
    );
  }
}
