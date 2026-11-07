import { Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminNotificationItem, AdminNotificationsService } from '../notifications/admin-notifications.service';
import { adminNotificationsTranslations } from '../notifications/admin-notifications-translations';
import { notificationText, notificationTime, safeAdminLink } from '../notifications/notification-text';

/**
 * The bell in the dashboard header: the unread count (refreshed every minute while the tab is
 * visible) and a panel with the latest notifications. Opening one marks it as read and follows its
 * link when it has one.
 */
@Component({
  selector: 'app-admin-notification-bell',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="bell">
      <button type="button" class="bell-button" aria-controls="adm-bell-panel" [attr.aria-expanded]="open()"
        [attr.aria-label]="count() ? ('admin.notifications.bellUnread' | translate: { count: count() }) : ('admin.notifications.bell' | translate)"
        (click)="toggle()">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
        </svg>
        @if (count() > 0) {
          <span class="bell-count" aria-hidden="true">{{ count() > 99 ? '99+' : count() }}</span>
        }
      </button>
      @if (open()) {
        <div id="adm-bell-panel" class="bell-panel" role="region" [attr.aria-label]="'admin.notifications.title' | translate">
          <div class="bell-head">
            <h2>{{ 'admin.notifications.title' | translate }}</h2>
            <button type="button" class="bell-link" [disabled]="!count() || busy()" (click)="markAll()">{{ 'admin.notifications.markAll' | translate }}</button>
          </div>
          @if (state() === 'loading') {
            <p class="bell-state" role="status">{{ 'admin.state.loading' | translate }}</p>
          } @else if (state() === 'error') {
            <p class="bell-state is-error" role="alert">
              {{ 'admin.state.error' | translate }}
              <button type="button" class="bell-link" (click)="load()">{{ 'admin.state.retry' | translate }}</button>
            </p>
          } @else if (!items().length) {
            <p class="bell-state">{{ 'admin.notifications.none' | translate }}</p>
          } @else {
            <ul class="bell-list">
              @for (n of items(); track n.id) {
                <li [class.is-unread]="!n.read_at">
                  <button type="button" class="bell-item" (click)="openItem(n)">
                    <span class="bell-cat">{{ 'admin.notifications.category.' + n.category | translate }}</span>
                    <span class="bell-text">{{ text(n) }}</span>
                    <span class="bell-time">{{ time(n.created_at) }}</span>
                    @if (!n.read_at) {
                      <span class="adm-visually-hidden">{{ 'admin.notifications.unread' | translate }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }
          @if (error()) {
            <p class="bell-state is-error" role="alert">{{ 'admin.notifications.failed' | translate }}</p>
          }
          <a class="bell-all" routerLink="/admin/notifications" (click)="close()">{{ 'admin.notifications.viewAll' | translate }}</a>
        </div>
      }
    </div>
  `,
  styles: `
    .bell {
      position: relative;
    }

    .bell-button {
      position: relative;
      display: inline-grid;
      width: 44px;
      height: 44px;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 10px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .bell-button svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linejoin: round;
    }

    .bell-count {
      position: absolute;
      top: -6px;
      inset-inline-end: -6px;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 999px;
      background: #c8102e;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 20px;
      text-align: center;
    }

    .bell-panel {
      position: absolute;
      top: calc(100% + 0.5rem);
      inset-inline-end: 0;
      z-index: 30;
      width: min(24rem, calc(100vw - 1.5rem));
      max-height: min(32rem, calc(100vh - 6rem));
      overflow: auto;
      padding: 0.9rem;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(14, 22, 46, 0.28);
      color: var(--adm-text, #1d2a4d);
    }

    .bell-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .bell-head h2 {
      margin: 0;
      color: var(--adm-navy, #203366);
      font-size: 1.05rem;
    }

    .bell-link {
      min-height: 36px;
      padding: 0 0.25rem;
      border: 0;
      background: none;
      color: var(--adm-navy, #203366);
      font: inherit;
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }

    .bell-link:disabled {
      color: var(--adm-muted, #56627e);
      text-decoration: none;
      cursor: default;
    }

    .bell-state {
      margin: 0.75rem 0;
      color: var(--adm-muted, #56627e);
    }

    .bell-state.is-error {
      color: #a3123d;
    }

    .bell-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .bell-list li + li {
      border-top: 1px solid rgba(32, 51, 102, 0.1);
    }

    .bell-item {
      display: grid;
      gap: 0.15rem;
      width: 100%;
      padding: 0.6rem 0.5rem;
      border: 0;
      border-radius: 8px;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }

    .bell-item:hover,
    .bell-item:focus-visible {
      background: #f3f6fb;
    }

    .is-unread .bell-item {
      border-inline-start: 4px solid var(--adm-sky, #5aa9e6);
      background: #f1f6fc;
    }

    .bell-cat {
      color: var(--adm-muted, #56627e);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .bell-text {
      line-height: 1.4;
    }

    .is-unread .bell-text {
      font-weight: 700;
    }

    .bell-time {
      color: var(--adm-muted, #56627e);
      font-size: 0.8rem;
    }

    .bell-all {
      display: block;
      margin-top: 0.6rem;
      color: var(--adm-navy, #203366);
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class AdminNotificationBell {
  private readonly notifications = inject(AdminNotificationsService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  static readonly LATEST = 8;

  protected readonly count = this.notifications.unreadCount;
  protected readonly open = signal(false);
  protected readonly items = signal<AdminNotificationItem[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly error = signal(false);
  private request: Subscription | null = null;

  constructor() {
    this.language.addTranslations(adminNotificationsTranslations);
    this.notifications.start();
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      this.notifications.stop();
    });
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.load();
  }

  close(): void {
    this.open.set(false);
    this.error.set(false);
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.notifications.list(1, AdminNotificationBell.LATEST).subscribe({
      next: (page) => {
        this.items.set(page.data);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected openItem(item: AdminNotificationItem): void {
    const link = safeAdminLink(item.link);
    const go = () => {
      if (link) {
        this.close();
        void this.router.navigateByUrl(link);
      }
    };
    if (item.read_at) {
      go();
      return;
    }
    this.error.set(false);
    this.notifications.markRead(item.id).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
        go();
      },
      error: () => this.error.set(true),
    });
  }

  protected markAll(): void {
    this.busy.set(true);
    this.error.set(false);
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.busy.set(false);
        const now = new Date().toISOString();
        this.items.update((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      },
      error: () => {
        this.busy.set(false);
        this.error.set(true);
      },
    });
  }

  protected text(item: AdminNotificationItem): string {
    return notificationText(item, this.language);
  }

  protected time(iso: string): string {
    return notificationTime(iso, this.language);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close();
      (this.host.nativeElement.querySelector('.bell-button') as HTMLButtonElement | null)?.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
