/** Shapes returned by the Laravel public API (see backend routes/api.php). */

export interface LocalizedText {
  en: string | null;
  ar: string | null;
}

export interface ContentImage {
  url: string | null;
  url_ar: string | null;
}

export interface ContentListItem {
  id: number;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  description?: LocalizedText;
  image?: { url: string | null };
  secondary_image?: { url: string | null };
  image_alt?: LocalizedText;
  icon?: string | null;
  link?: string | null;
}

export interface SiteContent {
  texts: Record<string, LocalizedText>;
  images: Record<string, ContentImage>;
  lists: Record<string, ContentListItem[]>;
}

export interface ApiService {
  id: number;
  title: LocalizedText;
  description: LocalizedText;
  image_url: string | null;
  hover_image_url: string | null;
  image_alt: LocalizedText;
}

export interface ApiServiceGroups {
  customers: ApiService[];
  suppliers: ApiService[];
}

export interface ApiBrand {
  slug: string;
  name: LocalizedText;
  label: LocalizedText;
  short_description: LocalizedText;
  description: LocalizedText;
  logo_url: string | null;
  image_url: string | null;
  hover_image_url: string | null;
  image_alt: LocalizedText;
  cta_label: LocalizedText;
  link: { type: 'none' | 'internal' | 'external'; url: string | null };
  has_store: boolean;
  is_featured: boolean;
}

export type PublicSettings = Record<string, unknown>;
