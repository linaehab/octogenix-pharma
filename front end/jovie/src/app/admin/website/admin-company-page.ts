import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { CompanyInfoKey, CompanyInfoSetting, ContentTextEntry, SiteContentEditor } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

/** The page texts edited here (they are also in Page content); the rest of the page is settings. */
const COMPANY_TEXTS = ['contact.address', 'footer.tagline'] as const;
const SOCIAL = ['social.facebook', 'social.instagram', 'social.linkedin'] as const;

interface Contacts {
  phones: string[];
  email: string;
  'social.facebook': string;
  'social.instagram': string;
  'social.linkedin': string;
}

/**
 * /admin/website/company — company contact details and social links (settings) and the company
 * address and footer line (page texts). They appear in the header, footer and Contact page.
 */
@Component({
  selector: 'app-admin-company-page',
  imports: [TranslatePipe, AdminState, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="company" />
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.website.company.title' | translate }}</h1>
        <p>{{ 'admin.website.company.lead' | translate }}</p>
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

    @switch (state()) {
      @case ('loading') {
        <app-admin-state kind="loading" />
      }
      @case ('error') {
        <app-admin-state kind="error" (retry)="load()" />
      }
      @default {
        <form class="adm-panel" novalidate aria-labelledby="web-c-contact" (submit)="$event.preventDefault(); saveContacts()">
          <h2 id="web-c-contact">{{ 'admin.website.company.secContact' | translate }}</h2>
          <fieldset class="web-field">
            <legend class="web-label">{{ 'admin.website.company.phones' | translate }}</legend>
            <ul class="web-phones">
              @for (phone of contacts().phones; track $index; let i = $index) {
                <li>
                  <label class="adm-visually-hidden" [for]="'web-c-phone-' + i">{{ 'admin.website.company.phoneN' | translate: { n: i + 1 } }}</label>
                  <input [id]="'web-c-phone-' + i" type="tel" dir="ltr" maxlength="20" placeholder="+20…" [value]="phone"
                    [attr.aria-invalid]="!!errors()['settings.contact.phones']" aria-describedby="web-c-phones-help" (input)="setPhone(i, $any($event.target).value)" />
                  <button type="button" class="adm-link" [attr.aria-label]="'admin.website.company.removePhone' | translate: { n: i + 1 }" (click)="removePhone(i)">{{ 'admin.website.remove' | translate }}</button>
                </li>
              }
            </ul>
            @if (contacts().phones.length < 10) {
              <button type="button" class="adm-button is-light is-small web-add-phone" (click)="addPhone()">{{ 'admin.website.company.addPhone' | translate }}</button>
            }
            <p class="web-help" id="web-c-phones-help">{{ 'admin.website.company.phonesHelp' | translate }}</p>
            @for (e of errors()['settings.contact.phones'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
          </fieldset>
          <div class="web-field">
            <label for="web-c-email">{{ 'admin.website.company.email' | translate }}</label>
            <input id="web-c-email" type="email" dir="ltr" maxlength="255" [value]="contacts().email" [attr.aria-invalid]="!!errors()['settings.contact.email']" (input)="setContact('email', $any($event.target).value)" />
            @for (e of errors()['settings.contact.email'] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
          </div>
          <h3>{{ 'admin.website.company.social' | translate }}</h3>
          <p class="web-help">{{ 'admin.website.company.socialHelp' | translate }}</p>
          <div class="web-pair">
            @for (key of social; track key) {
              <div class="web-field">
                <label [for]="'web-c-' + key">{{ ('admin.website.company.' + key) | translate }}</label>
                <input [id]="'web-c-' + key" type="url" dir="ltr" maxlength="500" placeholder="https://" [value]="contacts()[key]"
                  [attr.aria-invalid]="!!errors()['settings.' + key]" (input)="setContact(key, $any($event.target).value)" />
                @for (e of errors()['settings.' + key] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
              </div>
            }
          </div>
          <div class="web-actions">
            <button type="submit" class="adm-button" [disabled]="busy() || !contactsDirty()">{{ (busy() ? 'admin.website.saving' : 'admin.website.company.saveContact') | translate }}</button>
          </div>
        </form>

        <form class="adm-panel" novalidate aria-labelledby="web-c-texts" (submit)="$event.preventDefault(); saveTexts()">
          <h2 id="web-c-texts">{{ 'admin.website.company.secTexts' | translate }}</h2>
          @for (key of texts; track key) {
            <div class="web-pair">
              @for (lang of langs; track lang) {
                <div class="web-field">
                  <label [for]="'web-c-' + key + '-' + lang">{{ ('admin.website.company.' + key) | translate }} ({{ ('admin.website.lang.' + lang) | translate }})</label>
                  <textarea [id]="'web-c-' + key + '-' + lang" rows="2" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="maxLength(key)"
                    [value]="textValue(key, lang)" [attr.aria-invalid]="!!errors()['entries.' + key + '.value_' + lang]" (input)="setText(key, lang, $any($event.target).value)"></textarea>
                  @for (e of errors()['entries.' + key + '.value_' + lang] ?? []; track $index) {<p class="web-error">{{ e }}</p>}
                </div>
              }
            </div>
          }
          <div class="web-actions">
            <button type="submit" class="adm-button" [disabled]="busy() || !textsDirty()">{{ (busy() ? 'admin.website.saving' : 'admin.website.company.saveTexts') | translate }}</button>
          </div>
        </form>
      }
    }
  `,
  styleUrl: './admin-website.css',
  styles: `
    .web-phones {
      display: grid;
      gap: 0.5rem;
      margin: 0 0 0.5rem;
      padding: 0;
      list-style: none;
    }

    .web-phones li {
      display: flex;
      gap: 0.5rem;
    }

    .web-phones input {
      flex: 1 1 auto;
    }
  `,
})
export class AdminCompanyPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly social = SOCIAL;
  protected readonly texts = COMPANY_TEXTS;
  protected readonly langs = ['en', 'ar'] as const;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly errors = signal<Partial<Record<string, string[]>>>({});
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);

  /** The values as saved (also sent as "expected", so another admin's change is never overwritten). */
  private readonly savedSettings = signal<Record<CompanyInfoKey, unknown> | null>(null);
  protected readonly contacts = signal<Contacts>({ phones: [], email: '', 'social.facebook': '', 'social.instagram': '', 'social.linkedin': '' });
  private readonly savedContacts = signal<Contacts | null>(null);
  protected readonly contactsDirty = computed(() => JSON.stringify(this.contacts()) !== JSON.stringify(this.savedContacts()));

  private readonly entries = signal<Record<string, ContentTextEntry>>({});
  protected readonly textValues = signal<Record<string, string>>({});
  private readonly savedTexts = signal<Record<string, string>>({});
  protected readonly textsDirty = computed(() => JSON.stringify(this.textValues()) !== JSON.stringify(this.savedTexts()));

  constructor() {
    this.language.addTranslations(adminWebsiteTranslations);
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    forkJoin({ info: this.api.companyInfo(), content: this.api.content() }).subscribe({
      next: ({ info, content }) => {
        this.fillSettings(info);
        this.fillTexts(content);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (!this.sessionEnded(error)) {
          this.state.set('error');
        }
      },
    });
  }

  protected setPhone(index: number, value: string): void {
    this.contacts.update((c) => ({ ...c, phones: c.phones.map((p, i) => (i === index ? value : p)) }));
  }

  protected addPhone(): void {
    this.contacts.update((c) => ({ ...c, phones: [...c.phones, ''] }));
  }

  protected removePhone(index: number): void {
    this.contacts.update((c) => ({ ...c, phones: c.phones.filter((_, i) => i !== index) }));
  }

  protected setContact(key: 'email' | (typeof SOCIAL)[number], value: string): void {
    this.contacts.update((c) => ({ ...c, [key]: value }));
  }

  protected textValue(key: string, lang: 'en' | 'ar'): string {
    return this.textValues()[`${key}.${lang}`] ?? '';
  }

  protected setText(key: string, lang: 'en' | 'ar', value: string): void {
    this.textValues.update((t) => ({ ...t, [`${key}.${lang}`]: value }));
  }

  protected maxLength(key: string): number {
    return this.entries()[key]?.max_length ?? 255;
  }

  protected saveContacts(): void {
    const c = this.contacts();
    const settings = {
      'contact.phones': c.phones.map((p) => p.replace(/\s+/g, '')).filter((p) => p !== ''),
      'contact.email': c.email.trim() || null,
      'social.facebook': c['social.facebook'].trim() || null,
      'social.instagram': c['social.instagram'].trim() || null,
      'social.linkedin': c['social.linkedin'].trim() || null,
    };
    this.submit(this.api.saveCompanyInfo(settings, this.savedSettings() ?? {}), (info) => this.fillSettings(info as CompanyInfoSetting[]), 'admin.website.company.contactSaved');
  }

  protected saveTexts(): void {
    const entries: Record<string, Record<string, string>> = {};
    for (const key of COMPANY_TEXTS) {
      entries[key] = { value_en: this.textValue(key, 'en').trim(), value_ar: this.textValue(key, 'ar').trim() };
    }
    this.submit(this.api.saveEntries(entries), (content) => this.fillTexts(content as SiteContentEditor), 'admin.website.company.textsSaved');
  }

  private submit(request: ReturnType<AdminWebsiteService['saveEntries']> | ReturnType<AdminWebsiteService['saveCompanyInfo']>, done: (result: unknown) => void, success: string): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.errors.set({});
    this.notice.set(null);
    (request as ReturnType<AdminWebsiteService['saveCompanyInfo']>).subscribe({
      next: (result) => {
        this.busy.set(false);
        done(result);
        this.notice.set({ kind: 'success', text: this.language.translate(success) });
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
        this.errors.set(apiFieldErrors(error));
        this.notice.set({ kind: 'error', text: this.language.translate('admin.website.checkFields'), details: apiErrorMessages(error) });
      },
    });
  }

  private fillSettings(info: CompanyInfoSetting[]): void {
    const values = Object.fromEntries(info.map((s) => [s.key, s.value])) as Record<CompanyInfoKey, unknown>;
    this.savedSettings.set(values);
    const contacts: Contacts = {
      phones: [...((values['contact.phones'] as string[] | null) ?? [])],
      email: (values['contact.email'] as string | null) ?? '',
      'social.facebook': (values['social.facebook'] as string | null) ?? '',
      'social.instagram': (values['social.instagram'] as string | null) ?? '',
      'social.linkedin': (values['social.linkedin'] as string | null) ?? '',
    };
    this.contacts.set(contacts);
    this.savedContacts.set({ ...contacts, phones: [...contacts.phones] });
  }

  private fillTexts(content: SiteContentEditor): void {
    const found: Record<string, ContentTextEntry> = {};
    for (const group of content.groups) {
      for (const entry of group.entries) {
        if ((COMPANY_TEXTS as readonly string[]).includes(entry.key) && entry.type !== 'image') {
          found[entry.key] = entry;
        }
      }
    }
    const values: Record<string, string> = {};
    for (const key of COMPANY_TEXTS) {
      values[`${key}.en`] = found[key]?.value_en ?? '';
      values[`${key}.ar`] = found[key]?.value_ar ?? '';
    }
    this.entries.set(found);
    this.textValues.set(values);
    this.savedTexts.set({ ...values });
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
