import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { MESSAGE_STATUSES, MessagePage, MessageQuery, MessageRow, MessageSort, MessageStatus } from './admin-messages.models';
import { AdminMessagesService } from './admin-messages.service';
import { adminMessagesTranslations } from './admin-messages-translations';

const EMPTY: MessageQuery = { search: '', status: '', from: '', to: '', sort: 'newest', page: 1 };

/** /admin/contact-messages — contact messages searched, filtered, sorted and paged by the API. */
@Component({
  selector: 'app-admin-messages-list-page',
  imports: [RouterLink, TranslatePipe, AdminState],
  templateUrl: './admin-messages-list-page.html',
  styleUrl: './admin-messages-list-page.css',
})
export class AdminMessagesListPage {
  private readonly api = inject(AdminMessagesService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly statuses = MESSAGE_STATUSES;
  protected readonly query = signal<MessageQuery>({ ...EMPTY });
  protected readonly rows = signal<MessageRow[]>([]);
  protected readonly meta = signal<MessagePage['meta'] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => {
    const q = this.query();
    return q.search !== '' || q.status !== '' || q.from !== '' || q.to !== '';
  });

  constructor() {
    this.language.addTranslations(adminMessagesTranslations);
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
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.sessionEnded();
          void this.router.navigateByUrl('/admin/login');
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
      status: value('status') as '' | MessageStatus,
      from: value('from'),
      to: value('to'),
      sort: (value('sort') || 'newest') as MessageSort,
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

  protected name(row: MessageRow): string {
    return `${row.first_name} ${row.last_name ?? ''}`.trim();
  }

  protected subject(subject: string | null): string {
    return subject ? this.language.translate(`admin.messages.subjectName.${subject}`) : this.language.translate('admin.messages.noSubject');
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value));
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
