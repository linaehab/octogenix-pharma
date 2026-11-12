import { SiteContentService } from './site-content.service';

/** Contact details as they were hard-coded in the templates; used until settings load. */
export const DEFAULT_CONTACT_PHONES = ['+201090075087', '+201018302408', '+20572070371'];
export const DEFAULT_CONTACT_EMAIL = 'info@octogenixpharma.com';

export interface PhoneLink {
  href: string;
  label: string;
}

/**
 * Formats an E.164 number for display the way the site already showed them:
 * +201090075087 → "+20 109 007 5087", +20572070371 → "+20 57 207 0371".
 */
export function formatPhone(e164: string): string {
  if (!e164.startsWith('+20')) {
    return e164;
  }
  const rest = e164.slice(3);
  if (rest.length === 10) {
    return `+20 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  if (rest.length === 9) {
    return `+20 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  }
  return e164;
}

export function contactPhones(content: SiteContentService): PhoneLink[] {
  return content
    .setting<string[]>('contact.phones', DEFAULT_CONTACT_PHONES)
    .map((phone) => ({ href: `tel:${phone}`, label: formatPhone(phone) }));
}

export type SocialNetwork = 'facebook' | 'instagram' | 'linkedin';

export interface SocialLink {
  network: SocialNetwork;
  url: string;
  /** Simple 24×24 glyph path. */
  icon: string;
}

const SOCIAL_ICONS: Record<SocialNetwork, string> = {
  facebook: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.2-.8.5-.8z',
  instagram:
    'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',
  linkedin: 'M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 8.5h3V21H3zM9 8.5h2.9v1.7h.1c.4-.8 1.4-1.9 3.4-1.9 3.6 0 4.1 2.3 4.1 5.3V21h-3v-6.6c0-1.6 0-3.5-2.1-3.5s-2.4 1.7-2.4 3.4V21H9z',
};

/** Social links from the settings, in a fixed order; only https addresses are used. */
export function socialLinks(content: SiteContentService): SocialLink[] {
  return (Object.keys(SOCIAL_ICONS) as SocialNetwork[])
    .map((network) => ({ network, url: content.setting<string>(`social.${network}`, ''), icon: SOCIAL_ICONS[network] }))
    .filter((link) => typeof link.url === 'string' && link.url.startsWith('https://'));
}

export function contactEmail(content: SiteContentService): string {
  return content.setting<string>('contact.email', DEFAULT_CONTACT_EMAIL);
}
