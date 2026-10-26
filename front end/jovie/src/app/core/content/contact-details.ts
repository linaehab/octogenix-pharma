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

export function contactEmail(content: SiteContentService): string {
  return content.setting<string>('contact.email', DEFAULT_CONTACT_EMAIL);
}
