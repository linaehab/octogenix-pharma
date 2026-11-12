import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SiteFooter } from '../../components/site-footer/site-footer';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AdminBrand, AdminService, CompanyInfoSetting, SiteContentEditor } from './admin-website.models';

const ME = '/api/v1/admin/auth/me';
const API = '/api/v1/admin';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Nour', email: 'nour@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const contentManager = admin('content_manager', ['messages.view', 'messages.manage', 'reviews.manage', 'content.manage']);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);

const brand = (id: number, o: Partial<AdminBrand> = {}): AdminBrand => ({
  id, slug: `brand-${id}`, name_en: `Brand ${id}`, name_ar: `علامة ${id}`, label_en: null, label_ar: null,
  short_description_en: 'Short.', short_description_ar: 'قصير.', description_en: null, description_ar: null,
  logo_path: '/assets/images/jovie.jpg', image_path: null, hover_image_path: null, image_alt_en: null, image_alt_ar: null,
  cta_label_en: null, cta_label_ar: null, link_type: 'none', link_url: null, has_store: false, is_featured: false, is_active: true,
  sort_order: id, products_count: 0, logo_url: '/assets/images/jovie.jpg', image_url: null, hover_image_url: null,
  created_at: '2026-11-01T10:00:00+00:00', updated_at: `2026-11-0${id}T10:00:00+00:00`, ...o,
});
const service = (id: number, o: Partial<AdminService> = {}): AdminService => ({
  id, category: 'customers', title_en: `Service ${id}`, title_ar: `خدمة ${id}`, description_en: 'Text.', description_ar: 'نص.',
  image_path: null, hover_image_path: null, image_alt_en: null, image_alt_ar: null, sort_order: id, is_active: true,
  image_url: null, hover_image_url: null, created_at: null, updated_at: `2026-11-0${id}T10:00:00+00:00`, ...o,
});
const companyInfo = (o: Record<string, unknown> = {}): CompanyInfoSetting[] =>
  (
    [
      ['contact.phones', 'phone_list', ['+201090075087']],
      ['contact.email', 'email', 'info@octogenixpharma.com'],
      ['social.facebook', 'url', null],
      ['social.instagram', 'url', null],
      ['social.linkedin', 'url', null],
    ] as const
  ).map(([key, type, value]) => ({ key, type, value: (key in o ? o[key] : value) as CompanyInfoSetting['value'] }));
