/**
 * ProjectGraph: a dependency-free 3D node graph on Canvas 2D (docs/redesign/HANDOFF.md §6, port of the approved
 * prototype's graph.js). Projects sit on a unit sphere, technologies on an inner one; drag to orbit with inertia,
 * hover to highlight a node's edges, click a project to select it and rotate it to the front.
 * Framework-free: construct with a canvas (browser only), call destroy() on teardown.
 * The tuned values below are part of the approved design; change them only with the owner.
 */

export interface GraphPalette {
  /** Project nodes, their labels and highlighted edges. */
  accent: Rgb;
  /** Technology rings and idle edges. */
  tech: Rgb;
  techLabel: Rgb;
  /** Inside of the technology rings: the card's background. */
  nodeFill: string;
}

/** Canvas colours as numbers, per theme (the one place outside tokens.scss that holds the palette). */
export const GRAPH_PALETTES: Record<'dark' | 'light', GraphPalette> = {
  dark: {
    accent: [234, 219, 192], // --champagne
    tech: [127, 184, 164], // --emerald-300
    techLabel: [183, 200, 191], // --text-body
    nodeFill: '#0F2E27', // --ink-800
  },
  light: {
    accent: [15, 46, 39], // --ink-800
    tech: [42, 90, 76], // --signal-ok-light
    techLabel: [38, 68, 59], // --text-body-light
    nodeFill: '#EDE4D2', // --paper-300
  },
};
const LABEL_FONT = "'Manrope Variable', system-ui, sans-serif";

type Rgb = readonly [number, number, number];
type Vec3 = readonly [number, number, number];

export interface GraphProject {
  id: string;
  label: string;
  tech: string[];
}

export interface ProjectGraphOptions {
  projects: GraphProject[];
  /** Technology id → label. */
  tech: Record<string, string>;
  /** Extra dashed edges between technologies. */
  techLinks?: [string, string][];
  onSelect?: (projectId: string) => void;
  autoRotate?: boolean;
  rotateSpeed?: number;
  palette?: GraphPalette;
}

interface GraphNode {
  id: string;
  kind: 'project' | 'tech';
  label: string;
  base: Vec3;
}

interface GraphEdge {
  a: string;
  b: string;
  kind: 'use' | 'tech';
}

interface Projected extends GraphNode {
  sx: number;
  sy: number;
  z: number;
  f: number;
  r: number;
}

