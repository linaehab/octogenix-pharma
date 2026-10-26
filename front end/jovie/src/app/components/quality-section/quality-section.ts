import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-quality-section',
  imports: [TranslatePipe],
  templateUrl: './quality-section.html',
  styleUrl: './quality-section.css',
})
export class QualitySection {
  protected readonly content = inject(SiteContentService);
}
