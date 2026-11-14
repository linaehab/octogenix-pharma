import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-quality-section',
  imports: [TranslatePipe],
  templateUrl: './quality-section.html',
  styleUrl: './quality-section.css',
})
export class QualitySection {}
