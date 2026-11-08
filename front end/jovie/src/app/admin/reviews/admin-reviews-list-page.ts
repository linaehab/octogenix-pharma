import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { REVIEW_STATUSES, ReviewPage, ReviewProduct, ReviewQuery, ReviewRow, ReviewSort, ReviewStatus } from './admin-reviews.models';
import { AdminReviewsService, stars } from './admin-reviews.service';
import { adminReviewsTranslations } from './admin-reviews-translations';

const EMPTY: ReviewQuery = { search: '', status: '', product_id: '', rating: '', from: '', to: '', sort: 'newest', page: 1 };

/** /admin/reviews — product reviews searched, filtered, sorted and paged by the API. */
@Component({
  selector: 'app-admin-reviews-list-page',
  imports: [RouterLink, TranslatePipe, AdminState],
  templateUrl: './admin-reviews-list-page.html',
  styleUrl: './admin-reviews-list-page.css',
})
export class AdminReviewsListPage {
  private readonly api = inject(AdminReviewsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly statuses = REVIEW_STATUSES;
  protected readonly ratings = [5, 4, 3, 2, 1];
  protected readonly query = signal<ReviewQuery>({ ...EMPTY });
  protected readonly rows = signal<ReviewRow[]>([]);
  protected readonly meta = signal<ReviewPage['meta'] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly stars = stars;
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => {
    const q = this.query();
    return [q.search, q.status, q.product_id, q.rating, q.from, q.to].some((v) => v !== '');
  });

  constructor() {
    this.language.addTranslations(adminReviewsTranslations);
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
      status: value('status') as '' | ReviewStatus,
      product_id: value('product_id'),
      rating: value('rating'),
      from: value('from'),
      to: value('to'),
      sort: (value('sort') || 'newest') as ReviewSort,
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

  protected productName(product: Pick<ReviewProduct, 'name'>): string {
    const n = product.name;
    return (this.language.currentLanguage() === 'ar' ? n.ar || n.en : n.en || n.ar) ?? '—';
  }

  protected average(): string {
    const value = this.meta()?.totals.approved_average;
    return value === null || value === undefined
      ? this.language.translate('admin.reviews.noAverage')
      : new Intl.NumberFormat(this.locale(), { maximumFractionDigits: 1 }).format(value) + ' ★';
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
