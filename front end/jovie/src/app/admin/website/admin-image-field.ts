import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from '../products/admin-products.service';
import { apiErrorMessages } from '../products/api-errors';
import { AdminWebsiteService } from './admin-website.service';

/**
 * One image of a brand, service or page: preview, upload (checked here and again by the API)
 * and remove. Emits the stored path ('' when removed); the form saves it.
 */
@Component({
  selector: 'app-admin-image-field',
  imports: [TranslatePipe],
  template: `
    <div class="img-field" [attr.data-field]="fieldId()">
      <span class="img-label" [id]="fieldId() + '-label'">{{ label() | translate }}@if (required()) { <span class="img-req" aria-hidden="true">*</span>}</span>
      <div class="img-preview">
        @if (preview(); as src) {
          <img [src]="src" [alt]="'admin.website.imagePreview' | translate: { name: (label() | translate) }" loading="lazy" />
        } @else {
          <span class="img-empty">{{ 'admin.website.noImage' | translate }}</span>
        }
      </div>
      <div class="img-actions">
        <label class="adm-button is-light is-small img-upload" [class.is-busy]="uploading()">
          <input type="file" class="adm-visually-hidden" accept="image/jpeg,image/png,image/webp" [disabled]="uploading() || disabled()"
            [attr.aria-describedby]="fieldId() + '-help'" (change)="pick($event)" />
          {{ (uploading() ? 'admin.website.uploading' : (preview() ? 'admin.website.changeImage' : 'admin.website.uploadImage')) | translate }}
        </label>
        @if (preview() && !required()) {
          <button type="button" class="adm-link img-remove" [disabled]="uploading() || disabled()" (click)="remove()">{{ 'admin.website.removeImage' | translate }}</button>
        }
      </div>
      <p class="img-help" [id]="fieldId() + '-help'">{{ 'admin.website.imageHelp' | translate }}</p>
      @if (error(); as e) {
        <p class="img-error" role="alert">{{ e | translate }}</p>
      }
    </div>
  `,
  styles: `
    .img-field {
      display: grid;
      gap: 0.4rem;
    }

    .img-label {
      font-weight: 700;
    }

    .img-req {
      color: #a3123d;
    }

    .img-preview {
      display: grid;
      place-items: center;
      width: 100%;
      max-width: 16rem;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      border: 1px dashed rgba(32, 51, 102, 0.3);
      border-radius: 12px;
      background: #f6f8fc;
    }

    .img-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .img-empty,
    .img-help {
      color: var(--adm-muted, #56627e);
      font-size: 0.85rem;
    }

    .img-help,
    .img-error {
      margin: 0;
    }

    .img-error {
      color: #a3123d;
      font-weight: 700;
      font-size: 0.88rem;
    }

    .img-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .img-upload {
      cursor: pointer;
    }

    .img-upload:focus-within {
      outline: 3px solid rgba(32, 51, 102, 0.35);
      outline-offset: 2px;
    }
  `,
})
export class AdminImageField {
  private readonly api = inject(AdminWebsiteService);

  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** The current image URL (from the API) or a newly uploaded one. */
  readonly url = input<string | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  /** The new stored path, or '' when the image is removed. */
  readonly changed = output<string>();

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly uploaded = signal<string | null>(null);
  protected readonly preview = computed(() => this.uploaded() ?? this.url());

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.error.set(null);
    if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX_BYTES) {
      this.error.set('admin.website.imageInvalid');
      return;
    }
    this.uploading.set(true);
    this.api.uploadImage(file).subscribe({
      next: (path) => {
        this.uploading.set(false);
        this.uploaded.set(URL.createObjectURL(file));
        this.changed.emit(path);
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        const messages = error instanceof HttpErrorResponse ? apiErrorMessages(error) : [];
        this.error.set(messages[0] ?? 'admin.website.uploadFailed');
      },
    });
  }

  protected remove(): void {
    this.uploaded.set(null);
    this.error.set(null);
    this.changed.emit('');
  }
}
