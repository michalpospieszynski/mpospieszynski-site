import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';

import { ThemeService } from '../../../core/theme/theme.service';
import { GRAPH_PALETTES, GraphProject, ProjectGraph } from './project-graph';

/**
 * Wraps ProjectGraph (docs/redesign/HANDOFF.md §6). The graph is built in the browser only, after the first
 * render. The app is zoneless, so its requestAnimationFrame loop never triggers change detection; only a click
 * on a project node reaches Angular, through `selectedChange`. The canvas is an image to assistive technology:
 * every choice it offers is also available as buttons next to it.
 */
@Component({
  selector: 'app-project-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="canvas" role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
    }
    .canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
      touch-action: pan-y;
    }
  `,
})
export class ProjectGraphComponent {
  readonly projects = input.required<GraphProject[]>();
  /** Technology id → label. */
  readonly tech = input.required<Record<string, string>>();
  readonly techLinks = input<[string, string][]>([]);
  readonly selected = input<string | null>(null);
  readonly label = input.required<string>();
  readonly selectedChange = output<string>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private graph: ProjectGraph | null = null;
  private readonly theme = inject(ThemeService).theme;

  constructor() {
    afterNextRender(() => {
      this.graph = new ProjectGraph(this.canvas().nativeElement, {
        projects: this.projects(),
        tech: this.tech(),
        techLinks: this.techLinks(),
        onSelect: (id) => this.selectedChange.emit(id),
        palette: GRAPH_PALETTES[this.theme()],
      });
      this.graph.select(this.selected());
    });

    // Data (and its labels) change with the language: rebuild the nodes, keep the view.
    effect(() => {
      const projects = this.projects();
      const tech = this.tech();
      const links = this.techLinks();
      if (!this.graph) return;
      this.graph.setData(projects, tech, links);
      this.graph.select(untracked(this.selected));
    });

    effect(() => {
      const id = this.selected();
      this.graph?.select(id);
    });

    effect(() => {
      const palette = GRAPH_PALETTES[this.theme()];
      this.graph?.setPalette(palette);
    });

    inject(DestroyRef).onDestroy(() => {
      this.graph?.destroy();
      this.graph = null;
    });
  }
}
