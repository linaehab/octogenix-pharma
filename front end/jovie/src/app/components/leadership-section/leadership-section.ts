import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-leadership-section',
  imports: [TranslatePipe],
  templateUrl: './leadership-section.html',
  styleUrl: './leadership-section.css',
})
export class LeadershipSection {
  protected readonly leaders = [
    {
      initials: 'TK',
      name: 'leadership.tarek',
      role: 'leadership.founder',
    },
    {
      initials: 'MK',
      name: 'leadership.metwally',
      role: 'leadership.managingDirector',
    },
    {
      initials: 'SE',
      name: 'leadership.soha',
      role: 'leadership.coo',
    },
  ];
}
