import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HomeBanner } from '../home-banner/home-banner';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, TranslatePipe, HomeBanner],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection {}
