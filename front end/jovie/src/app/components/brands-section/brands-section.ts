import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-brands-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './brands-section.html',
  styleUrl: './brands-section.css',
})
export class BrandsSection {}
