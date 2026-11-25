import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import {
  InboxCount,
  MESSAGE_SITES,
  MESSAGE_STATUSES,
  MessagePage,
  MessageQuery,
  MessageRow,
  MessageSite,
  MessageSort,
  MessageStatus,
} from './admin-messages.models';
import { AdminMessagesService } from './admin-messages.service';
import { adminMessagesTranslations } from './admin-messages-translations';

const EMPTY: Omit<MessageQuery, 'site'> = { search: '', status: '', from: '', to: '', sort: 'newest', page: 1 };

/** The inbox in the address (?site=jovie), the Octogenix inbox otherwise. */
const siteOf = (value: string | null): MessageSite => (value === 'jovie' ? 'jovie' : 'corporate');

/**
 * /admin/contact-messages — two inboxes, one per site (Octogenix, Jovie), chosen with the brand
 * tabs (?site=corporate|jovie, so the browser history and the message page's back link keep it).
 * Each tab shows its total and new messages; the list is searched, filtered, sorted and paged by
 * the API within the chosen site (the API's site filter: the site the message was sent from).
 */
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
  protected readonly sites = MESSAGE_SITES;
  protected readonly query = signal<MessageQuery>({ ...EMPTY, site: 'corporate' });
  protected readonly site = computed(() => this.query().site);
  /** Totals of each inbox (null until loaded, or when they cannot be loaded). */
  protected readonly counts = signal<Partial<Record<MessageSite, InboxCount>>>({});
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
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.request?.unsubscribe());
    // The tabs change ?site=: the chosen filters stay, the list starts again at its first page.
    let first = true;
    const siteChanges = inject(ActivatedRoute).queryParamMap.subscribe((params) => {
      const site = siteOf(params.get('site'));
      if (first || site !== this.query().site) {
        first = false;
        this.query.update((q) => ({ ...q, site, page: 1 }));
        this.load();
      }
    });
    destroyRef.onDestroy(() => siteChanges.unsubscribe());
    this.loadCounts();
  }

  private loadCounts(): void {
    for (const site of MESSAGE_SITES) {
      this.api.count(site).subscribe({
        next: (count) => this.counts.update((counts) => ({ ...counts, [site]: count })),
        error: () => undefined,
      });
    }
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
      site: this.site(),
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
    this.query.set({ ...EMPTY, site: this.site() });
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
