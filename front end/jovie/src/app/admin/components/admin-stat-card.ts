import { Component, input } from '@angular/core';

/** One figure of the overview: a label, the value and an optional note. `tone` marks figures that need attention. */
@Component({
  selector: 'app-admin-stat-card',
  template: `
    <article class="adm-stat" [class.is-attention]="tone() === 'attention'" [class.is-calm]="tone() === 'calm'">
      <h3 class="adm-stat-label">{{ label() }}</h3>
      <p class="adm-stat-value">{{ value() }}</p>
      @if (note()) {
        <p class="adm-stat-note">{{ note() }}</p>
      }
      <ng-content />
    </article>
  `,
})
export class AdminStatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string | null>(null);
  readonly tone = input<'default' | 'attention' | 'calm'>('default');
}
