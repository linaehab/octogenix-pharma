import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { MessageDetails, MessageStatus } from './admin-messages.models';
import { AdminMessagesService } from './admin-messages.service';
import { adminMessagesTranslations } from './admin-messages-translations';

/**
 * /admin/contact-messages/:id — one message. The server marks a new message read when an admin who
 * can manage messages opens it. The text is shown as plain text (never as HTML). The dashboard
 * does not send email: "Reply by email" opens the admin's own mail program, and "Mark as replied"
 * records the reply (messages.manage only).
 */
@Component({
  selector: 'app-admin-message-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog],
  templateUrl: './admin-message-page.html',
  styleUrl: './admin-message-page.css',
})
export class AdminMessagePage {
  private readonly api = inject(AdminMessagesService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);
  private id = 0;
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  protected readonly message = signal<MessageDetails | null>(null);
  protected readonly saving = signal(false);
  protected readonly notice = signal<{ text: string; tone: 'success' | 'error' } | null>(null);
  protected readonly canManage = computed(() => this.auth.can({ permissions: ['messages.manage'] }));

  /** mailto: link with the sender's address and "Re: subject" (opens the admin's mail program). */
  protected readonly replyLink = computed(() => {
    const m = this.message();
    if (!m) {
      return null;
    }
    const subject = this.language.translate('admin.messages.replySubject', { subject: this.subject(m.subject) });
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}`;
  });

  constructor() {
    this.language.addTranslations(adminMessagesTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    // The route is reused when moving from one message to another (e.g. from a notification).
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = Number(params.get('id'));
        this.message.set(null);
        this.notice.set(null);
        this.load();
      });
  }

  protected load(): void {
    this.request?.unsubscribe();
    if (!Number.isInteger(this.id) || this.id < 1) {
      this.state.set('notFound');
      return;
    }
    this.state.set('loading');
    this.request = this.api.get(this.id).subscribe({
      next: (message) => {
        this.message.set(message);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (this.sessionEnded(error)) {
          return;
        }
        this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error');
      },
    });
  }

  protected async markReplied(): Promise<void> {
    const m = this.message();
    if (!m || this.saving()) {
      return;
    }
    const confirmed = await this.confirm().ask({
      title: 'admin.messages.repliedTitle',
      message: 'admin.messages.repliedMessage',
      confirm: 'admin.messages.repliedConfirm',
      params: { name: this.name(m) },
    });
    if (confirmed) {
      this.change(m, 'replied', 'admin.messages.markedReplied');
    }
  }

  protected markNotReplied(): void {
    const m = this.message();
    if (m && !this.saving()) {
      this.change(m, 'read', 'admin.messages.markedRead');
    }
  }

  protected name(m: MessageDetails): string {
    return `${m.first_name} ${m.last_name ?? ''}`.trim();
  }

  protected subject(subject: string | null): string {
    return subject ? this.language.translate(`admin.messages.subjectName.${subject}`) : this.language.translate('admin.messages.noSubject');
  }

  protected date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Africa/Cairo',
        }).format(new Date(value))
      : '—';
  }

  private change(m: MessageDetails, status: MessageStatus, done: string): void {
    this.saving.set(true);
    this.notice.set(null);
    this.api.setStatus(m.id, status, m.status).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.message.set(updated);
        this.notice.set({ text: this.language.translate(done), tone: 'success' });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        const current = changedMeanwhile<MessageDetails>(error);
        if (current) {
          this.message.set(current);
          this.notice.set({ text: this.language.translate('admin.messages.changedMeanwhile'), tone: 'error' });
          return;
        }
        this.notice.set({ text: [this.language.translate('admin.messages.saveFailed'), ...apiErrorMessages(error)].join(' '), tone: 'error' });
      },
    });
  }

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
      void this.router.navigateByUrl('/admin/login');
      return true;
    }
    return false;
  }
}
