import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IntroDialogService } from './intro-dialog.service';

/**
 * Breastfeeding notice shown once per browser session when a visitor enters the Jovie store.
 * Opened in the browser only (never in the server-rendered HTML), as a native modal <dialog>:
 * focus moves into it, the page behind is inert, and Escape closes it.
 */
@Component({
  selector: 'app-jovie-intro-dialog',
  imports: [TranslatePipe],
  templateUrl: './intro-dialog.html',
  styleUrl: './intro-dialog.css',
})
export class JovieIntroDialog {
  private readonly intro = inject(IntroDialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      if (this.intro.shouldShow() && !dialog.open) {
        dialog.showModal();
      }
    });
  }

  protected close(): void {
    // Saved right away: the dialog's close event is dispatched asynchronously.
    this.intro.dismiss();
    this.dialog().nativeElement.close();
  }

  /** The close event also covers Escape, which closes the dialog without the button. */
  protected onClosed(): void {
    this.intro.dismiss();
  }
}
