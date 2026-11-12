import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { AdminImageField } from './admin-image-field';
import { AdminService, ServiceCategory } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

interface ServiceForm {
  category: ServiceCategory;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  image_alt_en: string;
  image_alt_ar: string;
  image_path: string;
  hover_image_path: string;
  is_active: boolean;
}

const EMPTY: ServiceForm = {
  category: 'customers', title_en: '', title_ar: '', description_en: '', description_ar: '',
  image_alt_en: '', image_alt_ar: '', image_path: '', hover_image_path: '', is_active: false,
};

const PAIRS = [
  { field: 'title', label: 'admin.website.services.serviceTitle', required: true, max: 150, area: false },
  { field: 'description', label: 'admin.website.services.description', required: true, max: 2000, area: true },
  { field: 'image_alt', label: 'admin.website.imageAlt', required: false, max: 255, area: false },
] as const;

/** /admin/website/services/new and /admin/website/services/:id — one service in English and Arabic. */
@Component({
  selector: 'app-admin-service-form-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminImageField, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="services" />
    <p class="web-back"><a routerLink="/admin/website/services" [queryParams]="{ category: form().category }">{{ 'admin.website.services.back' | translate }}</a></p>

    @switch (state()) {
      @case ('loading') {
        <app-admin-state kind="loading" />
      }
      @case ('error') {
        <app-admin-state kind="error" (retry)="load()" />
      }
      @case ('notFound') {
        <app-admin-state kind="empty" message="admin.website.services.notFound" />
      }
      @default {
        <div class="adm-page-head">
          <div>
            <h1>{{ (id ? 'admin.website.services.editTitle' : 'admin.website.services.newTitle') | translate: { name: original()?.title_en ?? '' } }}</h1>
            <p>{{ 'admin.website.services.formLead' | translate }}</p>
          </div>
        </div>

        @if (notice(); as n) {
          <div class="adm-notice web-notice" [class.is-success]="n.kind === 'success'" [class.is-error]="n.kind === 'error'" [attr.role]="n.kind === 'error' ? 'alert' : 'status'">
            <p>{{ n.text }}</p>
            @if (n.details?.length) {
              <ul>
                @for (d of n.details; track $index) {
                  <li>{{ d }}</li>
                }
              </ul>
            }
          </div>
        }

        <form novalidate (submit)="$event.preventDefault(); save()">
          <section class="adm-panel" aria-labelledby="web-s-texts">
            <h2 id="web-s-texts">{{ 'admin.website.services.secTexts' | translate }}</h2>
            <div class="web-field">
              <label for="web-s-category">{{ 'admin.website.services.tab' | translate }}</label>
              <select id="web-s-category" (change)="set('category', $any($event.target).value)">
                @for (c of categories; track c) {
                  <option [value]="c" [selected]="form().category === c">{{ ('admin.website.services.category.' + c) | translate }}</option>
                }
              </select>
            </div>
            @for (pair of pairs; track pair.field) {
              <div class="web-pair">
                @for (lang of langs; track lang) {
                  <div class="web-field">
                    <label [for]="'web-s-' + pair.field + '-' + lang">{{ pair.label | translate }} ({{ ('admin.website.lang.' + lang) | translate }})@if (pair.required) { <span class="web-req" aria-hidden="true">*</span>}</label>
                    @if (pair.area) {
                      <textarea [id]="'web-s-' + pair.field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="pair.max" rows="4"
                        [value]="value(pair.field + '_' + lang)" [attr.aria-invalid]="!!errors()[pair.field + '_' + lang]"
                        (input)="set(pair.field + '_' + lang, $any($event.target).value)"></textarea>
                    } @else {
                      <input [id]="'web-s-' + pair.field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="pair.max"
                        [value]="value(pair.field + '_' + lang)" [attr.aria-invalid]="!!errors()[pair.field + '_' + lang]"
                        (input)="set(pair.field + '_' + lang, $any($event.target).value)" />
                    }
                    @for (e of errors()[pair.field + '_' + lang] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
                  </div>
                }
              </div>
            }
          </section>

          <section class="adm-panel" aria-labelledby="web-s-images">
            <h2 id="web-s-images">{{ 'admin.website.services.secImages' | translate }}</h2>
            <div class="web-images">
              <app-admin-image-field fieldId="web-s-image" label="admin.website.services.image" [url]="imageUrl('image')" (changed)="set('image_path', $event)" />
              <app-admin-image-field fieldId="web-s-hover" label="admin.website.services.hoverImage" [url]="imageUrl('hover_image')" (changed)="set('hover_image_path', $event)" />
            </div>
            <p class="web-help">{{ 'admin.website.services.imagesHelp' | translate }}</p>
          </section>

          <section class="adm-panel" aria-labelledby="web-s-publish">
            <h2 id="web-s-publish">{{ 'admin.website.publishing' | translate }}</h2>
            <label class="web-check">
              <input type="checkbox" [checked]="form().is_active" (change)="set('is_active', $any($event.target).checked)" />
              <span>{{ 'admin.website.services.isActive' | translate }}<small>{{ 'admin.website.services.isActiveHelp' | translate }}</small></span>
            </label>
            <div class="web-actions">
              <button type="submit" class="adm-button" [disabled]="saving() || !dirty()" [attr.aria-busy]="saving()">{{ (saving() ? 'admin.website.saving' : 'admin.website.save') | translate }}</button>
              <a class="adm-link" routerLink="/admin/website/services" [queryParams]="{ category: form().category }">{{ 'admin.website.cancel' | translate }}</a>
            </div>
          </section>
        </form>
      }
    }
  `,
  styleUrl: './admin-website.css',
})
export class AdminServiceFormPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;

  protected readonly pairs = PAIRS;
  protected readonly langs = ['en', 'ar'] as const;
  protected readonly categories: ServiceCategory[] = ['customers', 'suppliers'];

  protected readonly original = signal<AdminService | null>(null);
  protected readonly form = signal<ServiceForm>({
    ...EMPTY,
    category: this.route.snapshot.queryParamMap.get('category') === 'suppliers' ? 'suppliers' : 'customers',
  });
  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>(this.id ? 'loading' : 'ready');
  protected readonly saving = signal(false);
  protected readonly errors = signal<Partial<Record<string, string[]>>>({});
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  private readonly saved = signal<ServiceForm>(this.form());
  protected readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.saved()) || !this.id);

  constructor() {
    this.language.addTranslations(adminWebsiteTranslations);
    if (this.id) {
      this.load();
    }
  }

  protected load(): void {
    if (!this.id) {
      return;
    }
    this.state.set('loading');
    this.api.service(this.id).subscribe({
      next: (service) => this.fill(service),
      error: (error: unknown) => {
        if (!this.sessionEnded(error)) {
          this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error');
        }
      },
    });
  }

  protected value(key: string): string {
    return (this.form() as unknown as Record<string, string>)[key] ?? '';
  }

  protected set(key: string, value: string | boolean): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected imageUrl(kind: 'image' | 'hover_image'): string | null {
    const path = this.value(`${kind}_path`);
    if (!path) {
      return null;
    }
    const original = this.original();
    return original && original[`${kind}_path`] === path ? original[`${kind}_url`] : path.startsWith('/') ? path : null;
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.form())) {
      body[key] = typeof value === 'string' ? value.trim() || null : value;
    }
    body['category'] = this.form().category;
    this.saving.set(true);
    this.errors.set({});
    this.notice.set(null);
    const id = this.id;
    const request = id
      ? this.api.updateService(id, { ...body, expected_updated_at: this.original()?.updated_at ?? null } as Partial<AdminService>)
      : this.api.createService(body as Partial<AdminService>);
    request.subscribe({
      next: (service) => {
        this.saving.set(false);
        if (!id) {
          void this.router.navigate(['/admin/website/services'], { queryParams: { category: service.category } });
          return;
        }
        this.fill(service);
        this.notice.set({ kind: 'success', text: this.language.translate('admin.website.services.saved', { name: service.title_en }) });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const current = (error.error as { current?: AdminService } | null)?.current;
          if (current) {
            this.fill(current);
          }
          this.notice.set({ kind: 'error', text: this.language.translate('admin.website.changedMeanwhile') });
          return;
        }
        this.errors.set(apiFieldErrors(error));
        this.notice.set({ kind: 'error', text: this.language.translate('admin.website.checkFields'), details: apiErrorMessages(error) });
      },
    });
  }

  private fill(service: AdminService): void {
    const values: ServiceForm = {
      category: service.category,
      title_en: service.title_en ?? '',
      title_ar: service.title_ar ?? '',
      description_en: service.description_en ?? '',
      description_ar: service.description_ar ?? '',
      image_alt_en: service.image_alt_en ?? '',
      image_alt_ar: service.image_alt_ar ?? '',
      image_path: service.image_path ?? '',
      hover_image_path: service.hover_image_path ?? '',
      is_active: service.is_active,
    };
    this.original.set(service);
    this.form.set(values);
    this.saved.set({ ...values });
    this.state.set('ready');
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
