import { SiteContentService } from '../core/content/site-content.service';

/**
 * An image slot of the corporate redesign that is also editable in the dashboard.
 *
 * An image chosen in the dashboard wins. While the slot still holds one of the images being
 * replaced by the redesign (`legacy`: the previous site's default, or a specific earlier upload,
 * matched by its path), the redesign's own photograph (`replacement`) is shown instead.
 */
export function designImage(
  content: SiteContentService,
  key: string,
  legacy: string | readonly string[],
  replacement: string,
): string {
  const url = content.image(key, replacement);
  const superseded = (typeof legacy === 'string' ? [legacy] : legacy).some((path) => url === path || url.endsWith(path));
  return superseded ? replacement : url;
}
