import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

import { MarkdownComponent } from '../../../shared/ui/markdown.component';
import { MediaPickerDialog, MediaPickerData, PickedMedia } from '../media/media-picker.dialog';

type Mode = 'edit' | 'preview';

interface Tool {
  key: 'bold' | 'link' | 'heading' | 'list' | 'code';
  mark: string;
  apply: (selected: string) => string;
}

const TOOLS: Tool[] = [
  { key: 'bold', mark: 'B', apply: (s) => `**${s || 'tekst'}**` },
  { key: 'link', mark: '↗', apply: (s) => `[${s || 'tekst'}](https://)` },
  { key: 'heading', mark: 'H', apply: (s) => `\n## ${s || 'Nagłówek'}\n` },
  {
    key: 'list',
    mark: '•',
    apply: (s) =>
      (s || 'punkt')
        .split('\n')
        .map((line) => `- ${line}`)
        .join('\n'),
  },
  {
    key: 'code',
    mark: '</>',
    apply: (s) => (s.includes('\n') ? `\n\`\`\`\n${s}\n\`\`\`\n` : `\`${s || 'kod'}\``),
  },
];

/**
 * `adm-markdown-editor`: textarea with a small toolbar and a live preview through `ui-markdown`
 * (docs/screens/admin/01-admin-shell.md). Edit and preview are tabs; side by side on wide screens.
 * Images come from the media library as `![alt](/media/<key>)`.
 */
@Component({
  selector: 'adm-markdown-editor',
  imports: [TranslocoPipe, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="head">
      <label class="label" [for]="inputId()">
        {{ label() }}
        @if (required()) {
          <span aria-hidden="true"> *</span>
        }
      </label>
      <div class="modes" role="group" [attr.aria-label]="label()">
        <button
          type="button"
          class="mode"
          [attr.aria-pressed]="mode() === 'edit'"
          (click)="mode.set('edit')"
        >
          {{ 'admin.markdown.edit' | transloco }}
        </button>
        <button
          type="button"
          class="mode"
          [attr.aria-pressed]="mode() === 'preview'"
          (click)="mode.set('preview')"
        >
          {{ 'admin.markdown.preview' | transloco }}
        </button>
      </div>
    </div>
    <div class="body" [class.preview-only]="mode() === 'preview'">
      <div class="editor">
        <div
          class="toolbar"
          role="toolbar"
          [attr.aria-label]="'admin.markdown.toolbar' | transloco: { label: label() }"
        >
          @for (tool of tools; track tool.key) {
            <button
              type="button"
              class="tool"
              [disabled]="disabled()"
              [attr.aria-label]="'admin.markdown.' + tool.key | transloco"
              [title]="'admin.markdown.' + tool.key | transloco"
              (click)="wrap(tool)"
            >
              <span aria-hidden="true">{{ tool.mark }}</span>
            </button>
          }
          <button
            type="button"
            class="tool"
            [disabled]="disabled()"
            [attr.aria-label]="'admin.markdown.image' | transloco"
            [title]="'admin.markdown.image' | transloco"
            (click)="insertImage()"
          >
            <span aria-hidden="true">▣</span>
          </button>
        </div>
        <textarea
          #area
          class="area"
          [id]="inputId()"
          [rows]="rows()"
          [value]="value()"
          [disabled]="disabled()"
          [attr.aria-required]="required() || null"
          [attr.aria-invalid]="!!error() || null"
          [attr.aria-describedby]="
            error() ? inputId() + '-error' : hint() ? inputId() + '-hint' : null
          "
          (input)="onInput(area.value)"
          (blur)="onTouched()"
        ></textarea>
      </div>
      <div class="preview" [attr.aria-label]="'admin.markdown.previewOf' | transloco: { label: label() }" role="region">
        @if (value().trim()) {
          <ui-markdown [markdown]="value()" [lang]="lang()" />
        } @else {
          <p class="empty">{{ 'admin.markdown.empty' | transloco }}</p>
        }
      </div>
    </div>
    @if (error()) {
      <p class="error" [id]="inputId() + '-error'">{{ error() }}</p>
    } @else if (hint()) {
      <p class="hint" [id]="inputId() + '-hint'">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-5);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }
    .label {
      color: var(--color-ink);
    }
    .modes {
      display: flex;
      gap: var(--space-1);
    }
    .mode,
    .tool {
      min-width: 32px;
      min-height: 32px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-line);
      border-radius: 6px;
      background: none;
      color: var(--color-ink);
      font: inherit;
      font-size: var(--step-small);
      cursor: pointer;
      transition:
        background-color var(--dur-hover) var(--ease-out),
        transform var(--dur-press) var(--ease-out);
    }
    .mode:hover,
    .tool:hover {
      background: var(--color-raised);
    }
    .mode:active,
    .tool:active {
      transform: scale(var(--press-small));
    }
    .mode[aria-pressed='true'] {
      background: var(--color-raised);
      border-color: var(--color-stage);
    }
    .body {
      display: grid;
      gap: var(--space-4);
    }
    .preview {
      display: none;
      padding: var(--space-3) var(--space-4);
      border-radius: 10px;
      background: var(--color-raised);
      max-height: 480px;
      overflow: auto;
    }
    .preview-only .editor {
      display: none;
    }
    .preview-only .preview {
      display: block;
    }
    @media (min-width: 1280px) {
      .body {
        grid-template-columns: 1fr 1fr;
      }
      .preview {
        display: block;
      }
      .preview-only .editor {
        display: block;
      }
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }
    .area {
      box-sizing: border-box;
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--color-ink);
      font: inherit;
      line-height: 1.5;
      resize: vertical;
    }
    .area:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }
    .area[aria-invalid='true'] {
      border-color: var(--color-busy);
    }
    .hint,
    .empty {
      margin: var(--space-1) 0 0;
      color: var(--color-muted);
      font-size: var(--step-small);
    }
    .error {
      margin: var(--space-1) 0 0;
      color: var(--color-busy);
      font-size: var(--step-small);
    }
  `,
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly required = input(false);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly rows = input(8);
  /** The language whose alt text is used for inserted images. */
  readonly lang = input<'pl' | 'en'>('pl');

  protected readonly tools = TOOLS;
  protected readonly mode = signal<Mode>('edit');
  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  private readonly area = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');
  private readonly dialog = inject(MatDialog);
  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected wrap(tool: Tool): void {
    this.replaceSelection((selected) => tool.apply(selected));
  }

  protected insertImage(): void {
    const ref = this.dialog.open<MediaPickerDialog, MediaPickerData, PickedMedia[]>(
      MediaPickerDialog,
      {
        data: { multiple: false },
        width: '960px',
        maxWidth: '95vw',
      },
    );
    ref.afterClosed().subscribe((picked) => {
      const media = picked?.[0];
      if (!media) return;
      const alt = (this.lang() === 'en' ? media.altEn : media.altPl) ?? media.altPl ?? '';
      this.replaceSelection(() => `![${alt.replace(/[[\]]/g, '')}](${media.url})`);
    });
  }

  private replaceSelection(make: (selected: string) => string): void {
    const area = this.area().nativeElement;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const insert = make(value.slice(start, end));
    const next = value.slice(0, start) + insert + value.slice(end);
    this.onInput(next);
    area.value = next;
    area.focus();
    area.setSelectionRange(start + insert.length, start + insert.length);
    this.mode.set('edit');
  }
}
