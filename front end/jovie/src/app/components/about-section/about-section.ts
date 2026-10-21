import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-about-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './about-section.html',
  styleUrl: './about-section.css',
})
export class AboutSection {}
