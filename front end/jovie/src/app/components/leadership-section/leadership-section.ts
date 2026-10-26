import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Bundled leaders (translation keys), shown until (or unless) the dashboard list is loaded. */
const DEFAULT_LEADERS = [
  { initials: 'TK', name: 'leadership.tarek', role: 'leadership.founder' },
  { initials: 'MK', name: 'leadership.metwally', role: 'leadership.managingDirector' },
  { initials: 'SE', name: 'leadership.soha', role: 'leadership.coo' },
];

const HONORIFICS = new Set(['dr', 'mr', 'mrs', 'ms', 'eng', 'prof']);

/** "Dr. Tarek Kandil" → "TK": first letters of the first and last names, honorifics skipped. */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((word) => word && !HONORIFICS.has(word.replace(/\.$/, '').toLowerCase()));
  if (!words.length) {
    return '';
  }
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (words[0][0] + (last[0] ?? '')).toUpperCase();
}

@Component({
  selector: 'app-leadership-section',
  imports: [TranslatePipe],
  templateUrl: './leadership-section.html',
  styleUrl: './leadership-section.css',
})
export class LeadershipSection {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  protected readonly leaders = computed(() => {
    const remote = this.content.list('about.leadership');
    if (remote) {
      return remote.map((item) => ({
        // Initials always come from the English name, as on the current site.
        initials: initialsOf(item.title?.en || this.content.pick(item.title)),
        name: this.content.pick(item.title),
        role: this.content.pick(item.subtitle),
      }));
    }
    return DEFAULT_LEADERS.map((leader) => ({
      initials: leader.initials,
      name: this.language.translate(leader.name),
      role: this.language.translate(leader.role),
    }));
  });
}
