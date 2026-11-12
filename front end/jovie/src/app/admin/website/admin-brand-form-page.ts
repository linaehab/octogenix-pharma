import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { AdminImageField } from './admin-image-field';
import { AdminBrand, BrandLinkType } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

type BrandForm = Record<
  | 'slug' | 'name_en' | 'name_ar' | 'label_en' | 'label_ar' | 'short_description_en' | 'short_description_ar'
  | 'description_en' | 'description_ar' | 'image_alt_en' | 'image_alt_ar' | 'cta_label_en' | 'cta_label_ar' | 'link_url'
  | 'logo_path' | 'image_path' | 'hover_image_path',
  string
> & { link_type: BrandLinkType; has_store: boolean; is_active: boolean };

const TEXT_PAIRS = [
  { field: 'name', label: 'admin.website.brands.name', required: true, max: 150, area: false },
  { field: 'label', label: 'admin.website.brands.label', required: false, max: 150, area: false },
  { field: 'short_description', label: 'admin.website.brands.shortDescription', required: false, max: 500, area: true },
  { field: 'description', label: 'admin.website.brands.description', required: false, max: 5000, area: true },
  { field: 'image_alt', label: 'admin.website.imageAlt', required: false, max: 255, area: false },
  { field: 'cta_label', label: 'admin.website.brands.ctaLabel', required: false, max: 80, area: false },
] as const;

const EMPTY: BrandForm = {
  slug: '', name_en: '', name_ar: '', label_en: '', label_ar: '', short_description_en: '', short_description_ar: '',
  description_en: '', description_ar: '', image_alt_en: '', image_alt_ar: '', cta_label_en: '', cta_label_ar: '', link_url: '',
  logo_path: '', image_path: '', hover_image_path: '', link_type: 'none', has_store: false, is_active: false,
};

/**
 * /admin/website/brands/new and /admin/website/brands/:id — one brand's names, texts (English and
 * Arabic), images, link and publishing. The API validates everything again (for example, a brand
 * needs descriptions and an image before it can be published).
 */
