import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, afterNextRender, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PageIntro } from '../../components/page-intro/page-intro';
import { WHY_SUBPAGES, WhyBlock, WhySubpageKey } from '../../data/why-subpages';

type Group = { kind: 'list'; items: WhyBlock[] } | WhyBlock;

/**
 * /jovie/why/makes-good-sense, /organic and /without-promise: the official "More information" pages
 * (green content header, then the article). The official text exists in English only, so the
 * Arabic version shows it with a short note.
 */
@Component({
  selector: 'app-jovie-why-subpage',
  imports: [PageIntro, RouterLink, TranslatePipe],
  templateUrl: './jovie-why-subpage.html',
  styleUrl: './jovie-why-subpage.css',
})
export class JovieWhySubpage {
  protected readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly key = toSignal(this.route.data.pipe(map((data) => data['subpage'] as WhySubpageKey)), {
    initialValue: 'makes-good-sense' as WhySubpageKey,
  });

  protected readonly page = computed(() => WHY_SUBPAGES[this.key()]);

  constructor() {
    // The benefit cards link to a heading (#fat, #digest, ...): scroll to it once it is rendered.
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.route.fragment.pipe(takeUntilDestroyed(destroyRef)).subscribe((fragment) => {
        const target = fragment ? document.getElementById(fragment) : null;
        target?.scrollIntoView({ block: 'start' });
      });
    });
  }

  /** Consecutive list items become one list. */
  protected readonly groups = computed(() =>
    this.page().blocks.reduce<Group[]>((groups, block) => {
      const last = groups.at(-1);
      if (block.kind === 'li') {
        if (last && last.kind === 'list') {
          last.items.push(block);
        } else {
          groups.push({ kind: 'list', items: [block] });
        }
      } else {
        groups.push(block);
      }
      return groups;
    }, []),
  );

  protected asList(group: Group): WhyBlock[] {
    return group.kind === 'list' ? (group as { items: WhyBlock[] }).items : [];
  }

  protected asBlock(group: Group): WhyBlock {
    return group as WhyBlock;
  }
}