const rgba = (c: Rgb, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Fibonacci-sphere spacing with the Y axis squashed to 0.8. */
function fib(i: number, n: number, r: number): Vec3 {
  const k = i + 0.5;
  const phi = Math.acos(1 - (2 * k) / n);
  const th = Math.PI * (1 + Math.sqrt(5)) * k;
  return [
    r * Math.cos(th) * Math.sin(phi),
    r * Math.cos(phi) * 0.8,
    r * Math.sin(th) * Math.sin(phi),
  ];
}

function shortestAngle(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class ProjectGraph {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onSelect: (projectId: string) => void;
  private readonly autoRotate: boolean;
  private readonly rotateSpeed: number;
  private readonly reduce: boolean;

  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private byId: Record<string, GraphNode> = {};
  private proj: Projected[] = [];

  private selected: string | null = null;
  private hover: string | null = null;
  private drag: { x: number; y: number; moved: number } | null = null;
  private yaw = 0.6;
  private pitch = -0.18;
  private vYaw = 0;
  private vPitch = 0;
  private targetYaw: number | null = null;
  private targetPitch: number | null = null;

  private w = 0;
  private h = 0;
  private palette: GraphPalette;
  private raf = 0;
  private running = false;
  /** When the unfold began: the first time the card was on screen, so phones still see it. */
  private start: number | null = null;
  private last = 0;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: ProjectGraphOptions,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.onSelect = options.onSelect ?? (() => undefined);
    this.autoRotate = options.autoRotate ?? true;
    this.rotateSpeed = options.rotateSpeed ?? 1;
    this.palette = options.palette ?? GRAPH_PALETTES.dark;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setData(options.projects, options.tech, options.techLinks ?? []);

    this.ro = new ResizeObserver(this.resize);
    this.resize();
    this.ro.observe(canvas);
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
    canvas.addEventListener('pointerleave', this.leave);

    // The loop runs only while the card is on screen.
    this.io = new IntersectionObserver((entries) =>
      entries.some((e) => e.isIntersecting) ? this.play() : this.pause(),
    );
    this.io.observe(canvas);
  }

  setData(
    projects: GraphProject[],
    tech: Record<string, string>,
    techLinks: [string, string][] = [],
  ): void {
    const techIds = Object.keys(tech);
    this.nodes = [
      ...projects.map((p, i): GraphNode => ({
        id: p.id,
        kind: 'project',
        label: p.label,
        base: fib(i, projects.length, 1),
      })),
      ...techIds.map((t, i): GraphNode => ({
        id: 't:' + t,
        kind: 'tech',
        label: tech[t],
        base: fib(i, techIds.length, 0.48),
      })),
    ];
    this.byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));
    this.edges = [
      ...projects.flatMap((p) =>
        p.tech.map((t): GraphEdge => ({ a: p.id, b: 't:' + t, kind: 'use' })),
      ),
      ...techLinks.map(([a, b]): GraphEdge => ({ a: 't:' + a, b: 't:' + b, kind: 'tech' })),
    ].filter((e) => this.byId[e.a] && this.byId[e.b]);
  }

  /** Colours for the current theme; drawn from the next frame on. */
  setPalette(palette: GraphPalette): void {
    this.palette = palette;
  }

  /** Update labels (e.g. after a language change), by node id. */
  setLabels(map: Record<string, string>): void {
    for (const n of this.nodes) {
      if (map[n.id] != null) n.label = map[n.id];
    }
  }

  /** Select a project (or null) and rotate it to face the viewer. */
  select(id: string | null): void {
    this.selected = id;
    const n = id ? this.byId[id] : undefined;
    if (!n) return;
    const [x, y, z] = n.base;
    this.targetYaw = Math.atan2(x, z);
    this.targetPitch = clamp(Math.atan2(y, Math.hypot(x, z)), -0.9, 0.9);
    this.vYaw = this.vPitch = 0;
  }

  destroy(): void {
    this.pause();
    this.io.disconnect();
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.down);
    c.removeEventListener('pointermove', this.move);
    c.removeEventListener('pointerup', this.up);
    c.removeEventListener('pointercancel', this.up);
    c.removeEventListener('pointerleave', this.leave);
  }

  private play(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.start ??= this.last;
    this.raf = requestAnimationFrame(this.frame);
  }

  private pause(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private readonly resize = (): void => {
    const r = this.canvas.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * d));
    this.canvas.height = Math.max(1, Math.round(r.height * d));
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  };

  private pos(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private readonly down = (e: PointerEvent): void => {
    const [x, y] = this.pos(e);
    this.drag = { x, y, moved: 0 };
    this.targetYaw = this.targetPitch = null;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = 'grabbing';
  };

  private readonly move = (e: PointerEvent): void => {
    const [x, y] = this.pos(e);
    if (this.drag) {
      const dx = x - this.drag.x;
      const dy = y - this.drag.y;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.yaw += dx * 0.008;
      this.pitch = clamp(this.pitch + dy * 0.006, -1.1, 1.1);
      this.vYaw = dx * 0.008;
      this.vPitch = dy * 0.006;
      this.drag.x = x;
      this.drag.y = y;
    } else {
      this.hover = this.hit(x, y);
      this.canvas.style.cursor =
        this.hover && this.byId[this.hover].kind === 'project' ? 'pointer' : 'grab';
    }
  };

  private readonly up = (e: PointerEvent): void => {
    if (!this.drag) return;
    const [x, y] = this.pos(e);
    // Movement under 6px is a click.
    if (this.drag.moved < 6) {
      const id = this.hit(x, y);
      if (id && this.byId[id].kind === 'project') {
        this.select(id);
        this.onSelect(id);
      }
      this.vYaw = this.vPitch = 0;
    }
    this.drag = null;
    this.canvas.style.cursor = 'grab';
  };

  private readonly leave = (): void => {
    if (!this.drag) this.hover = null;
  };

  private hit(x: number, y: number): string | null {
    let best: string | null = null;
    let bd = Infinity;
    for (const p of this.proj) {
      const d = Math.hypot(p.sx - x, p.sy - y);
      if (d < p.r + 12 && d < bd) {
        bd = d;
        best = p.id;
      }
    }
    return best;
  }

  private readonly frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(48, now - this.last);
    this.last = now;
    if (!this.drag) {
      if (this.targetYaw != null && this.targetPitch != null) {
        const k = this.reduce ? 1 : 1 - Math.pow(0.001, dt / 900);
        this.yaw += shortestAngle(this.yaw, this.targetYaw) * k;
        this.pitch += (this.targetPitch - this.pitch) * k;
        if (Math.abs(shortestAngle(this.yaw, this.targetYaw)) < 0.002)
          this.targetYaw = this.targetPitch = null;
      } else {
        this.yaw += this.vYaw;
        this.pitch = clamp(this.pitch + this.vPitch, -1.1, 1.1);
        this.vYaw *= 0.94;
        this.vPitch *= 0.9;
        if (this.autoRotate && !this.reduce && !this.selected && !this.hover) {
          this.yaw += 0.00022 * dt * this.rotateSpeed;
        }
      }
    }
    this.draw(now);
  };

  private draw(now: number): void {
    const { ctx, w, h } = this;
    if (!w) return;
    const intro = this.reduce ? 1 : Math.min(1, (now - (this.start ?? now)) / 1600);
    const e = 1 - Math.pow(1 - intro, 3); // ease-out cubic "unfold" on load
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const S = Math.min(w, h) * 0.36;
    const D = 3.2;
    const cx = w / 2;
    const cyy = h / 2 + 14;
    const project = (v: Vec3) => {
      const x = v[0] * e;
      const y = v[1] * e;
      const z = v[2] * e;
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const f = D / (D - z2);
      return { sx: cx + x1 * f * S, sy: cyy + y2 * f * S, z: z2, f };
    };

    ctx.clearRect(0, 0, w, h);

    // Faint orbit ring.
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const p = project([Math.cos(a), 0, Math.sin(a)]);
      if (i) ctx.lineTo(p.sx, p.sy);
      else ctx.moveTo(p.sx, p.sy);
    }
    ctx.strokeStyle = rgba(this.palette.accent, 0.1);
    ctx.lineWidth = 1;
    ctx.stroke();

    const pm: Record<string, Projected> = {};
    this.proj = this.nodes.map((n) => {
      const p = project(n.base);
      const o: Projected = { ...n, ...p, r: (n.kind === 'project' ? 9 : 5) * p.f };
      pm[n.id] = o;
      return o;
    });

    const focus = this.hover || this.selected;
    const linked = new Set<string>();
    if (focus) {
      linked.add(focus);
      for (const ed of this.edges) {
        if (ed.a === focus) linked.add(ed.b);
        if (ed.b === focus) linked.add(ed.a);
      }
    }

    for (const ed of this.edges) {
      const a = pm[ed.a];
      const b = pm[ed.b];
      const depth = ((a.z + b.z) / 2 + 1) / 2;
      const on = !!focus && (ed.a === focus || ed.b === focus);
      let alpha = ed.kind === 'tech' ? 0.1 + depth * 0.12 : 0.14 + depth * 0.28;
      if (on) alpha = 0.9;
      else if (focus) alpha *= 0.35;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = rgba(on ? this.palette.accent : this.palette.tech, alpha);
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.setLineDash(ed.kind === 'tech' ? [3, 4] : []);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Back to front by depth; size and opacity scale with depth.
    for (const p of [...this.proj].sort((a, b) => a.z - b.z)) {
      const depth = (p.z + 1) / 2;
      const a = (0.35 + depth * 0.65) * (focus && !linked.has(p.id) ? 0.35 : 1);
      if (p.kind === 'project') {
        if (this.selected === p.id || this.hover === p.id) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, p.r + 8, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(this.palette.accent, 0.35);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(this.palette.accent, a);
        ctx.fill();
        ctx.font = `600 ${Math.round(12 + p.f * 2)}px ${LABEL_FONT}`;
        ctx.fillStyle = rgba(this.palette.accent, Math.min(1, a + 0.1));
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.label, p.sx + p.r + 9, p.sy);
      } else {
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = this.palette.nodeFill;
        ctx.fill();
        ctx.strokeStyle = rgba(this.palette.tech, Math.min(1, a + 0.15));
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `500 ${Math.round(10 + p.f * 1.5)}px ${LABEL_FONT}`;
        ctx.fillStyle = rgba(this.palette.techLabel, a);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(p.label, p.sx, p.sy + p.r + 6);
      }
    }
  }
}
