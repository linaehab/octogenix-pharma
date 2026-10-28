import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SiteContentService } from '../../../core/content/site-content.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { JovieCatalogService } from '../../data/jovie-catalog.service';
import { DecorShape } from '../decor-shape/decor-shape';

/** Stage by age, as confirmed by the client. Feeding amounts are on the tin, not repeated here. */
const STAGES = [1, 2, 3] as const;
type Stage = (typeof STAGES)[number];

const isStage = (value: number): value is Stage => (STAGES as readonly number[]).includes(value);

/**
 * Home (summary): the age choices link to /jovie/feeding-guide?stage=N.
 * Page: the interactive guide, starting on the stage given in the URL (default Stage 1).
 */
@Component({
  selector: 'app-feeding-guide',
  imports: [RouterLink, TranslatePipe, DecorShape],
  templateUrl: './feeding-guide.html',
  styleUrl: './feeding-guide.css',
})
export class FeedingGuide {
  private readonly catalog = inject(JovieCatalogService);
  private readonly content = inject(SiteContentService);

  readonly summary = input(false);

  protected readonly stages = STAGES;

  private readonly stageInUrl = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => Number(params.get('stage'))),
      map((stage): Stage => (isStage(stage) ? stage : 1)),
    ),
    { initialValue: 1 as Stage },
  );
  protected readonly selected = linkedSignal<Stage>(() => this.stageInUrl());

  /** The catalogue product for the selected stage, when the products have loaded. */
  protected readonly product = computed(() =>
    this.catalog.products().find((product) => product.stage === this.selected()),
  );
  protected readonly productName = computed(() => this.content.pick(this.product()?.name));

  constructor() {
    // The guide page has no Shop section, so it requests the products itself (loaded once).
    this.catalog.load();
  }

  protected select(stage: Stage): void {
    this.selected.set(stage);
  }
}
