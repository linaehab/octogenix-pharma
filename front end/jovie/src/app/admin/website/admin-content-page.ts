import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { AdminImageField } from './admin-image-field';
import { ContentEntry, ContentList, ContentListField, ContentListItem, SiteContentEditor } from './admin-website.models';
import { AdminWebsiteNav } from './admin-website-nav';
import { AdminWebsiteService } from './admin-website.service';
import { adminWebsiteTranslations } from './admin-website-translations';

/** Item columns per list field (the API's ContentItem::FIELD_COLUMNS). */
const COLUMNS: Record<ContentListField, string[]> = {
  title: ['title_en', 'title_ar'],
  subtitle: ['subtitle_en', 'subtitle_ar'],
  description: ['description_en', 'description_ar'],
  image: ['image_path'],
  secondary_image: ['secondary_image_path'],
  image_alt: ['image_alt_en', 'image_alt_ar'],
  icon: ['icon'],
  link: ['link_url'],
};

type Draft = Record<string, string>;

/**
 * /admin/website/content — the approved editable texts, images and lists of the corporate pages,
 * one page section at a time. Only the fields in the content registry exist: this is not a page
 * builder, and the website layout never changes.
 */
@Component({
  selector: 'app-admin-content-page',
  imports: [TranslatePipe, AdminState, AdminConfirmDialog, AdminImageField, AdminWebsiteNav],
  template: `
    <app-admin-website-nav current="content" />
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.website.content.title' | translate }}</h1>
        <p>{{ 'admin.website.content.lead' | translate }}</p>
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
        <div class="adm-panel">
          <div class="web-field">
            <label for="web-section">{{ 'admin.website.content.section' | translate }}</label>
            <select id="web-section" (change)="pickGroup($any($event.target).value)">
              @for (g of groupKeys(); track g) {
                <option [value]="g" [selected]="group() === g">{{ groupLabel(g) }}</option>
              }
            </select>
            <p class="web-help">{{ 'admin.website.content.sectionHelp' | translate }}</p>
          </div>
        </div>

        @if (entries().length) {
          <form class="adm-panel" novalidate aria-labelledby="web-entries" (submit)="$event.preventDefault(); saveEntries()">
            <h2 id="web-entries">{{ 'admin.website.content.texts' | translate: { section: groupLabel(group()) } }}</h2>
            @for (e of entries(); track e.key) {
              <div class="web-entry" [attr.data-key]="e.key">
                <p class="web-entry-key">{{ label(e.key) }}<code dir="ltr">{{ e.key }}</code></p>
                @if (e.type === 'image') {
                  <app-admin-image-field [fieldId]="'web-e-' + e.key" label="admin.website.content.image" [required]="true"
                    [url]="draft()[e.key + '.image'] === e.image_path ? e.image_url : null" (changed)="setDraft(e.key + '.image', $event)" />
                } @else {
                  <div class="web-pair">
                    @for (lang of langs; track lang) {
                      <div class="web-field">
                        <label [for]="'web-e-' + e.key + '-' + lang">{{ ('admin.website.lang.' + lang) | translate }}</label>
                        @if (e.type === 'textarea') {
                          <textarea [id]="'web-e-' + e.key + '-' + lang" rows="3" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="e.max_length"
                            [value]="draft()[e.key + '.' + lang]" [attr.aria-invalid]="!!errors()['entries.' + e.key + '.value_' + lang]"
                            (input)="setDraft(e.key + '.' + lang, $any($event.target).value)"></textarea>
                        } @else {
                          <input [id]="'web-e-' + e.key + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang" [attr.maxlength]="e.max_length"
                            [value]="draft()[e.key + '.' + lang]" [attr.aria-invalid]="!!errors()['entries.' + e.key + '.value_' + lang]"
                            (input)="setDraft(e.key + '.' + lang, $any($event.target).value)" />
                        }
                        @for (err of errors()['entries.' + e.key + '.value_' + lang] ?? []; track $index) {<p class="web-error">{{ err }}</p>}
                      </div>
                    }
                  </div>
                }
              </div>
            }
            <div class="web-actions">
              <button type="submit" class="adm-button" [disabled]="busy() || !changedKeys().length">
                {{ (busy() ? 'admin.website.saving' : 'admin.website.content.saveSection') | translate: { count: changedKeys().length } }}
              </button>
              @if (changedKeys().length) {
                <button type="button" class="adm-link" [disabled]="busy()" (click)="resetDraft()">{{ 'admin.website.content.discard' | translate }}</button>
              }
            </div>
          </form>
        }

        @for (list of lists(); track list.key) {
          <section class="adm-panel" [attr.aria-labelledby]="'web-list-' + list.key" [attr.data-list]="list.key">
            <h2 [id]="'web-list-' + list.key">{{ listLabel(list.key) }}</h2>
            <p class="web-help">{{ 'admin.website.content.listHelp' | translate: { min: list.min, max: list.max } }}</p>
            <ul class="web-rows">
              @for (item of list.items; track item.id; let first = $first; let last = $last) {
                <li class="web-item" [class.is-hidden]="!item.is_active" [attr.data-item]="item.id">
                  <div class="web-item-head">
                    <span class="web-badge" [class.is-on]="item.is_active" [class.is-off]="!item.is_active">{{ (item.is_active ? 'admin.website.published' : 'admin.website.hidden') | translate }}</span>
                    <div class="web-row-actions">
                      <button type="button" class="adm-button is-light is-small" [disabled]="busy() || first" [attr.aria-label]="'admin.website.moveUp' | translate: { name: itemName(item) }" (click)="moveItem(list, item, -1)">↑</button>
                      <button type="button" class="adm-button is-light is-small" [disabled]="busy() || last" [attr.aria-label]="'admin.website.moveDown' | translate: { name: itemName(item) }" (click)="moveItem(list, item, 1)">↓</button>
                      <button type="button" class="adm-button is-light is-small" [disabled]="busy()" (click)="toggleItem(item)">{{ (item.is_active ? 'admin.website.hide' : 'admin.website.publish') | translate }}</button>
                      <button type="button" class="adm-link" [disabled]="busy()" (click)="deleteItem(item)">{{ 'admin.website.delete' | translate }}</button>
                    </div>
                  </div>
                  <form novalidate (submit)="$event.preventDefault(); saveItem(list, item)">
                    @for (field of list.fields; track field) {
                      @switch (field) {
                        @case ('image') {
                          <app-admin-image-field [fieldId]="'web-i-' + item.id + '-image'" label="admin.website.content.image" [required]="list.required.includes('image')"
                            [url]="itemDraftValue(item.id, 'image_path') === (item.image_path ?? '') ? item.image?.url ?? null : null" (changed)="setItem(item.id, 'image_path', $event)" />
                        }
                        @case ('secondary_image') {
                          <app-admin-image-field [fieldId]="'web-i-' + item.id + '-image2'" label="admin.website.content.secondaryImage"
                            [url]="itemDraftValue(item.id, 'secondary_image_path') === (item.secondary_image_path ?? '') ? item.secondary_image?.url ?? null : null" (changed)="setItem(item.id, 'secondary_image_path', $event)" />
                        }
                        @case ('icon') {
                          <div class="web-field">
                            <label [for]="'web-i-' + item.id + '-icon'">{{ 'admin.website.content.field.icon' | translate }}</label>
                            <select [id]="'web-i-' + item.id + '-icon'" (change)="setItem(item.id, 'icon', $any($event.target).value)">
                              @for (icon of list.icons ?? []; track icon) {
                                <option [value]="icon" [selected]="itemDraftValue(item.id, 'icon') === icon">{{ icon }}</option>
                              }
                            </select>
                          </div>
                        }
                        @case ('link') {
                          <div class="web-field">
                            <label [for]="'web-i-' + item.id + '-link'">{{ 'admin.website.content.field.link' | translate }}</label>
                            <input [id]="'web-i-' + item.id + '-link'" dir="ltr" maxlength="500" [value]="itemDraftValue(item.id, 'link_url')" (input)="setItem(item.id, 'link_url', $any($event.target).value)" />
                          </div>
                        }
                        @default {
                          <div class="web-pair">
                            @for (lang of langs; track lang) {
                              <div class="web-field">
                                <label [for]="'web-i-' + item.id + '-' + field + '-' + lang">{{ ('admin.website.content.field.' + field) | translate }} ({{ ('admin.website.lang.' + lang) | translate }})@if (list.required.includes(field)) { <span class="web-req" aria-hidden="true">*</span>}</label>
                                <input [id]="'web-i-' + item.id + '-' + field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang"
                                  [value]="itemDraftValue(item.id, field + '_' + lang)" [attr.aria-invalid]="!!itemErrors()[item.id + '.' + field + '_' + lang]"
                                  (input)="setItem(item.id, field + '_' + lang, $any($event.target).value)" />
                                @for (err of itemErrors()[item.id + '.' + field + '_' + lang] ?? []; track $index) {<p class="web-error">{{ err }}</p>}
                              </div>
                            }
                          </div>
                        }
                      }
                    }
                    <button type="submit" class="adm-button is-small" [disabled]="busy() || !itemDirty(item)">{{ 'admin.website.content.saveItem' | translate }}</button>
                  </form>
                </li>
              }
            </ul>
            @if (list.items.length < list.max) {
              <form class="web-item web-new-item" novalidate [attr.aria-labelledby]="'web-new-' + list.key" (submit)="$event.preventDefault(); addItem(list)">
                <h3 [id]="'web-new-' + list.key">{{ 'admin.website.content.addItem' | translate }}</h3>
                @for (field of list.fields; track field) {
                  @switch (field) {
                    @case ('image') {
                      <app-admin-image-field [fieldId]="'web-n-' + list.key + '-image'" label="admin.website.content.image" [required]="list.required.includes('image')"
                        [url]="null" (changed)="setNew(list.key, 'image_path', $event)" />
                    }
                    @case ('secondary_image') {
                      <app-admin-image-field [fieldId]="'web-n-' + list.key + '-image2'" label="admin.website.content.secondaryImage" [url]="null" (changed)="setNew(list.key, 'secondary_image_path', $event)" />
                    }
                    @case ('icon') {
                      <div class="web-field">
                        <label [for]="'web-n-' + list.key + '-icon'">{{ 'admin.website.content.field.icon' | translate }}</label>
                        <select [id]="'web-n-' + list.key + '-icon'" (change)="setNew(list.key, 'icon', $any($event.target).value)">
                          <option value="">—</option>
                          @for (icon of list.icons ?? []; track icon) {
                            <option [value]="icon">{{ icon }}</option>
                          }
                        </select>
                      </div>
                    }
                    @case ('link') {
                      <div class="web-field">
                        <label [for]="'web-n-' + list.key + '-link'">{{ 'admin.website.content.field.link' | translate }}</label>
                        <input [id]="'web-n-' + list.key + '-link'" dir="ltr" maxlength="500" (input)="setNew(list.key, 'link_url', $any($event.target).value)" />
                      </div>
                    }
                    @default {
                      <div class="web-pair">
                        @for (lang of langs; track lang) {
                          <div class="web-field">
                            <label [for]="'web-n-' + list.key + '-' + field + '-' + lang">{{ ('admin.website.content.field.' + field) | translate }} ({{ ('admin.website.lang.' + lang) | translate }})@if (list.required.includes(field)) { <span class="web-req" aria-hidden="true">*</span>}</label>
                            <input [id]="'web-n-' + list.key + '-' + field + '-' + lang" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lang"
                              [value]="newDrafts()[list.key]?.[field + '_' + lang] ?? ''" (input)="setNew(list.key, field + '_' + lang, $any($event.target).value)" />
                          </div>
                        }
                      </div>
                    }
                  }
                }
                <p class="web-help">{{ 'admin.website.content.newHidden' | translate }}</p>
                <button type="submit" class="adm-button is-light is-small" [disabled]="busy()">{{ 'admin.website.content.addItem' | translate }}</button>
              </form>
            }
          </section>
        }
      }
    }

    <app-admin-confirm-dialog />
  `,
  styleUrl: './admin-website.css',
})
export class AdminContentPage {
  private readonly api = inject(AdminWebsiteService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly langs = ['en', 'ar'] as const;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  protected readonly errors = signal<Partial<Record<string, string[]>>>({});
  protected readonly itemErrors = signal<Partial<Record<string, string[]>>>({});

  private readonly data = signal<SiteContentEditor | null>(null);
  protected readonly group = signal('');
  /** Edited entry values: "<key>.en", "<key>.ar" or "<key>.image". */
  protected readonly draft = signal<Draft>({});
  private readonly saved = signal<Draft>({});
  private readonly itemDrafts = signal<Record<number, Draft>>({});
  protected readonly newDrafts = signal<Record<string, Draft>>({});

  /** Page sections: every entry group and every list group, in registry order. */
  protected readonly groupKeys = computed(() => {
    const d = this.data();
    return d ? [...new Set([...d.groups.map((g) => g.group), ...d.lists.map((l) => l.group)])] : [];
  });
  protected readonly entries = computed<ContentEntry[]>(() => this.data()?.groups.find((g) => g.group === this.group())?.entries ?? []);
  protected readonly lists = computed<ContentList[]>(() => this.data()?.lists.filter((l) => l.group === this.group()) ?? []);
  protected readonly changedKeys = computed(() => {
    const keys = new Set<string>();
    for (const [k, v] of Object.entries(this.draft())) {
      if (v !== this.saved()[k]) {
        keys.add(k.slice(0, k.lastIndexOf('.')));
      }
    }
    return [...keys];
  });

  constructor() {
    this.language.addTranslations(adminWebsiteTranslations);
    this.load();
  }

  protected load(): void {
    this.state.set(this.data() ? 'ready' : 'loading');
    this.api.content().subscribe({
      next: (data) => this.fill(data),
      error: (error: unknown) => {
        if (!this.sessionEnded(error)) {
          this.state.set('error');
        }
      },
    });
  }

  protected pickGroup(group: string): void {
    if (this.changedKeys().length && !window.confirm(this.language.translate('admin.website.content.leaveUnsaved'))) {
      return;
    }
    this.group.set(group);
    this.resetDraft();
    this.notice.set(null);
  }

  protected groupLabel(group: string): string {
    const key = `admin.website.content.group.${group}`;
    const text = this.language.translate(key);
    return text === key ? group : text;
  }

  protected listLabel(list: string): string {
    const key = `admin.website.content.list.${list}`;
    const text = this.language.translate(key);
    return text === key ? list : text;
  }

  /** "hero.titleFirst" → "Title first" (the key itself is shown next to it). */
  protected label(key: string): string {
    const last = key.slice(key.lastIndexOf('.') + 1).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  protected setDraft(key: string, value: string): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected resetDraft(): void {
    this.draft.set({ ...this.saved() });
    this.errors.set({});
  }

  protected saveEntries(): void {
    const entries: Record<string, Record<string, string | null>> = {};
    for (const key of this.changedKeys()) {
      const entry = this.entries().find((e) => e.key === key);
      if (!entry) {
        continue;
      }
      entries[key] =
        entry.type === 'image'
          ? { image_path: this.draft()[`${key}.image`] || null }
          : { value_en: (this.draft()[`${key}.en`] ?? '').trim(), value_ar: (this.draft()[`${key}.ar`] ?? '').trim() };
    }
    this.run(this.api.saveEntries(entries), (data) => this.fill(data as SiteContentEditor), 'admin.website.content.saved', {
      count: String(Object.keys(entries).length),
    });
  }

  // Lists
  protected itemDraftValue(id: number, column: string): string {
    return this.itemDrafts()[id]?.[column] ?? '';
  }

  protected setItem(id: number, column: string, value: string): void {
    this.itemDrafts.update((all) => ({ ...all, [id]: { ...all[id], [column]: value } }));
  }

  protected itemDirty(item: ContentListItem): boolean {
    const draft = this.itemDrafts()[item.id] ?? {};
    const original = this.itemValues(item);
    return Object.keys(draft).some((k) => draft[k] !== (original[k] ?? ''));
  }

  protected itemName(item: ContentListItem): string {
    return item.title?.en ?? `#${item.id}`;
  }

  protected setNew(listKey: string, column: string, value: string): void {
    this.newDrafts.update((all) => ({ ...all, [listKey]: { ...all[listKey], [column]: value } }));
  }

  protected saveItem(list: ContentList, item: ContentListItem): void {
    const draft = this.itemDrafts()[item.id] ?? {};
    const body: Record<string, string | null> = {};
    for (const field of list.fields) {
      for (const column of COLUMNS[field]) {
        body[column] = (draft[column] ?? '').trim() || null;
      }
    }
    this.itemErrors.set({});
    this.run(this.api.updateItem(item.id, body), () => this.load(), 'admin.website.content.itemSaved', {}, item.id);
  }

  protected addItem(list: ContentList): void {
    const draft = this.newDrafts()[list.key] ?? {};
    const body: Record<string, unknown> = { is_active: false };
    for (const field of list.fields) {
      for (const column of COLUMNS[field]) {
        const value = (draft[column] ?? '').trim();
        if (value) {
          body[column] = value;
        }
      }
    }
    this.run(
      this.api.createItem(list.key, body),
      () => {
        this.newDrafts.update((all) => ({ ...all, [list.key]: {} }));
        this.load();
      },
      'admin.website.content.itemAdded',
      {},
    );
  }

  protected async toggleItem(item: ContentListItem): Promise<void> {
    const publish = !item.is_active;
    const ok = await this.confirm().ask({
      title: publish ? 'admin.website.content.publishItemTitle' : 'admin.website.content.hideItemTitle',
      message: publish ? 'admin.website.content.publishItemText' : 'admin.website.content.hideItemText',
      confirm: publish ? 'admin.website.publish' : 'admin.website.hide',
      params: { name: this.itemName(item) },
    });
    if (ok) {
      this.run(this.api.updateItem(item.id, { is_active: publish }), () => this.load(), publish ? 'admin.website.content.itemPublished' : 'admin.website.content.itemHidden', {});
    }
  }

  protected async deleteItem(item: ContentListItem): Promise<void> {
    const ok = await this.confirm().ask({
      title: 'admin.website.content.deleteItemTitle',
      message: 'admin.website.content.deleteItemText',
      confirm: 'admin.website.delete',
      params: { name: this.itemName(item) },
      tone: 'danger',
    });
    if (ok) {
      this.run(this.api.deleteItem(item.id), () => this.load(), 'admin.website.content.itemDeleted', {});
    }
  }

  protected moveItem(list: ContentList, item: ContentListItem, step: -1 | 1): void {
    const ids = list.items.map((i) => i.id);
    const from = ids.indexOf(item.id);
    const to = from + step;
    if (to < 0 || to >= ids.length) {
      return;
    }
    [ids[from], ids[to]] = [ids[to], ids[from]];
    this.run(this.api.reorderItems(list.key, ids), () => this.load(), 'admin.website.orderSaved', {});
  }

  private run(action: Observable<unknown>, done: (result: unknown) => void, success: string, params: Record<string, string>, itemId?: number): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.notice.set(null);
    this.errors.set({});
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
        const fields = apiFieldErrors(error);
        if (itemId !== undefined) {
          this.itemErrors.set(Object.fromEntries(Object.entries(fields).map(([k, v]) => [`${itemId}.${k}`, v])));
        } else {
          this.errors.set(fields);
        }
        this.notice.set({ kind: 'error', text: this.language.translate('admin.website.failed'), details: apiErrorMessages(error) });
      },
    });
  }

  private fill(data: SiteContentEditor): void {
    this.data.set(data);
    if (!this.group() || !this.groupKeys().includes(this.group())) {
      this.group.set(this.groupKeys()[0] ?? '');
    }
    const draft: Draft = {};
    for (const group of data.groups) {
      for (const e of group.entries) {
        if (e.type === 'image') {
          draft[`${e.key}.image`] = e.image_path ?? '';
        } else {
          draft[`${e.key}.en`] = e.value_en ?? '';
          draft[`${e.key}.ar`] = e.value_ar ?? '';
        }
      }
    }
    this.saved.set(draft);
    this.draft.set({ ...draft });
    const items: Record<number, Draft> = {};
    for (const list of data.lists) {
      for (const item of list.items) {
        items[item.id] = this.itemValues(item);
      }
    }
    this.itemDrafts.set(items);
    this.state.set('ready');
  }

  /** An item's current values by column, as strings. */
  private itemValues(item: ContentListItem): Draft {
    const v: Draft = {};
    for (const field of ['title', 'subtitle', 'description', 'image_alt'] as const) {
      const pair = item[field];
      if (pair) {
        v[`${field}_en`] = pair.en ?? '';
        v[`${field}_ar`] = pair.ar ?? '';
      }
    }
    if ('image' in item) {
      v['image_path'] = item.image_path ?? '';
    }
    if ('secondary_image' in item) {
      v['secondary_image_path'] = item.secondary_image_path ?? '';
    }
    if ('icon' in item) {
      v['icon'] = item.icon ?? '';
    }
    if ('link' in item) {
      v['link_url'] = item.link ?? '';
    }
    return v;
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
