import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminSectionKey } from '../admin-sections';

/**
 * A dashboard section that a later phase builds. It says so plainly and offers no actions, so
 * nothing here looks like working functionality. Opening it already requires the section's permission.
 */
@Component({
  selector: 'app-admin-section-page',
  imports: [TranslatePipe],
  template: `
    @if (section(); as key) {
      <div class="adm-page-head">
        <div>
          <h1>{{ ('admin.nav.' + key) | translate }}</h1>
          <p>{{ ('admin.section.' + key) | translate }}</p>
        </div>
      </div>
      <section class="adm-panel" aria-labelledby="adm-planned">
        <h2 id="adm-planned">{{ 'admin.section.plannedTitle' | translate }}</h2>
        <p class="adm-panel-lead">{{ 'admin.section.plannedText' | translate }}</p>
      </section>
    }
  `,
})
export class AdminSectionPage {
  protected readonly section = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['section'] as AdminSectionKey | undefined)),
  );
}
