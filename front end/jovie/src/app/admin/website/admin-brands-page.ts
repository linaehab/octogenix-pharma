import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { AdminBrand } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

/**
 * /admin/website/brands — the brands of the corporate "Our Brands" section, in display order.
 * Published brands appear on the website; a brand with Jovie store products is hidden, never deleted.
 */
@Component({
  selector: 'app-admin-brands-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="brands" />
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.website.brands.title' | translate }}</h1>
        <p>{{ 'admin.website.brands.lead' | translate }}</p>
      </div>
      <a class="adm-button" routerLink="/admin/website/brands/new">{{ 'admin.website.brands.add' | translate }}</a>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice web-notice" [class.is-success]="n.kind === 'success'" [class.is-error]="n.kind === 'error'" [attr.role]="n.kind === 'error' ? 'alert' : 'status'">
        <p>{{ n.text }}</p>
        @for (d of n.details ?? []; track $index) {
          <p>{{ d }}</p>
        }
      </div>
    }

    <section class="adm-panel web-panel" aria-labelledby="web-brands-count" [attr.aria-busy]="state() === 'loading' || busy()">
      <div class="web-toolbar">
        <div class="web-search">
          <label for="web-brand-search">{{ 'admin.website.search' | translate }}</label>
          <input id="web-brand-search" type="search" maxlength="100" [value]="search()" [placeholder]="'admin.website.brands.searchHint' | translate" (input)="search.set($any($event.target).value)" />
        </div>
        <h2 id="web-brands-count" class="web-meta">{{ 'admin.website.brands.count' | translate: { shown: count(visible().length), total: count(brands().length), published: count(published()) } }}</h2>
      </div>

      @switch (state()) {
        @case ('loading') {
          <app-admin-state kind="loading" />
        }
        @case ('error') {
          <app-admin-state kind="error" (retry)="load()" />
        }
        @default {
          @if (!visible().length) {
            <app-admin-state kind="empty" [message]="search() ? 'admin.website.noMatch' : 'admin.website.brands.none'" />
          } @else {
            @if (search()) {
              <p class="web-help">{{ 'admin.website.orderWhenSearching' | translate }}</p>
            }
            <ul class="web-rows">
              @for (b of visible(); track b.id; let first = $first; let last = $last) {
                <li class="web-row" [class.is-hidden]="!b.is_active" [attr.data-brand]="b.slug">
                  <div class="web-order">
                    <button type="button" [disabled]="busy() || !!search() || first" [attr.aria-label]="'admin.website.moveUp' | translate: { name: b.name_en }" (click)="move(b, -1)">↑</button>
                    <button type="button" [disabled]="busy() || !!search() || last" [attr.aria-label]="'admin.website.moveDown' | translate: { name: b.name_en }" (click)="move(b, 1)">↓</button>
                  </div>
                  <div class="web-thumb">
                    @if (b.logo_url ?? b.image_url; as src) {
                      <img [src]="src" alt="" loading="lazy" />
                    } @else {
                      {{ 'admin.website.noImage' | translate }}
                    }
                  </div>
                  <div class="web-main">
                    <strong>{{ b.name_en }}</strong>
                    <span class="web-alt" dir="rtl" lang="ar">{{ b.name_ar }}</span>
                    <span class="web-meta"><bdi dir="ltr">/{{ b.slug }}</bdi>
                      @if (b.products_count) { · {{ 'admin.website.brands.products' | translate: { count: count(b.products_count) } }} }
                    </span>
                    <span class="web-badge" [class.is-on]="b.is_active" [class.is-off]="!b.is_active">{{ (b.is_active ? 'admin.website.published' : 'admin.website.hidden') | translate }}</span>
                  </div>
                  <div class="web-row-actions">
                    <a class="adm-button is-light is-small" [routerLink]="['/admin/website/brands', b.id]" [attr.aria-label]="'admin.website.editNamed' | translate: { name: b.name_en }">{{ 'admin.website.edit' | translate }}</a>
                    <button type="button" class="adm-button is-light is-small" [disabled]="busy()" (click)="toggle(b)">{{ (b.is_active ? 'admin.website.hide' : 'admin.website.publish') | translate }}</button>
                    @if (!b.products_count) {
                      <button type="button" class="adm-link web-delete" [disabled]="busy()" (click)="remove(b)">{{ 'admin.website.delete' | translate }}</button>
                    }
                  </div>
                </li>
              }
            </ul>
            <p class="web-help">{{ 'admin.website.brands.storeNote' | translate }}</p>
          }
        }
      }
    </section>

    <app-admin-confirm-dialog />
  `,
  styleUrl: './admin-website.css',
})
export class AdminBrandsPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly brands = signal<AdminBrand[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly search = signal('');
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);

  protected readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q ? this.brands().filter((b) => [b.name_en, b.name_ar, b.slug].some((v) => (v ?? '').toLowerCase().includes(q))) : this.brands();
  });
  protected readonly published = computed(() => this.brands().filter((b) => b.is_active).length);

  constructor() {
    this.language.addTranslations(adminWebsiteTranslations);
    this.load();
  }

  protected load(): void {
    this.state.set(this.brands().length ? 'ready' : 'loading');
    this.api.brands().subscribe({
      next: (brands) => {
        this.brands.set(brands);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (!this.sessionEnded(error)) {
          this.state.set('error');
        }
      },
    });
  }

  /** Moves one brand up or down; the API saves the whole order at once. */
  protected move(brand: AdminBrand, step: -1 | 1): void {
    const ids = this.brands().map((b) => b.id);
    const from = ids.indexOf(brand.id);
    const to = from + step;
    if (this.busy() || to < 0 || to >= ids.length) {
      return;
    }
    [ids[from], ids[to]] = [ids[to], ids[from]];
    this.run(this.api.reorderBrands(ids), (brands) => this.brands.set(brands as AdminBrand[]), 'admin.website.orderSaved', {});
  }

  protected async toggle(brand: AdminBrand): Promise<void> {
    const publish = !brand.is_active;
    const ok = await this.confirm().ask({
      title: publish ? 'admin.website.brands.publishTitle' : 'admin.website.brands.hideTitle',
      message: publish ? 'admin.website.brands.publishText' : 'admin.website.brands.hideText',
      confirm: publish ? 'admin.website.publish' : 'admin.website.hide',
      params: { name: brand.name_en },
    });
    if (!ok) {
      return;
    }
    this.run(
      this.api.updateBrand(brand.id, { is_active: publish, expected_updated_at: brand.updated_at }),
      (saved) => this.brands.update((list) => list.map((b) => (b.id === brand.id ? (saved as AdminBrand) : b))),
      publish ? 'admin.website.brands.published' : 'admin.website.brands.hiddenDone',
      { name: brand.name_en },
    );
  }

  protected async remove(brand: AdminBrand): Promise<void> {
    const ok = await this.confirm().ask({
      title: 'admin.website.brands.deleteTitle',
      message: 'admin.website.brands.deleteText',
      confirm: 'admin.website.delete',
      params: { name: brand.name_en },
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    this.run(this.api.deleteBrand(brand.id), () => this.brands.update((list) => list.filter((b) => b.id !== brand.id)), 'admin.website.brands.deleted', {
      name: brand.name_en,
    });
  }

  private run(action: Observable<unknown>, done: (result: unknown) => void, success: string, params: Record<string, string>): void {
    this.busy.set(true);
    this.notice.set(null);
    action.subscribe({
      next: (result) => {
        this.busy.set(false);
        done(result);
        this.notice.set({ kind: 'success', text: this.language.translate(success, params) });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.notice.set({ kind: 'error', text: this.language.translate('admin.website.changedMeanwhile') });
          this.load();
          return;
        }
        this.notice.set({ kind: 'error', text: this.language.translate('admin.website.failed'), details: apiErrorMessages(error) });
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

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value);
  }
}