const content = (o: { address?: string } = {}): SiteContentEditor => ({
  site: 'corporate',
  groups: [
    { group: 'shared.footer', entries: [{ key: 'footer.tagline', type: 'text', max_length: 255, value_en: 'Trusted.', value_ar: 'موثوقة.', updated_at: null }] },
    {
      group: 'contact.section',
      entries: [
        { key: 'contact.address', type: 'textarea', max_length: 2000, value_en: o.address ?? 'Cairo', value_ar: 'القاهرة', updated_at: null },
        { key: 'contact.image', type: 'image', image_path: '/assets/images/mom.jpg', image_ar_path: null, image_url: '/assets/images/mom.jpg', image_ar_url: null, updated_at: null },
      ],
    },
    { group: 'values', entries: [{ key: 'values.title', type: 'text', max_length: 255, value_en: 'Quality.', value_ar: 'الجودة.', updated_at: null }] },
  ],
  lists: [
    {
      key: 'values.company', group: 'values', fields: ['title', 'description'], required: ['title', 'description'], min: 1, max: 8, icons: null,
      items: [
        { id: 7, is_active: true, title: { en: 'Integrity', ar: 'النزاهة' }, description: { en: 'Honest.', ar: 'صادق.' } },
        { id: 8, is_active: true, title: { en: 'Care', ar: 'العناية' }, description: { en: 'Kind.', ar: 'لطيف.' } },
      ],
    },
  ],
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin corporate website', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let language: LanguageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin', loadChildren: () => import('../admin.routes').then((m) => m.adminRoutes) }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    language.setLanguage('en');
    http.match((r) => r.url.endsWith('/api/v1/admin/notifications/unread-count')).forEach((r) => r.cancelled || r.flush({ data: { unread_count: 0 } }));
    http.verify();
  });

  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await sleep();
      harness.fixture.detectChanges();
    }
  }

  async function answer(test: (r: TestRequest['request']) => boolean, respond: (r: TestRequest) => void): Promise<TestRequest> {
    for (let i = 0; i < 100; i++) {
      const found = http.match(test);
      if (found.length) {
        found.forEach(respond);
        await settle();
        return found[0];
      }
      await sleep();
    }
    throw new Error('No matching request');
  }

  const is = (method: string, url: string) => (r: TestRequest['request']) => r.method === method && r.url === url;
  const csrf = () => answer(is('GET', '/sanctum/csrf-cookie'), (r) => r.flush(null));
  async function open(url: string, who: AdminUser): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
    await navigation;
    await settle();
  }
  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) => (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const texts = (selector: string) => Array.from(el().querySelectorAll(selector)).map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
  const click = async (selector: string) => {
    (el().querySelector(selector) as HTMLElement).click();
    await settle();
  };
  const type = async (selector: string, value: string) => {
    const input = el().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const buttonIn = (row: string, label: string) =>
    Array.from(el().querySelectorAll(`${row} button`)).find((b) => (b.textContent ?? '').trim() === label) as HTMLButtonElement;
  const confirmYes = () => click('dialog[open] .adm-dialog-actions button:last-child');
  const dialogText = () => (el().querySelector('dialog[open]')?.textContent ?? '').replace(/\s+/g, ' ');

  it('is open to content managers and closed to roles without content.manage', async () => {
    await open('/admin/website', contentManager);
    expect(router.url).toBe('/admin/website/brands');
    expect(texts('app-admin-website-nav .web-tabs a')).toEqual(['Our Brands', 'Services', 'Company information', 'Page content']);
    await answer(is('GET', `${API}/brands`), (r) => r.flush({ data: [] }));
    expect(text('app-admin-state')).toContain('There are no brands yet.');

    await harness.navigateByUrl('/admin/website/company');
    await settle();
    // Same session: the second page loads its own data.
    await answer(is('GET', `${API}/company-info`), (r) => r.flush({ data: companyInfo() }));
    await answer(is('GET', `${API}/content/corporate`), (r) => r.flush({ data: content() }));
    expect(text('h1')).toBe('Company information');
  });

  it('sends admins without content.manage to the 403 page', async () => {
    await open('/admin/website/brands', support);
    expect(router.url).toBe('/admin/forbidden');
    expect(Array.from(document.querySelectorAll('.adm-side a')).map((a) => a.textContent!.trim())).not.toContain('Corporate website');
  });

  it('lists brands in order and publishes, hides, reorders and deletes them with confirmation', async () => {
    await open('/admin/website/brands', contentManager);
    await answer(is('GET', `${API}/brands`), (r) => r.flush({ data: [brand(1, { slug: 'jovie', name_en: 'Jovie', products_count: 3 }), brand(2, { is_active: false })] }));
    expect(texts('.web-row .web-main strong')).toEqual(['Jovie', 'Brand 2']);
    expect(texts('.web-badge')).toEqual(['Published', 'Hidden']);
    expect(text('[data-brand="jovie"]')).toContain('3 store product(s)');
    expect(el().querySelector('[data-brand="jovie"] .web-delete')).toBeNull();
    expect(text('#web-brands-count')).toBe('2 of 2 brands · 1 published');

    // Reorder: the whole order is sent.
    (el().querySelectorAll('[data-brand="brand-2"] .web-order button')[0] as HTMLButtonElement).click();
    await settle();
    await csrf();
    const order = await answer(is('PUT', `${API}/brands/order`), (r) => r.flush({ data: [brand(2, { is_active: false }), brand(1, { slug: 'jovie', name_en: 'Jovie', products_count: 3 })] }));
    expect(order.request.body).toEqual({ ids: [2, 1] });
    expect(texts('.web-row .web-main strong')).toEqual(['Brand 2', 'Jovie']);
    expect(text('.web-notice')).toBe('The new order is saved and shown on the website.');

    // Publish with confirmation; the edit carries the version the admin saw.
    buttonIn('[data-brand="brand-2"]', 'Publish').click();
    await settle();
    expect(dialogText()).toContain('Publish Brand 2?');
    await confirmYes();
    const publish = await answer(is('PATCH', `${API}/brands/2`), (r) => r.flush({ data: brand(2) }));
    expect(publish.request.body).toEqual({ is_active: true, expected_updated_at: '2026-11-02T10:00:00+00:00' });
    expect(texts('.web-badge')).toEqual(['Published', 'Published']);

    // Search hides the reorder buttons' effect.
    await type('#web-brand-search', 'jov');
    expect(texts('.web-row .web-main strong')).toEqual(['Jovie']);
    expect((el().querySelector('.web-order button') as HTMLButtonElement).disabled).toBeTrue();
    await type('#web-brand-search', '');

    // Delete (only brands without store products).
    (el().querySelector('[data-brand="brand-2"] .web-delete') as HTMLButtonElement).click();
    await settle();
    expect(dialogText()).toContain('Delete Brand 2?');
    await confirmYes();
    await answer(is('DELETE', `${API}/brands/2`), (r) => r.flush(null, { status: 204, statusText: 'No Content' }));
    expect(texts('.web-row .web-main strong')).toEqual(['Jovie']);
  });

  it('reloads the list when a brand changed meanwhile', async () => {
    await open('/admin/website/brands', contentManager);
    await answer(is('GET', `${API}/brands`), (r) => r.flush({ data: [brand(1)] }));
    buttonIn('[data-brand="brand-1"]', 'Hide').click();
    await settle();
    await confirmYes();
    await csrf();
    await answer(is('PATCH', `${API}/brands/1`), (r) => r.flush({ message: 'changed', current: brand(1, { name_en: 'Renamed' }) }, { status: 409, statusText: 'Conflict' }));
    await answer(is('GET', `${API}/brands`), (r) => r.flush({ data: [brand(1, { name_en: 'Renamed' })] }));
    expect(text('.web-notice')).toContain('This was changed meanwhile');
    expect(texts('.web-row .web-main strong')).toEqual(['Renamed']);
  });

  it('creates a brand with both languages and shows the API field errors', async () => {
    await open('/admin/website/brands/new', contentManager);
    expect(text('h1')).toBe('New brand');
    await type('#web-b-slug', 'nova-pharma');
    await type('#web-b-name-en', 'Nova Pharma');
    await type('#web-b-name-ar', 'نوفا فارما');
    expect(el().querySelector('#web-b-name-ar')!.getAttribute('dir')).toBe('rtl');
    const select = el().querySelector('#web-b-link-type') as HTMLSelectElement;
    select.value = 'external';
    select.dispatchEvent(new Event('change'));
    await settle();
    await type('#web-b-link-url', 'http://nova.example.com');
    (el().querySelector('#web-b-publish ~ .web-check input, section[aria-labelledby="web-b-publish"] input[type="checkbox"]') as HTMLInputElement).click();
    await settle();
    await click('form button[type="submit"]');
    await csrf();
    const post = await answer(is('POST', `${API}/brands`), (r) =>
      r.flush(
        { message: 'Invalid', errors: { link_url: ['An external link must be an https:// address.'], short_description_en: ['Required before the brand can be active.'] } },
        { status: 422, statusText: 'Unprocessable' },
      ),
    );
    expect(post.request.body).toEqual(jasmine.objectContaining({
      slug: 'nova-pharma', name_en: 'Nova Pharma', name_ar: 'نوفا فارما', link_type: 'external', link_url: 'http://nova.example.com', is_active: true, logo_path: null,
    }));
    expect(text('.web-notice')).toContain('Nothing was saved. Please check the highlighted fields.');
    expect(el().querySelector('#web-b-link-url')!.getAttribute('aria-invalid')).toBe('true');
    expect(text('section[aria-labelledby="web-b-link"] .web-error')).toBe('An external link must be an https:// address.');
  });

  it('manages services per tab and keeps the tab when adding', async () => {
    await open('/admin/website/services', contentManager);
    await answer(is('GET', `${API}/services`), (r) =>
      r.flush({ data: [service(1), service(2), service(3, { category: 'suppliers', is_active: false })] }),
    );
    expect(texts('.web-segments button')).toEqual(['Customers (2)', 'Suppliers (1)']);
    expect(texts('.web-row .web-main strong')).toEqual(['Service 1', 'Service 2']);
    await click('.web-segments [data-category="suppliers"]');
    expect(texts('.web-row .web-main strong')).toEqual(['Service 3']);
    expect(el().querySelector('.adm-page-head a.adm-button')!.getAttribute('href')).toBe('/admin/website/services/new?category=suppliers');

    await click('.web-segments [data-category="customers"]');
    (el().querySelectorAll('[data-service="2"] .web-order button')[0] as HTMLButtonElement).click();
    await settle();
    await csrf();
    const order = await answer(is('PUT', `${API}/services/order`), (r) => r.flush({ data: [service(2), service(1)] }));
    expect(order.request.body).toEqual({ category: 'customers', ids: [2, 1] });
    expect(texts('.web-row .web-main strong')).toEqual(['Service 2', 'Service 1']);
  });

  it('edits company contact details, social links and the address', async () => {
    await open('/admin/website/company', contentManager);
    await answer(is('GET', `${API}/company-info`), (r) => r.flush({ data: companyInfo() }));
    await answer(is('GET', `${API}/content/corporate`), (r) => r.flush({ data: content() }));

    await click('.web-add-phone');
    await type('#web-c-phone-1', '+20 100 000 0001');
    await type('#web-c-email', 'hello@octogenix.test');
    await type('#web-c-social\\.linkedin', 'https://www.linkedin.com/company/octogenix');
    await click('form[aria-labelledby="web-c-contact"] button[type="submit"]');
    await csrf();
    const save = await answer(is('PATCH', `${API}/company-info`), (r) =>
      r.flush({ data: companyInfo({ 'contact.phones': ['+201090075087', '+201000000001'], 'contact.email': 'hello@octogenix.test', 'social.linkedin': 'https://www.linkedin.com/company/octogenix' }) }),
    );
    expect(save.request.body).toEqual({
      settings: {
        'contact.phones': ['+201090075087', '+201000000001'], 'contact.email': 'hello@octogenix.test',
        'social.facebook': null, 'social.instagram': null, 'social.linkedin': 'https://www.linkedin.com/company/octogenix',
      },
      expected: { 'contact.phones': ['+201090075087'], 'contact.email': 'info@octogenixpharma.com', 'social.facebook': null, 'social.instagram': null, 'social.linkedin': null },
    });
    expect(text('.web-notice')).toBe('The contact details are saved and shown on the website.');

    await type('#web-c-contact\\.address-ar', '12 شارع النيل، القاهرة');
    expect(el().querySelector('#web-c-contact\\.address-ar')!.getAttribute('dir')).toBe('rtl');
    await click('form[aria-labelledby="web-c-texts"] button[type="submit"]');
    const texts2 = await answer(is('PATCH', `${API}/content/corporate/entries`), (r) => r.flush({ data: content() }));
    expect(texts2.request.body).toEqual({
      entries: {
        'contact.address': { value_en: 'Cairo', value_ar: '12 شارع النيل، القاهرة' },
        'footer.tagline': { value_en: 'Trusted.', value_ar: 'موثوقة.' },
      },
    });
  });

  it('edits page texts by section, sends only the changed entries, and manages list items', async () => {
    await open('/admin/website/content', contentManager);
    await answer(is('GET', `${API}/content/corporate`), (r) => r.flush({ data: content() }));
    expect(texts('#web-section option')).toEqual(['Footer (all pages)', 'Contact section', 'Mission, vision and values']);

    const select = el().querySelector('#web-section') as HTMLSelectElement;
    select.value = 'contact.section';
    select.dispatchEvent(new Event('change'));
    await settle();
    expect(texts('.web-entry-key code')).toEqual(['contact.address', 'contact.image']);
    expect(text('.web-entry-key')).toContain('Address');
    expect((el().querySelector('form[aria-labelledby="web-entries"] button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    await type('#web-e-contact\\.address-en', 'Nasr City, Cairo');
    expect(text('form[aria-labelledby="web-entries"] button[type="submit"]')).toBe('Save changes (1)');
    await click('form[aria-labelledby="web-entries"] button[type="submit"]');
    await csrf();
    const save = await answer(is('PATCH', `${API}/content/corporate/entries`), (r) => r.flush({ data: content({ address: 'Nasr City, Cairo' }) }));
    expect(save.request.body).toEqual({ entries: { 'contact.address': { value_en: 'Nasr City, Cairo', value_ar: 'القاهرة' } } });
    expect(text('.web-notice')).toBe('1 item(s) saved. The website shows the change.');

    // Lists live in their section.
    select.value = 'values';
    select.dispatchEvent(new Event('change'));
    await settle();
    expect(text('[data-list="values.company"] h2')).toBe('Company values');
    buttonIn('[data-item="7"]', 'Hide').click();
    await settle();
    expect(dialogText()).toContain('Hide "Integrity"?');
    await confirmYes();
    const hide = await answer(is('PATCH', `${API}/content-items/7`), (r) => r.flush({ data: { id: 7, is_active: false } }));
    expect(hide.request.body).toEqual({ is_active: false });
    await answer(is('GET', `${API}/content/corporate`), (r) => r.flush({ data: content() }));
    expect(text('.web-notice')).toBe('The item is hidden from the website.');
  });

  it('works in Arabic, right to left', async () => {
    await open('/admin/website/services', contentManager);
    await answer(is('GET', `${API}/services`), (r) => r.flush({ data: [service(1)] }));
    language.setLanguage('ar');
    await settle();
    expect(document.documentElement.dir).toBe('rtl');
    expect(texts('app-admin-website-nav .web-tabs a')).toEqual(['علاماتنا التجارية', 'الخدمات', 'بيانات الشركة', 'محتوى الصفحات']);
    expect(text('h1')).toBe('الخدمات');
    expect(texts('.web-badge')).toEqual(['منشور']);
  });
});

describe('Corporate footer social links', () => {
  function render(settings: Record<string, unknown>): HTMLElement {
    TestBed.configureTestingModule({
      imports: [SiteFooter],
      providers: [provideRouter([]), { provide: SiteContentService, useValue: { setting: <T>(key: string, fallback: T) => (settings[key] as T) ?? fallback } }],
    });
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows nothing until a link is set (the design is unchanged)', () => {
    expect(render({}).querySelector('.footer-social')).toBeNull();
  });

  it('shows only the https links that are set, opening in a new tab', () => {
    const footer = render({ 'social.linkedin': 'https://www.linkedin.com/company/octogenix', 'social.facebook': 'http://insecure.example.com' });
    const links = Array.from(footer.querySelectorAll('.footer-social a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('data-network'))).toEqual(['linkedin']);
    expect(links[0].getAttribute('href')).toBe('https://www.linkedin.com/company/octogenix');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[0].getAttribute('aria-label')).toBe('LinkedIn (opens in a new tab)');
  });
});
