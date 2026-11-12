/** Corporate website API shapes (Admin\BrandResource, Admin\ServiceResource, company info, content editor). */

export type BrandLinkType = 'none' | 'internal' | 'external';
export type ServiceCategory = 'customers' | 'suppliers';

export interface AdminBrand {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  label_en: string | null;
  label_ar: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  logo_path: string | null;
  image_path: string | null;
  hover_image_path: string | null;
  image_alt_en: string | null;
  image_alt_ar: string | null;
  cta_label_en: string | null;
  cta_label_ar: string | null;
  link_type: BrandLinkType;
  link_url: string | null;
  has_store: boolean;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  /** Jovie store products of this brand: such a brand is deactivated, never deleted. */
  products_count: number;
  logo_url: string | null;
  image_url: string | null;
  hover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminService {
  id: number;
  category: ServiceCategory;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  image_path: string | null;
  hover_image_path: string | null;
  image_alt_en: string | null;
  image_alt_ar: string | null;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;
  hover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CompanyInfoKey = 'contact.phones' | 'contact.email' | 'social.facebook' | 'social.instagram' | 'social.linkedin';

export interface CompanyInfoSetting {
  key: CompanyInfoKey;
  type: 'phone_list' | 'email' | 'url';
  value: string[] | string | null;
}

export interface ContentTextEntry {
  key: string;
  type: 'text' | 'textarea';
  max_length: number;
  value_en: string | null;
  value_ar: string | null;
  updated_at: string | null;
}

export interface ContentImageEntry {
  key: string;
  type: 'image';
  image_path: string | null;
  image_ar_path: string | null;
  image_url: string | null;
  image_ar_url: string | null;
  updated_at: string | null;
}

export type ContentEntry = ContentTextEntry | ContentImageEntry;

export type ContentListField = 'title' | 'subtitle' | 'description' | 'image' | 'secondary_image' | 'image_alt' | 'icon' | 'link';

export interface ContentListItem {
  id: number;
  is_active: boolean;
  image_path?: string | null;
  secondary_image_path?: string | null;
  title?: { en: string | null; ar: string | null };
  subtitle?: { en: string | null; ar: string | null };
  description?: { en: string | null; ar: string | null };
  image_alt?: { en: string | null; ar: string | null };
  image?: { url: string | null };
  secondary_image?: { url: string | null };
  icon?: string | null;
  link?: string | null;
}

export interface ContentList {
  key: string;
  group: string;
  fields: ContentListField[];
  required: ContentListField[];
  min: number;
  max: number;
  icons: string[] | null;
  items: ContentListItem[];
}

export interface SiteContentEditor {
  site: string;
  groups: { group: string; entries: ContentEntry[] }[];
  lists: ContentList[];
}
