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
import { REVIEW_ACTIONS, ReviewDetails } from './admin-reviews.models';
import { AdminReviewsService, stars } from './admin-reviews.service';
import { adminReviewsTranslations } from './admin-reviews-translations';

type Action = (typeof REVIEW_ACTIONS)['pending'][number];

/**
 * /admin/reviews/:id — one review with its product, reviewer and moderation. The text is shown as
 * plain text (never HTML) and is never changed here. Each moderation action is confirmed first
 * and saved only if the status is still the one on screen (409 otherwise).
 */
@Component({
  selector: 'app-admin-review-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog],
  templateUrl: './admin-review-page.html',
  styleUrl: './admin-review-page.css',
})
export class AdminReviewPage {
  private readonly api = inject(AdminReviewsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);
  private id = 0;
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  protected readonly review = signal<ReviewDetails | null>(null);
  protected readonly saving = signal(false);
  protected readonly notice = signal<{ text: string; tone: 'success' | 'error' } | null>(null);
  protected readonly canModerate = computed(() => this.auth.can({ permissions: ['reviews.manage'] }));
  protected readonly actions = computed<Action[]>(() => {
    const r = this.review();
    return r ? REVIEW_ACTIONS[r.status] : [];
  });
  protected readonly stars = stars;

  constructor() {
    this.language.addTranslations(adminReviewsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    // The route is reused when moving from one review to another (e.g. from a notification).
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = Number(params.get('id'));
        this.review.set(null);
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
      next: (review) => {
        this.review.set(review);
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

  protected async run(action: Action): Promise<void> {
    const review = this.review();
    if (!review || this.saving()) {
      return;
    }
    const confirmed = await this.confirm().ask({
      title: `admin.reviews.confirm.${action.action}.title`,
      message: `admin.reviews.confirm.${action.action}.message`,
      confirm: `admin.reviews.action.${action.action}`,
      tone: action.action === 'reject' || action.action === 'hide' ? 'danger' : 'default',
    });
    if (!confirmed) {
      return;
    }
    this.saving.set(true);
    this.notice.set(null);
    this.api.setStatus(review.id, action.target, review.status).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.review.set(updated);
        this.notice.set({ text: this.language.translate(`admin.reviews.done.${action.action}`), tone: 'success' });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        const current = changedMeanwhile<ReviewDetails>(error);
        if (current) {
          this.review.set(current);
          this.notice.set({ text: this.language.translate('admin.reviews.changedMeanwhile'), tone: 'error' });
          return;
        }
        this.notice.set({ text: [this.language.translate('admin.reviews.saveFailed'), ...apiErrorMessages(error)].join(' '), tone: 'error' });
      },
    });
  }

  protected productName(review: ReviewDetails): string {
    const n = review.product.name;
    return (this.language.currentLanguage() === 'ar' ? n.ar || n.en : n.en || n.ar) ?? '—';
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value);
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

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
      void this.router.navigateByUrl('/admin/login');
      return true;
    }
    return false;
  }
}
