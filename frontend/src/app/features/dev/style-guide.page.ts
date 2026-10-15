import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

import contrastPairs from '../../../styles/contrast-pairs.json';
import { contrastRatio } from '../../core/contrast';
import { AvailabilityComponent } from '../../shared/ui/availability.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyComponent } from '../../shared/ui/empty.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { LangFallbackComponent } from '../../shared/ui/lang-fallback.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';
import { ProjectFeatureComponent } from '../../shared/ui/project-feature.component';
import { ProjectItemComponent } from '../../shared/ui/project-item.component';
import { SectionComponent } from '../../shared/ui/section.component';
import { TechTagComponent } from '../../shared/ui/tech-tag.component';

interface AxeViolation {
  id: string;
  impact: string;
  help: string;
  nodes: number;
}

const MARKDOWN_SAMPLE = `Nocne przetwarzanie trwało **4 godziny**. Po zmianach: *25 minut*.

- partie z równoległymi workerami
- indeksy i wzorzec outbox

\`\`\`java
@Transactional(readOnly = true)
public List<Order> pending() {
    return orders.findByStatus(Status.PENDING); // 25 min zamiast 4 h
}
\`\`\`

<script>alert('usunięte przez DOMPurify')</script>`;

interface ColourToken {
  token: string;
  value: string;
}

interface ContrastRow {
  label: string;
  ratio: number;
  min: number;
  pass: boolean;
}

const COLOUR_TOKENS = [
  '--ink-900',
  '--ink-800',
  '--ink-700',
  '--ink-600',
  '--ink-500',
  '--emerald-300',
  '--champagne',
  '--champagne-line',
  '--text-muted',
  '--text-body',
  '--text-soft',
  '--text-on-champagne',
  '--signal-error',
];

const TYPE_STEPS = [
  {
    token: '--step-display',
    use: 'hero title',
    display: true,
    sample: 'Spokojne systemy',
  },
  {
    token: '--step-head',
    use: 'section titles',
    display: true,
    sample: 'Dla ważnych procesów',
  },
  {
    token: '--step-lead',
    use: 'intros, outcome lines',
    display: false,
    sample: 'Nocne przetwarzanie z 4 h do 25 min',
  },
  {
    token: '--step-body',
    use: 'running text',
    display: false,
    sample: 'Zażółć gęślą jaźń. Projektuję i rozwijam backendy w Javie i Spring Boot.',
  },
  {
    token: '--step-small',
    use: 'metadata, captions',
    display: false,
    sample: 'Java · Spring Boot · PostgreSQL · 2025',
  },
];

/**
 * Dev-only style guide (DIRECTION.md): the palette, the five type sizes, surfaces and the shared components,
 * with live contrast for every pair in contrast-pairs.json.
 * Registered only when isDevMode() is true; its copy is not translated on purpose.
 */
@Component({
  selector: 'app-style-guide-page',
  imports: [
    ButtonComponent,
    TechTagComponent,
    AvailabilityComponent,
    ProjectFeatureComponent,
    ProjectItemComponent,
    SectionComponent,
    EmptyComponent,
    LangFallbackComponent,
    FieldComponent,
    MarkdownComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './style-guide.page.html',
  styleUrl: './style-guide.page.scss',
})
export class StyleGuidePage {
  protected readonly typeSteps = TYPE_STEPS;
  protected readonly colours = signal<ColourToken[]>([]);
  protected readonly contrast = signal<ContrastRow[]>([]);

  protected readonly markdownSample = MARKDOWN_SAMPLE;
  protected readonly axeResult = signal('Not run yet.');
  protected readonly axeViolations = signal<AxeViolation[]>([]);

  private readonly document = inject(DOCUMENT);

  /** Runs axe-core (dev dependency, loaded on demand) on the whole page. */
  protected async runAxe(): Promise<void> {
    this.axeResult.set('Running…');
    const axe = (await import('axe-core')).default;
    const result = await axe.run(this.document, { resultTypes: ['violations'] });
    this.axeViolations.set(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? 'unknown',
        help: v.help,
        nodes: v.nodes.length,
      })),
    );
    this.axeResult.set(
      result.violations.length
        ? `${result.violations.length} violation(s).`
        : `No violations (${result.passes.length} rules passed).`,
    );
  }

  constructor() {
    afterNextRender(() => this.measure());
  }


  private measure(): void {
    const style = getComputedStyle(this.document.documentElement);
    const value = (token: string) => style.getPropertyValue(token).trim();

    this.colours.set(COLOUR_TOKENS.map((token) => ({ token, value: value(token) })));
    this.contrast.set(
      contrastPairs.pairs.map(({ label, fg, bg, min }) => {
        const ratio = contrastRatio(value(fg), value(bg));
        return { label, ratio, min, pass: ratio >= min };
      }),
    );
  }
}
