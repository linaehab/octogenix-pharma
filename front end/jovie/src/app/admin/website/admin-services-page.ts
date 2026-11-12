import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { AdminService, ServiceCategory } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

/**
 * /admin/website/services — the services of the corporate Services section, in its two tabs
 * (Customers, Suppliers), in display order. Only published services appear on the website.
 */
@Component({
  selector: 'app-admin-services-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="services" />
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.website.services.title' | translate }}</h1>
        <p>{{ 'admin.website.services.lead' | translate }}</p>
      </div>
      <a class="adm-button" routerLink="/admin/website/services/new" [queryParams]="{ category: category() }">{{ 'admin.website.services.add' | translate }}</a>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice web-notice" [class.is-success]="n.kind === 'success'" [class.is-error]="n.kind === 'error'" [attr.role]="n.kind === 'error' ? 'alert' : 'status'">
        <p>{{ n.text }}</p>
        @for (d of n.details ?? []; track $index) {
          <p>{{ d }}</p>
        }
      </div>
    }

    <div class="web-segments" role="group" [attr.aria-label]="'admin.website.services.categories' | translate">
      @for (c of categories; track c) {
        <button type="button" [class.is-active]="category() === c" [attr.aria-pressed]="category() === c" [attr.data-category]="c" (click)="pick(c)">
          {{ ('admin.website.services.category.' + c) | translate }} ({{ count(byCategory(c).length) }})
        </button>
      }
    </div>

    <section class="adm-panel web-panel" [attr.aria-busy]="state() === 'loading' || busy()" aria-labelledby="web-s-title">
      <h2 id="web-s-title" class="adm-visually-hidden">{{ ('admin.website.services.category.' + category()) | translate }}</h2>
      @switch (state()) {
        @case ('loading') {
          <app-admin-state kind="loading" />
        }
        @case ('error') {
          <app-admin-state kind="error" (retry)="load()" />
        }
        @default {
          @if (!rows().length) {
            <app-admin-state kind="empty" message="admin.website.services.none" />
          } @else {
            <ul class="web-rows">
              @for (s of rows(); track s.id; let first = $first; let last = $last) {
                <li class="web-row" [class.is-hidden]="!s.is_active" [attr.data-service]="s.id">
                  <div class="web-order">
                    <button type="button" [disabled]="busy() || first" [attr.aria-label]="'admin.website.moveUp' | translate: { name: s.title_en }" (click)="move(s, -1)">↑</button>
                    <button type="button" [disabled]="busy() || last" [attr.aria-label]="'admin.website.moveDown' | translate: { name: s.title_en }" (click)="move(s, 1)">↓</button>
                  </div>
                  <div class="web-thumb">
                    @if (s.image_url; as src) {
                      <img [src]="src" alt="" loading="lazy" />
                    } @else {
                      {{ 'admin.website.noImage' | translate }}
                    }
                  </div>
                  <div class="web-main">
                    <strong>{{ s.title_en }}</strong>
                    <span class="web-alt" dir="rtl" lang="ar">{{ s.title_ar }}</span>
                    <span class="web-badge" [class.is-on]="s.is_active" [class.is-off]="!s.is_active">{{ (s.is_active ? 'admin.website.published' : 'admin.website.hidden') | translate }}</span>
                  </div>
                  <div class="web-row-actions">
                    <a class="adm-button is-light is-small" [routerLink]="['/admin/website/services', s.id]" [attr.aria-label]="'admin.website.editNamed' | translate: { name: s.title_en }">{{ 'admin.website.edit' | translate }}</a>
                    <button type="button" class="adm-button is-light is-small" [disabled]="busy()" (click)="toggle(s)">{{ (s.is_active ? 'admin.website.hide' : 'admin.website.publish') | translate }}</button>
                    <button type="button" class="adm-link web-delete" [disabled]="busy()" (click)="remove(s)">{{ 'admin.website.delete' | translate }}</button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      }
    </section>

    <app-admin-confirm-dialog />
  `,
  styleUrl: './admin-website.css',
})
export class AdminServicesPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly categories: ServiceCategory[] = ['customers', 'suppliers'];
  protected readonly category = signal<ServiceCategory>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('category') === 'suppliers' ? 'suppliers' : 'customers',
  );
  protected readonly services = signal<AdminService[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  protected readonly rows = computed(() => this.byCategory(this.category()));

  constructor() {
    this.language.addTranslations(adminWebsiteTranslations);
    this.load();
  }

  protected byCategory(category: ServiceCategory): AdminService[] {
    return this.services().filter((s) => s.category === category);
  }

  protected pick(category: ServiceCategory): void {
    this.category.set(category);
    this.notice.set(null);
  }

  protected load(): void {
    this.state.set(this.services().length ? 'ready' : 'loading');
    this.api.services().subscribe({
      next: (services) => {
        this.services.set(services);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (!this.sessionEnded(error)) {
          this.state.set('error');
        }
      },
    });
  }

  protected move(service: AdminService, step: -1 | 1): void {
    const ids = this.rows().map((s) => s.id);
    const from = ids.indexOf(service.id);
    const to = from + step;
    if (this.busy() || to < 0 || to >= ids.length) {
      return;
    }
    [ids[from], ids[to]] = [ids[to], ids[from]];
    const category = service.category;
    this.run(
      this.api.reorderServices(category, ids),
      (list) => this.services.update((all) => [...all.filter((s) => s.category !== category), ...(list as AdminService[])]),
      'admin.website.orderSaved',
      {},
    );
  }

  protected async toggle(service: AdminService): Promise<void> {
    const publish = !service.is_active;
    const ok = await this.confirm().ask({
      title: publish ? 'admin.website.services.publishTitle' : 'admin.website.services.hideTitle',
      message: publish ? 'admin.website.services.publishText' : 'admin.website.services.hideText',
      confirm: publish ? 'admin.website.publish' : 'admin.website.hide',
      params: { name: service.title_en },
    });
    if (!ok) {
      return;
    }
    this.run(
      this.api.updateService(service.id, { is_active: publish, expected_updated_at: service.updated_at }),
      (saved) => this.services.update((all) => all.map((s) => (s.id === service.id ? (saved as AdminService) : s))),
      publish ? 'admin.website.services.published' : 'admin.website.services.hiddenDone',
      { name: service.title_en },
    );
  }

  protected async remove(service: AdminService): Promise<void> {
    const ok = await this.confirm().ask({
      title: 'admin.website.services.deleteTitle',
      message: 'admin.website.services.deleteText',
      confirm: 'admin.website.delete',
      params: { name: service.title_en },
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    this.run(this.api.deleteService(service.id), () => this.services.update((all) => all.filter((s) => s.id !== service.id)), 'admin.website.services.deleted', {
      name: service.title_en,
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
