import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-banner',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home-banner.html',
  styleUrl: './home-banner.css',
})
export class HomeBanner {
  protected readonly tickerCopies = [1, 2, 3, 4];
}