@Component({
  selector: 'app-admin-brand-form-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminImageField, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="brands" />
    <p class="web-back"><a routerLink="/admin/website/brands">{{ 'admin.website.brands.back' | translate }}</a></p>

    @switch (state()) {
      @case ('loading') {
        <app-admin-state kind="loading" />
      }
      @case ('error') {
        <app-admin-state kind="error" (retry)="load()" />
      }
      @case ('notFound') {
        <app-admin-state kind="empty" message="admin.website.brands.notFound" />
      }
      @default {
        <div class="adm-page-head">
          <div>
            <h1>{{ (id ? 'admin.website.brands.editTitle' : 'admin.website.brands.newTitle') | translate: { name: original()?.name_en ?? '' } }}</h1>
            <p>{{ 'admin.website.brands.formLead' | translate }}</p>
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

        <form class="web-form" novalidate (submit)="$event.preventDefault(); save()">
          <section class="adm-panel" aria-labelledby="web-b-texts">
            <h2 id="web-b-texts">{{ 'admin.website.brands.secTexts' | translate }}</h2>
            <div class="web-field">
              <label for="web-b-slug">{{ 'admin.website.brands.slug' | translate }} <span class="web-req" aria-hidden="true">*</span></label>
              <input id="web-b-slug" dir="ltr" maxlength="150" [value]="form().slug" [attr.aria-invalid]="!!errors()['slug']" aria-describedby="web-b-slug-help" (input)="set('slug', $any($event.target).value)" />
              <p class="web-help" id="web-b-slug-help">{{ 'admin.website.brands.slugHelp' | translate }}</p>
              @for (e of errors()['slug'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
            </div>
            @for (pair of pairs; track pair.field) {
              <div class="web-pair">
                @for (lang of langs; track lang) {
                  <div class="web-field">
                    <label [for]="'web-b-' + pair.field + '-' + lang">{{ pair.label | translate }} ({{ ('admin.website.lang.' + lang) | translate }})@if (pair.required) { <span class="web-req" aria-hidden="true">*</span>}</label>
                    @if (pair.area) {
                      <textarea [id]="'web-b-' + pair.field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="pair.max" rows="3"
                        [value]="value(pair.field + '_' + lang)" [attr.aria-invalid]="!!errors()[pair.field + '_' + lang]"
                        (input)="set(pair.field + '_' + lang, $any($event.target).value)"></textarea>
                    } @else {
                      <input [id]="'web-b-' + pair.field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="pair.max"
                        [value]="value(pair.field + '_' + lang)" [attr.aria-invalid]="!!errors()[pair.field + '_' + lang]"
                        (input)="set(pair.field + '_' + lang, $any($event.target).value)" />
                    }
                    @for (e of errors()[pair.field + '_' + lang] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
                  </div>
                }
              </div>
            }
            <p class="web-help">{{ 'admin.website.brands.publishRule' | translate }}</p>
          </section>

          <section class="adm-panel" aria-labelledby="web-b-images">
            <h2 id="web-b-images">{{ 'admin.website.brands.secImages' | translate }}</h2>
            <div class="web-images">
              <app-admin-image-field fieldId="web-b-logo" label="admin.website.brands.logo" [url]="imageUrl('logo')" (changed)="set('logo_path', $event)" />
              <app-admin-image-field fieldId="web-b-image" label="admin.website.brands.image" [url]="imageUrl('image')" (changed)="set('image_path', $event)" />
              <app-admin-image-field fieldId="web-b-hover" label="admin.website.brands.hoverImage" [url]="imageUrl('hover_image')" (changed)="set('hover_image_path', $event)" />
            </div>
            @for (e of errors()['image_path'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
            <p class="web-help">{{ 'admin.website.brands.imagesHelp' | translate }}</p>
          </section>

          <section class="adm-panel" aria-labelledby="web-b-link">
            <h2 id="web-b-link">{{ 'admin.website.brands.secLink' | translate }}</h2>
            <div class="web-pair">
              <div class="web-field">
                <label for="web-b-link-type">{{ 'admin.website.brands.linkType' | translate }}</label>
                <select id="web-b-link-type" (change)="set('link_type', $any($event.target).value)">
                  @for (t of linkTypes; track t) {
                    <option [value]="t" [selected]="form().link_type === t">{{ ('admin.website.brands.link.' + t) | translate }}</option>
                  }
                </select>
              </div>
              @if (form().link_type !== 'none') {
                <div class="web-field">
                  <label for="web-b-link-url">{{ 'admin.website.brands.linkUrl' | translate }}</label>
                  <input id="web-b-link-url" dir="ltr" maxlength="500" [value]="form().link_url" [placeholder]="form().link_type === 'external' ? 'https://' : '/contact'"
                    [attr.aria-invalid]="!!errors()['link_url']" aria-describedby="web-b-link-help" (input)="set('link_url', $any($event.target).value)" />
                  <p class="web-help" id="web-b-link-help">{{ ('admin.website.brands.linkHelp.' + form().link_type) | translate }}</p>
                  @for (e of errors()['link_url'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
                </div>
              }
            </div>
            <label class="web-check">
              <input type="checkbox" [checked]="form().has_store" (change)="set('has_store', $any($event.target).checked)" />
              <span>{{ 'admin.website.brands.hasStore' | translate }}<small>{{ 'admin.website.brands.hasStoreHelp' | translate }}</small></span>
            </label>
          </section>

          <section class="adm-panel" aria-labelledby="web-b-publish">
            <h2 id="web-b-publish">{{ 'admin.website.publishing' | translate }}</h2>
            <label class="web-check">
              <input type="checkbox" [checked]="form().is_active" (change)="set('is_active', $any($event.target).checked)" />
              <span>{{ 'admin.website.brands.isActive' | translate }}<small>{{ 'admin.website.brands.isActiveHelp' | translate }}</small></span>
            </label>
            @for (e of errors()['is_active'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
            <div class="web-actions">
              <button type="submit" class="adm-button" [disabled]="saving() || !dirty()" [attr.aria-busy]="saving()">{{ (saving() ? 'admin.website.saving' : 'admin.website.save') | translate }}</button>
              <a class="adm-link" routerLink="/admin/website/brands">{{ 'admin.website.cancel' | translate }}</a>
            </div>
          </section>
        </form>
      }
    }
  `,
  styleUrl: './admin-website.css',
})
export class AdminBrandFormPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;

  protected readonly pairs = TEXT_PAIRS;
  protected readonly langs = ['en', 'ar'] as const;
  protected readonly linkTypes: BrandLinkType[] = ['none', 'internal', 'external'];

  protected readonly original = signal<AdminBrand | null>(null);
  protected readonly form = signal<BrandForm>({ ...EMPTY });
  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>(this.id ? 'loading' : 'ready');
  protected readonly saving = signal(false);
  protected readonly errors = signal<Partial<Record<string, string[]>>>({});
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  private readonly saved = signal<BrandForm>({ ...EMPTY });
  protected readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.saved()));

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
    this.api.brand(this.id).subscribe({
      next: (brand) => this.fill(brand),
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

  /** The saved image, or null once the admin removed it in this form. */
  protected imageUrl(kind: 'logo' | 'image' | 'hover_image'): string | null {
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
    const f = this.form();
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(f)) {
      body[key] = typeof value === 'string' ? value.trim() || null : value;
    }
    body['slug'] = f.slug.trim();
    if (f.link_type === 'none') {
      body['link_url'] = null;
    }
    this.saving.set(true);
    this.errors.set({});
    this.notice.set(null);
    const id = this.id;
    const request = id
      ? this.api.updateBrand(id, { ...body, expected_updated_at: this.original()?.updated_at ?? null } as Partial<AdminBrand>)
      : this.api.createBrand(body as Partial<AdminBrand>);
    request.subscribe({
      next: (brand) => {
        this.saving.set(false);
        if (!id) {
          void this.router.navigate(['/admin/website/brands', brand.id], { state: { created: true } });
          return;
        }
        this.fill(brand);
        this.notice.set({ kind: 'success', text: this.language.translate('admin.website.brands.saved', { name: brand.name_en }) });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const current = (error.error as { current?: AdminBrand } | null)?.current;
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

  private fill(brand: AdminBrand): void {
    const values: BrandForm = { ...EMPTY };
    for (const key of Object.keys(EMPTY) as (keyof BrandForm)[]) {
      const v = brand[key as keyof AdminBrand];
      (values as unknown as Record<string, unknown>)[key] = typeof EMPTY[key] === 'boolean' ? !!v : ((v as string | null) ?? '');
    }
    values.link_type = brand.link_type;
    this.original.set(brand);
    this.form.set(values);
    this.saved.set({ ...values });
    this.state.set('ready');
    if (typeof history !== 'undefined' && (history.state as { created?: boolean } | null)?.created && !this.notice()) {
      this.notice.set({ kind: 'success', text: this.language.translate('admin.website.brands.created', { name: brand.name_en }) });
      history.replaceState({ ...history.state, created: false }, '');
    }
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
