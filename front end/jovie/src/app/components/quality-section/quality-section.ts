import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { designImage } from '../design-image';

@Component({
  selector: 'app-quality-section',
  imports: [TranslatePipe],
  templateUrl: './quality-section.html',
  styleUrl: './quality-section.css',
})
export class QualitySection {
  protected readonly content = inject(SiteContentService);
  /** GSDP photographs (certification and approval) unless others were chosen in the dashboard. */
  protected readonly image = computed(() =>
    designImage(this.content, 'quality.image', '/assets/images/values-integrity-check.jpg', '/assets/images/corporate-v2/gsdp-certification.webp'),
  );
  protected readonly hoverImage = computed(() =>
    designImage(this.content, 'quality.hoverImage', '/assets/images/value-innovation-lab.jpg', '/assets/images/corporate-v2/gsdp-approval-stamp.webp'),
  );
}
