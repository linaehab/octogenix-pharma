import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { AdminNotificationItem, AdminNotificationPage, AdminNotificationsService } from './admin-notifications.service';
import { adminNotificationsTranslations } from './admin-notifications-translations';
import { notificationText, notificationTime, safeAdminLink } from './notification-text';

/** /admin/notifications — the signed-in admin's notification history, paged by the API. */
@Component({
  selector: 'app-admin-notifications-page',
  imports: [TranslatePipe, AdminState],
  template: `
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.notifications.title' | translate }}</h1>
        <p>{{ 'admin.notifications.lead' | translate }}</p>
      </div>
      <button type="button" class="adm-button is-light" [disabled]="!notifications.unreadCount() || busy()" (click)="markAll()">
        {{ 'admin.notifications.markAll' | translate }}
      </button>
    </div>

    <div class="adm-panel ntf-filter">
      <label for="ntf-show">{{ 'admin.notifications.show' | translate }}</label>
      <select #show id="ntf-show" (change)="setUnread(show.value === 'unread')">
        <option value="all" [selected]="!unreadOnly()">{{ 'admin.notifications.all' | translate }}</option>
        <option value="unread" [selected]="unreadOnly()">{{ 'admin.notifications.unreadOnly' | translate }}</option>
      </select>
    </div>

    @if (failed()) {
      <p class="adm-notice is-error" role="alert">{{ 'admin.notifications.failed' | translate }}</p>
    }

    <section class="adm-panel" aria-labelledby="ntf-list" [attr.aria-busy]="state() === 'loading'">
      <h2 id="ntf-list" class="adm-visually-hidden">{{ 'admin.notifications.title' | translate }}</h2>
      @switch (state()) {
        @case ('loading') {
          <app-admin-state kind="loading" />
        }
        @case ('error') {
          <app-admin-state kind="error" (retry)="load()" />
        }
        @default {
          @if (!page()?.data?.length) {
            <app-admin-state kind="empty" [message]="unreadOnly() ? 'admin.notifications.noneUnread' : 'admin.notifications.none'" />
          } @else {
            <ul class="ntf-list">
              @for (n of page()!.data; track n.id) {
                <li [class.is-unread]="!n.read_at">
                  <div class="ntf-text">
                    <span class="ntf-cat">{{ 'admin.notifications.category.' + n.category | translate }}</span>
                    <p>{{ text(n) }}</p>
                    <span class="ntf-time">{{ time(n.created_at) }}</span>
                  </div>
                  <div class="ntf-actions">
                    @if (link(n)) {
                      <button type="button" class="adm-button is-small" (click)="openItem(n)">{{ 'admin.notifications.open' | translate }}</button>
                    }
                    @if (!n.read_at) {
                      <button type="button" class="adm-link" (click)="markRead(n)">{{ 'admin.notifications.markRead' | translate }}</button>
                    }
                  </div>
                </li>
              }
            </ul>
            @if (page()!.meta.last_page > 1) {
              <nav class="ntf-pages" [attr.aria-label]="'admin.audit.pages' | translate">
                <button type="button" class="adm-button is-light is-small" [disabled]="page()!.meta.current_page <= 1" (click)="goTo(page()!.meta.current_page - 1)">{{ 'admin.audit.prev' | translate }}</button>
                <span>{{ 'admin.audit.pageOf' | translate: { page: page()!.meta.current_page, pages: page()!.meta.last_page } }}</span>
                <button type="button" class="adm-button is-light is-small" [disabled]="page()!.meta.current_page >= page()!.meta.last_page" (click)="goTo(page()!.meta.current_page + 1)">{{ 'admin.audit.next' | translate }}</button>
              </nav>
            }
          }
        }
      }
    </section>
  `,
  styles: `
    .ntf-filter {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .ntf-filter label {
      font-weight: 700;
    }

    .ntf-filter select {
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(32, 51, 102, 0.35);
      border-radius: 10px;
      background: #fff;
      font: inherit;
    }

    .ntf-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .ntf-list li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.85rem 0.75rem;
      border-bottom: 1px solid rgba(32, 51, 102, 0.1);
    }

    .ntf-list li.is-unread {
      border-inline-start: 4px solid var(--adm-sky);
      background: #f1f6fc;
    }

    .ntf-text {
      flex: 1 1 18rem;
    }

    .ntf-text p {
      margin: 0.15rem 0;
      line-height: 1.45;
    }

    .is-unread .ntf-text p {
      font-weight: 700;
    }

    .ntf-cat,
    .ntf-time {
      color: var(--adm-muted);
      font-size: 0.8rem;
    }

    .ntf-cat {
      font-weight: 700;
      text-transform: uppercase;
    }

    .ntf-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .adm-button.is-small {
      min-height: 36px;
      padding: 0.3rem 0.85rem;
      font-size: 0.9rem;
    }

    .ntf-pages {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.25rem;
    }
  `,
})
export class AdminNotificationsPage {
  protected readonly notifications = inject(AdminNotificationsService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  static readonly PER_PAGE = 20;

  protected readonly page = signal<AdminNotificationPage | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly unreadOnly = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private current = 1;
  private request: Subscription | null = null;

  constructor() {
    this.language.addTranslations(adminNotificationsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(page: number = this.current): void {
    this.current = page;
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.notifications.list(page, AdminNotificationsPage.PER_PAGE, this.unreadOnly()).subscribe({
      next: (result) => {
        this.page.set(result);
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

  protected setUnread(unread: boolean): void {
    this.unreadOnly.set(unread);
    this.load(1);
  }

  protected goTo(page: number): void {
    this.load(page);
  }

  protected markRead(item: AdminNotificationItem, then?: () => void): void {
    this.failed.set(false);
    this.notifications.markRead(item.id).subscribe({
      next: (updated) => {
        this.page.update((p) => (p ? { ...p, data: p.data.map((n) => (n.id === updated.id ? updated : n)) } : p));
        then?.();
      },
      error: () => this.failed.set(true),
    });
  }

  protected openItem(item: AdminNotificationItem): void {
    const link = this.link(item);
    if (!link) {
      return;
    }
    const go = () => void this.router.navigateByUrl(link);
    if (item.read_at) {
      go();
    } else {
      this.markRead(item, go);
    }
  }

  protected markAll(): void {
    this.busy.set(true);
    this.failed.set(false);
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.busy.set(false);
        this.load(1);
      },
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected link(item: AdminNotificationItem): string | null {
    return safeAdminLink(item.link);
  }

  protected text(item: AdminNotificationItem): string {
    return notificationText(item, this.language);
  }

  protected time(iso: string): string {
    return notificationTime(iso, this.language);
  }
}
