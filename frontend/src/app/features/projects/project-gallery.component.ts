import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export interface GalleryImageView {
  url: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

const SWIPE_PX = 50;

/**
 * Case-study gallery (docs/screens/public/04-project-detail.md): thumbnails are buttons named by their alt
 * text; a native <dialog> viewer moves with arrow keys, swipes and buttons, and closes on Esc or the backdrop.
 * The full-size image loads only when the viewer opens.
 */
@Component({
  selector: 'app-project-gallery',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul role="list" class="thumbs" data-testid="gallery">
      @for (image of images(); track image.url; let i = $index) {
        <li>
          <figure>
            <button type="button" class="thumb" (click)="open(i)" [attr.data-testid]="'thumb-' + i">
              <img
                [src]="image.url"
                [alt]="image.alt"
                [attr.width]="image.width"
                [attr.height]="image.height"
                loading="lazy"
                decoding="async"
              />
            </button>
            @if (image.caption) {
              <figcaption class="text-small text-muted">{{ image.caption }}</figcaption>
            }
          </figure>
        </li>
      }
    </ul>

    <dialog
      #viewer
      class="viewer"
      [attr.aria-label]="'project.gallery' | transloco"
      (click)="onBackdrop($event)"
      (keydown)="onKey($event)"
      (pointerdown)="swipeStart = $event.clientX"
      (pointerup)="onSwipe($event)"
      (close)="current.set(null)"
      data-testid="viewer"
    >
      @if (shown(); as image) {
        <figure class="viewer__figure">
          <img
            class="viewer__image"
            [src]="image.url"
            [alt]="image.alt"
            [attr.width]="image.width"
            [attr.height]="image.height"
            data-testid="viewer-image"
          />
          @if (image.caption) {
            <figcaption>{{ image.caption }}</figcaption>
          }
        </figure>
      }
      <div class="viewer__bar">
        <p aria-live="polite" class="text-small" data-testid="viewer-position">
          {{
            'project.viewer.position'
              | transloco: { index: (current() ?? 0) + 1, total: images().length }
          }}
        </p>
        @if (images().length > 1) {
          <button type="button" (click)="move(-1)" data-testid="viewer-prev">
            {{ 'project.viewer.prev' | transloco }}
          </button>
          <button type="button" (click)="move(1)" data-testid="viewer-next">
            {{ 'project.viewer.next' | transloco }}
          </button>
        }
        <button type="button" (click)="close()" data-testid="viewer-close">
          {{ 'project.viewer.close' | transloco }}
        </button>
      </div>
    </dialog>
  `,
  styles: `
    .thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
      gap: var(--gutter);
    }
    figure {
      display: grid;
      gap: var(--space-2);
    }
    .thumb {
      display: block;
      padding: 0;
      border: 0;
      border: 1px solid var(--color-line);
      border-radius: var(--radius-panel);
      overflow: hidden;
      background: var(--color-raised);
      cursor: zoom-in;
    }
    .thumb img {
      display: block;
      width: 100%;
      height: auto;
      transition: transform var(--dur-hover) var(--ease-out);
    }
    .thumb:hover img {
      transform: scale(1.02);
    }
    @media (prefers-reduced-motion: reduce) {
      .thumb:hover img {
        transform: none;
      }
    }
    .viewer {
      width: min(100% - 2 * var(--page-gutter), 72rem);
      max-width: none;
      max-height: calc(100dvh - 2 * var(--page-gutter));
      padding: var(--space-4);
      border: 1px solid var(--color-line);
      border-radius: var(--radius-card);
      background: var(--color-raised);
      color: var(--color-ink);
      touch-action: pan-y;
      opacity: 1;
      transition: opacity var(--dur-sheet) var(--ease-out);

      @starting-style {
        opacity: 0;
      }

      &::backdrop {
        background: color-mix(in srgb, var(--color-ground) 85%, transparent);
      }
    }
    .viewer__figure {
      margin: 0;
    }
    .viewer__image {
      display: block;
      width: 100%;
      height: auto;
      max-height: calc(100dvh - 12rem);
      object-fit: contain;
    }
    .viewer__bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-3);

      p {
        margin-right: auto;
      }
      button {
        min-height: var(--tap);
        padding-inline: 18px;
        border: 1px solid var(--color-control);
        border-radius: var(--radius-pill);
        background: transparent;
        color: var(--color-ink);
        font-weight: 600;
        cursor: pointer;
        transition:
          border-color var(--dur-hover) ease,
          transform var(--dur-press) var(--ease-out);
      }
      button:hover {
        border-color: var(--color-ink);
      }
      button:active {
        transform: scale(var(--press));
      }
    }
  `,
})
export class ProjectGalleryComponent {
  readonly images = input.required<GalleryImageView[]>();

  protected readonly current = signal<number | null>(null);
  protected readonly shown = computed(() => {
    const index = this.current();
    return index === null ? null : (this.images()[index] ?? null);
  });
  protected swipeStart: number | null = null;

  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  protected open(index: number): void {
    this.current.set(index);
    this.viewer().nativeElement.showModal();
  }

  protected close(): void {
    this.viewer().nativeElement.close();
  }

  protected move(step: number): void {
    const count = this.images().length;
    this.current.update((index) => ((index ?? 0) + step + count) % count);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.move(1);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      this.move(-1);
      event.preventDefault();
    }
  }

  /** Clicks on the dialog element itself are on the backdrop (its content fills the inner box). */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.viewer().nativeElement) {
      const box = this.viewer().nativeElement.getBoundingClientRect();
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      if (!inside) {
        this.close();
      }
    }
  }

  protected onSwipe(event: PointerEvent): void {
    if (this.swipeStart === null || event.pointerType === 'mouse') {
      this.swipeStart = null;
      return;
    }
    const dx = event.clientX - this.swipeStart;
    this.swipeStart = null;
    if (Math.abs(dx) >= SWIPE_PX && this.images().length > 1) {
      this.move(dx < 0 ? 1 : -1);
    }
  }
}
