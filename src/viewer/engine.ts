/* ViewerEngine — behaviour of the 3D teardown viewer, ported from reference/prototype/qdd-engine.js.
   React Three Fiber owns the renderer, scene graph and frame loop; this class owns the mutable
   per-frame state (camera rig, explode tween, kinematics, tints, overlay labels) so that animation
   never re-renders React. UI state is pushed out through callbacks into the zustand store. */
import * as THREE from 'three';
import {
  DEFAULT_HIDDEN, GEARBOX_SET, GROUPS, GROUP_KEYS, MOTOR_SET, TORQUE_SETS, WINDING, type GroupKey,
} from '../content/parts';
import type { Mode, ViewName } from '../content/explorer';
import { MODEL_SCALE, type NodeDef } from './model';
import type { SectionMaterial } from './materials';
import { motion } from './motion';

export type ViewerKind = 'hero' | 'explorer';
export type Visibility = Record<GroupKey, boolean>;

export interface EngineCallbacks {
  onReady?: () => void;
  onSelect?: (g: GroupKey | null) => void;
  onHover?: (g: GroupKey | null) => void;
  onVisibility?: (v: Visibility, isolate: GroupKey | null) => void;
  onStage?: (n: number) => void;
  onTorqueStep?: (n: number) => void;
  onExplodeTarget?: (to: number) => void;
  onSection?: (on: boolean) => void;
  onPlaying?: (on: boolean) => void;
  onOpenTop?: (on: boolean) => void;
  onWheelHint?: () => void;
}

export interface RuntimeNode {
  def: NodeDef;
  pivot: THREE.Group;
  holder: THREE.Group;
  mesh: THREE.Mesh;
  mat: SectionMaterial;
  vis: boolean;
}

interface CamState { theta: number; phi: number; dist: number; target: THREE.Vector3 }
interface CamGoal {
  theta: number; phi: number; dist: number; ty: number; tx: number | null; tz: number | null;
  t0: number; dur: number;
  from: { theta: number; phi: number; dist: number; ty: number; tx: number; tz: number };
}

const VIEWS: Record<ViewName, { theta: number; phi: number; dist: number; ty: number }> = {
  iso: { theta: 0.72, phi: 1.08, dist: 34, ty: -0.8 },
  output: { theta: 0.35, phi: 0.36, dist: 30, ty: 0 },
  controller: { theta: 0.5, phi: 2.62, dist: 30, ty: -1.5 },
  side: { theta: 0.0, phi: 1.5708, dist: 32, ty: -0.8 },
  section: { theta: 0.02, phi: 1.32, dist: 27, ty: -0.6 },
  exploded: { theta: 0.78, phi: 1.18, dist: 50, ty: -3.0 },
  gearbox: { theta: 0.55, phi: 0.62, dist: 21, ty: 0 },
  motor: { theta: 0.3, phi: 0.02, dist: 21, ty: 0 },
  torque: { theta: 0.25, phi: 1.12, dist: 30, ty: -1.0 },
  hero: { theta: 0.6, phi: 1.12, dist: 30, ty: -0.9 },
};

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const defHidden = (): Partial<Record<GroupKey, boolean>> => ({ ...DEFAULT_HIDDEN });

export class ViewerEngine {
  readonly kind: ViewerKind;
  cb: EngineCallbacks;
  ready = false;

  // ---- state (mirrors the prototype)
  explode = 0;
  private explodeTarget: number | null = null;
  private explodeFrom = 0;
  private explodeT0 = 0;
  private explodeDur = 1;
  section = false;
  sectionMode: 'axial' | 'radial' = 'axial';
  mode: Mode = 'explore';
  stage = 6;
  private stageP = 1;
  private stageT0 = 0;
  playing = !motion.reduced;
  thetaC = 0;
  speed = 1;
  hover: GroupKey | null = null;
  selected: GroupKey | null = null;
  isolated: GroupKey | null = null;
  hidden = defHidden();
  torqueStep = 0;
  labels = true;
  openTop = false;
  private engaged = false;

  // ---- scene
  nodes: RuntimeNode[] = [];
  byGroup: Partial<Record<GroupKey, RuntimeNode[]>> = {};
  gbox: Partial<Record<GroupKey, THREE.Box3>> = {};
  allBox = new THREE.Box3();
  readonly clipping: THREE.Plane[] = [];
  private clipAxial = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private clipRadial = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.05);
  shadow: THREE.Mesh | null = null;
  key: THREE.DirectionalLight | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  gl: THREE.WebGLRenderer | null = null;

  // ---- camera rig
  cam: CamState = { target: new THREE.Vector3(0, -0.8, 0), theta: 0.72, phi: 1.08, dist: 34 };
  private camGoal: CamGoal | null = null;

  // ---- input / overlay
  private raycaster = new THREE.Raycaster();
  private pointer = { x: 0, y: 0, inside: false, moved: false, down: false };
  private pickT = 0;
  private canvas: HTMLCanvasElement | null = null;
  private unbind: (() => void) | null = null;
  overlay: HTMLCanvasElement | null = null;
  readout: HTMLElement | null = null;
  private roT = 0;
  private w = 1;
  private h = 1;
  private od = 1;
  private t0 = performance.now();

  constructor(kind: ViewerKind, cb: EngineCallbacks = {}) {
    this.kind = kind;
    this.cb = cb;
    if (kind === 'hero') this.applyViewNow('hero');
  }

  // ------------------------------------------------------------------ setup
  attachNodes(nodes: RuntimeNode[]) {
    this.nodes = nodes;
    this.byGroup = {};
    for (const n of nodes) {
      n.mat.clippingPlanes = this.clipping;
      (this.byGroup[n.def.group] ||= []).push(n);
    }
    this.gbox = {};
    this.allBox = new THREE.Box3();
    for (const g of Object.keys(this.byGroup) as GroupKey[]) {
      const b = new THREE.Box3();
      this.byGroup[g]!.forEach((n) => b.union(n.def.bbox));
      b.min.multiplyScalar(MODEL_SCALE); b.max.multiplyScalar(MODEL_SCALE);
      this.gbox[g] = b;
      this.allBox.union(b);
    }
    if (this.shadow) this.shadow.position.y = this.allBox.min.y - 0.25;
    this.ready = true;
    this.applyMode(true);
    this.cb.onReady?.();
  }

  detachNodes() { this.nodes = []; this.byGroup = {}; this.ready = false; }

  bindInput(el: HTMLCanvasElement) {
    this.unbind?.();
    this.canvas = el;
    if (this.kind === 'hero') return;
    el.style.touchAction = 'none';
    const ptrs = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let pinch: { d: number; mx: number; my: number } | null = null;
    let downAt: { x: number; y: number; t: number; button: number; shift: boolean } | null = null;
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      const p = pos(e);
      ptrs.set(e.pointerId, p);
      this.pointer.down = true; this.engaged = true;
      last = p;
      downAt = { x: p.x, y: p.y, t: performance.now(), button: e.button, shift: e.shiftKey };
      this.camGoal = null;
    };
    const move = (e: PointerEvent) => {
      const p = pos(e);
      this.pointer.x = (p.x / p.w) * 2 - 1; this.pointer.y = -(p.y / p.h) * 2 + 1;
      this.pointer.inside = true; this.pointer.moved = true;
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, p);
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch) { this.cam.dist = clamp((this.cam.dist * pinch.d) / d, 8, 90); this.pan(mx - pinch.mx, my - pinch.my); }
        pinch = { d, mx, my };
        return;
      }
      if (!last) { last = p; return; }
      const dx = p.x - last.x, dy = p.y - last.y; last = p;
      if (downAt && (downAt.button === 2 || downAt.shift)) this.pan(dx, dy);
      else { this.cam.theta -= dx * 0.0085; this.cam.phi = clamp(this.cam.phi - dy * 0.0085, 0.08, Math.PI - 0.08); }
    };
    const up = (e: PointerEvent) => {
      const p = pos(e);
      if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 5 && performance.now() - downAt.t < 450 && ptrs.size === 1) {
        this.pick((p.x / p.w) * 2 - 1, -(p.y / p.h) * 2 + 1, true);
      }
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!ptrs.size) { last = null; this.pointer.down = false; downAt = null; }
    };
    const leave = () => {
      this.pointer.inside = false;
      if (this.hover) { this.hover = null; this.cb.onHover?.(null); }
      this.engaged = false;
    };
    const wheel = (e: WheelEvent) => {
      if (!this.engaged && !e.ctrlKey) { this.cb.onWheelHint?.(); return; }
      e.preventDefault(); this.camGoal = null;
      this.cam.dist = clamp(this.cam.dist * Math.exp(e.deltaY * 0.0012), 8, 90);
    };
    const ctx = (e: Event) => e.preventDefault();
    const key = (e: KeyboardEvent) => { this.handleKey(e); };
    const focus = () => { this.engaged = true; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave); el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', ctx); el.addEventListener('keydown', key); el.addEventListener('focus', focus);
    this.unbind = () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave); el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', ctx); el.removeEventListener('keydown', key); el.removeEventListener('focus', focus);
    };
  }

  dispose() { this.unbind?.(); this.unbind = null; }

  private pan(dx: number, dy: number) {
    const c = this.camera; if (!c) return;
    const s = this.cam.dist * 0.0016;
    const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0);
    const upv = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
    this.cam.target.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
  }

  handleKey(e: KeyboardEvent): boolean {
    const k = e.key;
    let used = true;
    if (k === 'ArrowLeft') this.cam.theta += 0.12;
    else if (k === 'ArrowRight') this.cam.theta -= 0.12;
    else if (k === 'ArrowUp') this.cam.phi = clamp(this.cam.phi - 0.1, 0.08, 3.06);
    else if (k === 'ArrowDown') this.cam.phi = clamp(this.cam.phi + 0.1, 0.08, 3.06);
    else if (k === '+' || k === '=') this.cam.dist = clamp(this.cam.dist * 0.88, 8, 90);
    else if (k === '-' || k === '_') this.cam.dist = clamp(this.cam.dist * 1.13, 8, 90);
    else if (k === 'r' || k === 'R') this.resetView();
    else if (k === 'e' || k === 'E') { if (this.mode === 'explore') this.animateExplode(this.explode > 0.5 ? 0 : 1); }
    else if (k === 's' || k === 'S') this.setSection(!this.section);
    else if (k === 'Escape') this.select(null);
    else used = false;
    if (used) { e.preventDefault(); if (k.startsWith('Arrow') || '+=-_'.includes(k)) this.camGoal = null; }
    return used;
  }

  private pick(x: number, y: number, click: boolean): GroupKey | null {
    if (!this.ready || !this.camera) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const vis = this.nodes.filter((n) => n.mesh.visible && n.vis).map((n) => n.mesh);
    const hits = this.raycaster.intersectObjects(vis, false);
    let hit: THREE.Intersection | null = null;
    for (const h of hits) {
      if (this.clipping.every((p) => p.distanceToPoint(h.point) >= 0)) { hit = h; break; }
    }
    const g = hit ? (hit.object.userData.group as GroupKey) : null;
    if (click) this.select(g === this.selected ? null : g);
    return g;
  }

  // ------------------------------------------------------------------ public API
  setExplode(t: number) { this.explode = clamp(t, 0, 1); this.explodeTarget = null; }
  animateExplode(to: number, dur?: number) {
    this.explodeFrom = this.explode; this.explodeTarget = clamp(to, 0, 1);
    this.explodeT0 = performance.now(); this.explodeDur = motion.reduced ? 1 : dur || 1600;
    this.cb.onExplodeTarget?.(this.explodeTarget);
  }
  setSection(on: boolean, mode?: 'axial' | 'radial') {
    this.section = !!on; if (mode) this.sectionMode = mode;
    this.clipping.length = 0;
    if (this.section) this.clipping.push(this.sectionMode === 'radial' ? this.clipRadial : this.clipAxial);
    this.cb.onSection?.(this.section);
  }
  private applyViewNow(name: ViewName) {
    const v = VIEWS[name];
    this.cam.theta = v.theta; this.cam.phi = v.phi; this.cam.dist = v.dist; this.cam.target.set(0, v.ty, 0);
  }
  setView(name: ViewName, instant = false) {
    const v = VIEWS[name]; if (!v) return;
    let th = v.theta; const cur = this.cam.theta;
    while (th - cur > Math.PI) th -= 2 * Math.PI;
    while (cur - th > Math.PI) th += 2 * Math.PI;
    this.camGoal = {
      theta: th, phi: v.phi, dist: v.dist, ty: v.ty, tx: null, tz: null, t0: performance.now(),
      from: this.camFrom(), dur: instant || motion.reduced ? 1 : 1100,
    };
  }
  private camFrom() {
    const c = this.cam;
    return { theta: c.theta, phi: c.phi, dist: c.dist, ty: c.target.y, tx: c.target.x, tz: c.target.z };
  }
  resetView() {
    this.select(null); this.isolated = null; this.hidden = defHidden();
    this.setSection(false); this.animateExplode(0, 900);
    const v = this.mode === 'explore' ? 'iso' : this.mode;
    if (v in VIEWS) this.setView(v as ViewName);
    this.emitVisibility();
  }
  select(g: GroupKey | null) { this.selected = g; this.cb.onSelect?.(g); }
  setHover(g: GroupKey | null) { this.hover = g; }
  focus(g: GroupKey) {
    const box = this.gbox[g]; if (!this.ready || !box) return;
    this.select(g);
    const c = box.getCenter(new THREE.Vector3()).add(this.groupOffset(g));
    const sz = box.getSize(new THREE.Vector3()).length();
    this.camGoal = {
      theta: this.cam.theta, phi: this.cam.phi, dist: clamp(sz * 2.6, 10, 70), ty: c.y, tx: c.x, tz: c.z,
      t0: performance.now(), from: this.camFrom(), dur: motion.reduced ? 1 : 900,
    };
  }
  setVisible(g: GroupKey, on: boolean) { this.hidden[g] = !on; this.emitVisibility(); }
  toggleVisible(g: GroupKey) { this.setVisible(g, !!this.hidden[g]); }
  isolate(g: GroupKey) { this.isolated = this.isolated === g ? null : g; this.select(g); this.emitVisibility(); }
  showAll() { this.isolated = null; this.hidden = defHidden(); this.emitVisibility(); }
  visibility(): Visibility {
    const o = {} as Visibility;
    for (const g of GROUP_KEYS) o[g] = !this.hidden[g] && (!this.isolated || this.isolated === g);
    return o;
  }
  private emitVisibility() { this.cb.onVisibility?.(this.visibility(), this.isolated); }
  setPlaying(on: boolean) { this.playing = !!on; this.cb.onPlaying?.(this.playing); }
  setSpeed(s: number) { this.speed = s; }
  setOpenTop(on: boolean) { this.openTop = !!on; this.cb.onOpenTop?.(this.openTop); }
  setLabels(on: boolean) { this.labels = !!on; }
  setStage(n: number) {
    n = clamp(n, 1, 6);
    if (n === this.stage && this.stageP >= 1) return;
    this.stage = n; this.stageP = 0; this.stageT0 = performance.now();
    this.cb.onStage?.(n);
  }
  setTorqueStep(n: number) { this.torqueStep = clamp(n, 1, 5); this.cb.onTorqueStep?.(this.torqueStep); }
  setMode(m: Mode) { this.mode = m; this.applyMode(false); }

  private applyMode(init: boolean) {
    if (!this.ready) return;
    const m = this.mode;
    this.isolated = null; this.hidden = defHidden(); this.setOpenTop(false);
    if (this.kind === 'hero') { this.setView('hero', true); return; }
    if (m === 'explore') { this.setSection(false); this.setView('iso', init); }
    else if (m === 'sequence') {
      this.setSection(false); this.animateExplode(0, 600);
      this.stage = 1; this.stageP = 0; this.stageT0 = performance.now();
      this.setView('exploded'); this.cb.onStage?.(1);
    } else if (m === 'gearbox') { this.setSection(false); this.animateExplode(0, 600); this.setOpenTop(true); this.setView('gearbox'); this.setPlaying(!motion.reduced); }
    else if (m === 'motor') { this.setSection(true, 'radial'); this.animateExplode(0, 600); this.setView('motor'); this.setPlaying(!motion.reduced); }
    else if (m === 'torque') { this.setSection(true, 'axial'); this.animateExplode(0, 600); this.setView('torque'); this.setPlaying(!motion.reduced); this.setTorqueStep(this.torqueStep || 1); }
    this.emitVisibility();
  }

  /** Mean explode offset of a group, in scene units. */
  private groupOffset(g: GroupKey) {
    const ns = this.byGroup[g]; if (!ns) return new THREE.Vector3();
    let y = 0; ns.forEach((n) => { y += n.pivot.position.y; });
    return new THREE.Vector3(0, (y / ns.length) * MODEL_SCALE, 0);
  }

  // ------------------------------------------------------------------ per-frame
  frame(now: number, dtIn: number) {
    const dt = Math.min(0.05, dtIn);
    const camera = this.camera; if (!camera) return;
    // explode tween
    if (this.explodeTarget != null) {
      const p = clamp((now - this.explodeT0) / this.explodeDur, 0, 1);
      this.explode = lerp(this.explodeFrom, this.explodeTarget, ease(p));
      if (p >= 1) this.explodeTarget = null;
      this.onExplodeValue?.(this.explode);
    }
    if (this.stageP < 1) this.stageP = clamp((now - this.stageT0) / (motion.reduced ? 1 : 1400), 0, 1);
    // camera tween
    const c = this.cam;
    const gq = this.camGoal;
    if (gq) {
      const q = ease(clamp((now - gq.t0) / gq.dur, 0, 1));
      c.theta = lerp(gq.from.theta, gq.theta, q); c.phi = lerp(gq.from.phi, gq.phi, q); c.dist = lerp(gq.from.dist, gq.dist, q);
      c.target.y = lerp(gq.from.ty, gq.ty, q);
      c.target.x = lerp(gq.from.tx, gq.tx ?? 0, q);
      c.target.z = lerp(gq.from.tz, gq.tz ?? 0, q);
      if (q >= 1) this.camGoal = null;
    }
    if (this.kind === 'hero' && !motion.reduced) c.theta += dt * 0.12;
    const sp = Math.sin(c.phi);
    const exf = this.mode === 'explore' ? this.explode : 0;
    const dEff = c.dist * (1 + 0.62 * exf);
    const tx = c.target.x, ty = c.target.y - 2.3 * exf, tz = c.target.z;
    camera.position.set(tx + dEff * sp * Math.sin(c.theta), ty + dEff * Math.cos(c.phi), tz + dEff * sp * Math.cos(c.theta));
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();
    // lights
    const lt = (now - this.t0) / 1000;
    if (this.key) {
      if (this.kind === 'hero') {
        const a = lt * (motion.reduced ? 0 : 0.09);
        this.key.position.set(12 * Math.cos(a), 14 + 2 * Math.sin(a * 0.7), 12 * Math.sin(a));
        this.key.intensity = 1.5 + 0.25 * Math.sin(a * 1.3);
        if (this.gl) this.gl.toneMappingExposure = 1.02 + 0.06 * Math.sin(a * 0.8);
      } else {
        this.key.position.set(camera.position.x * 0.6 + 6, camera.position.y * 0.6 + 12, camera.position.z * 0.6 + 4);
      }
    }
    if (!this.ready) return;
    if (this.kind !== 'hero' && this.gl) {
      const goal = this.section ? 1.32 : 1.05;
      this.gl.toneMappingExposure += (goal - this.gl.toneMappingExposure) * Math.min(1, dt * 4);
    }
    // kinematics: carrier θ; sun/rotor 7θ; planets orbit θ and spin −2.4θ about their own axis
    const spinOn = this.playing && (this.mode === 'gearbox' || this.mode === 'motor' || this.mode === 'torque');
    if (spinOn) this.thetaC += dt * 0.32 * this.speed;
    const thC = this.thetaC, thS = 7 * thC, thPrel = -2.4 * thC;
    if (this.readout && (!this.roT || now - this.roT > 120)) {
      this.roT = now;
      const ri = thS / (2 * Math.PI), rc = thC / (2 * Math.PI);
      this.readout.textContent = 'INPUT (sun + rotor) ' + ri.toFixed(2) + ' rev   →   OUTPUT (carrier) ' + rc.toFixed(2) +
        ' rev   ·   ratio ' + (rc > 0.001 ? (ri / rc).toFixed(2) : '7.00') + ' : 1';
    }
    const mode = this.mode, ex = this.explode, sel = this.selected, hov = this.hover;
    const tstep = this.torqueStep || 1;
    const tset = mode === 'torque' ? TORQUE_SETS[tstep] : null;
    const elec = thS * 21; // electrical angle: 21 pole pairs
    for (const n of this.nodes) {
      const d = n.def, g = d.group;
      let vis = true;
      if (this.hidden[g]) vis = false;
      if (this.isolated && this.isolated !== g) vis = false;
      if (mode === 'gearbox') {
        vis = vis && GEARBOX_SET.includes(g);
        if (this.openTop && ((g === 'ring' && d.explodeY > 0) || (g === 'carrier' && d.explodeY > 0) || (g === 'pins' && d.explodeY > 11.7))) vis = false;
      }
      if (mode === 'motor') vis = vis && MOTOR_SET.includes(g);
      if (mode === 'sequence') vis = vis && d.stage <= this.stage;
      // explode offset (mm, inside the scaled root)
      let off = 0;
      if (mode === 'sequence') off = d.stage === this.stage ? d.explodeY * (1 - ease(this.stageP)) : 0;
      else off = d.explodeY * ex;
      n.pivot.position.y = off;
      // kinematic rotation about +Y
      let rot = 0;
      if (d.kinematics === 'input') rot = thS; else if (d.kinematics === 'carrier' || d.kinematics === 'planet') rot = thC;
      n.pivot.rotation.y = rot;
      n.holder.rotation.y = d.kinematics === 'planet' ? thPrel : 0;
      n.mesh.visible = vis; n.vis = vis;
      // tint / emphasis
      const tint = n.mat.userData.tint.value; tint.set(0, 0, 0, 0);
      const em = n.mat.emissive; em.setRGB(0, 0, 0);
      if (mode === 'gearbox') {
        if (g === 'sun') tint.set(0.30, 0.62, 0.80, 0.38);
        else if (g === 'carrier' || g === 'pins') tint.set(0.90, 0.56, 0.30, 0.32);
      }
      const magnetView = mode === 'motor' || (mode === 'torque' && (tstep === 2 || tstep === 3));
      if (magnetView) {
        if (g === 'magMain') { if (d.polarity === 0) tint.set(0.90, 0.48, 0.25, 0.55); else tint.set(0.28, 0.55, 0.85, 0.55); }
        if (g === 'magHal') { if (d.polarity === 0) tint.set(0.95, 0.70, 0.50, 0.42); else tint.set(0.55, 0.75, 0.92, 0.42); }
      }
      if (g === 'coils' && magnetView && d.coilIndex != null) {
        const ch = WINDING.charAt(d.coilIndex % 12), ph = 'ABC'.indexOf(ch.toUpperCase()), sign = ch === ch.toUpperCase() ? 1 : -1;
        const cur = sign * Math.cos(elec - ph * 2.0944);
        if (cur > 0) em.setRGB(0.95 * cur, 0.42 * cur, 0.16 * cur); else em.setRGB(0.14 * -cur, 0.42 * -cur, 0.78 * -cur);
        em.multiplyScalar(0.55);
      }
      if (tset) {
        if (!tset.includes(g)) tint.set(0.07, 0.08, 0.09, 0.55);
        else if (tstep === 5 && (g === 'carrier' || g === 'frame' || g === 'pins')) tint.set(0.92, 0.56, 0.28, 0.35);
        else if (tstep === 4 && (g === 'sun' || g === 'rotor')) tint.set(0.30, 0.62, 0.82, 0.30);
        else if (tstep === 1) {
          const pulse = motion.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(lt * 4);
          em.setRGB(0.10 + 0.25 * pulse, 0.30 + 0.25 * pulse, 0.45 + 0.3 * pulse);
        }
      }
      if (g === sel) { if (tint.w < 0.3) tint.set(0.47, 0.76, 0.88, 0.30); em.r += 0.04; em.g += 0.09; em.b += 0.12; }
      else if (g === hov) { em.r += 0.05; em.g += 0.07; em.b += 0.09; }
      else if (sel && mode === 'explore' && !this.isolated) { if (tint.w === 0) tint.set(0.05, 0.055, 0.06, 0.35); }
    }
    if (this.shadow) this.shadow.visible = !(this.section && this.sectionMode === 'radial');
    // hover picking (throttled)
    if (this.kind !== 'hero' && this.pointer.inside && this.pointer.moved && !this.pointer.down) {
      this.pointer.moved = false;
      if (!this.pickT || now - this.pickT > 60) {
        this.pickT = now;
        const hg = this.pick(this.pointer.x, this.pointer.y, false);
        if (hg !== this.hover) {
          this.hover = hg; this.cb.onHover?.(hg);
          if (this.canvas) this.canvas.style.cursor = hg ? 'pointer' : 'grab';
        }
      }
    }
  }

  /** Called with the animated explode amount (0..1) so the slider can follow. */
  onExplodeValue: ((x: number) => void) | null = null;

  // ------------------------------------------------------------------ overlay labels
  resizeOverlay(w: number, h: number) {
    this.w = w; this.h = h;
    const o = this.overlay; if (!o) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (o.width !== Math.round(w * d) || o.height !== Math.round(h * d)) { o.width = Math.round(w * d); o.height = Math.round(h * d); }
    this.od = d;
  }
  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera!);
    return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, z: p.z };
  }
  private anchor(g: GroupKey): THREE.Vector3 | null {
    const b = this.gbox[g]; if (!b || !this.camera) return null;
    const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
    const cam = this.camera.position;
    const dir = new THREE.Vector3(cam.x, 0, cam.z).normalize();
    const r = Math.max(size.x, size.z) * 0.5;
    const right = new THREE.Vector3(dir.z, 0, -dir.x);
    let p = c.clone().addScaledVector(right, r * 0.86);
    if (g === 'fasteners' || g === 'pbearings') p = c.clone();
    return p.add(this.groupOffset(g));
  }
  private groupVisible(g: GroupKey) { return !!this.byGroup[g]?.some((n) => n.mesh.visible); }

  drawOverlay(now: number) {
    const o = this.overlay; if (!o) return;
    const x = o.getContext('2d'); if (!x) return;
    const d = this.od;
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, this.w, this.h);
    if (!this.ready || this.kind === 'hero' || !this.labels || !this.camera) return;
    const mode = this.mode;
    const showAll = (mode === 'explore' && this.explode > 0.35) || mode === 'sequence';
    let candidates: GroupKey[] = [];
    if (showAll) {
      for (const g of Object.keys(this.byGroup) as GroupKey[]) {
        if (g === 'fasteners' || g === 'pins' || g === 'pbearings') continue;
        if (mode === 'sequence' && this.byGroup[g]![0].def.stage !== this.stage) continue;
        if (!this.groupVisible(g)) continue;
        candidates.push(g);
      }
    }
    if (mode === 'gearbox') candidates = ['sun', 'planets', 'ring', 'carrier'];
    if (mode === 'motor') candidates = ['stator', 'coils', 'magMain', 'magHal', 'rotor'];
    if (this.hover && !candidates.includes(this.hover)) candidates.push(this.hover);
    if (this.selected && !candidates.includes(this.selected)) candidates.push(this.selected);
    interface Lab { g: GroupKey; ax: number; ay: number; side: number; ly: number }
    const list: Lab[] = [];
    for (const g of candidates) {
      if (!this.groupVisible(g)) continue;
      const a = this.anchor(g); if (!a) continue;
      const p = this.project(a); if (p.z > 1) continue;
      list.push({ g, ax: p.x, ay: p.y, side: p.x > this.w * 0.5 ? 1 : -1, ly: p.y });
    }
    if (list.length > 5) { list.sort((a, b) => a.ay - b.ay); list.forEach((l, i) => { l.side = i % 2 ? 1 : -1; }); }
    const narrow = this.w < 620;
    for (const side of [-1, 1]) {
      const col = list.filter((l) => l.side === side).sort((a, b) => a.ay - b.ay);
      const gap = narrow ? 30 : 26;
      let y = 26;
      col.forEach((l) => { l.ly = Math.max(l.ay, y); y = l.ly + gap; });
      const over = y - gap - (this.h - 20);
      if (over > 0) col.forEach((l) => { l.ly -= over; });
    }
    x.font = '500 11px "IBM Plex Mono", ui-monospace, monospace'; x.textBaseline = 'middle';
    for (const l of list) {
      let name = GROUPS[l.g].name; if (narrow) name = name.split(' · ')[0];
      const hot = l.g === this.selected || l.g === this.hover;
      const tw = x.measureText(name).width + 16;
      const lx = l.side > 0 ? this.w - 16 - tw : 16;
      const ex = l.side > 0 ? lx - 6 : lx + tw + 6;
      x.strokeStyle = hot ? 'rgba(124,196,224,0.95)' : 'rgba(205,212,218,0.38)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(l.ax, l.ay); x.lineTo(ex - l.side * 18, l.ly); x.lineTo(ex, l.ly); x.stroke();
      x.fillStyle = hot ? '#7cc4e0' : '#cfd5da'; x.beginPath(); x.arc(l.ax, l.ay, hot ? 3 : 2.2, 0, Math.PI * 2); x.fill();
      x.fillStyle = hot ? 'rgba(18,30,38,0.92)' : 'rgba(13,15,17,0.78)'; roundRect(x, lx, l.ly - 10, tw, 20, 3); x.fill();
      x.strokeStyle = hot ? 'rgba(124,196,224,0.9)' : 'rgba(205,212,218,0.18)'; roundRect(x, lx, l.ly - 10, tw, 20, 3); x.stroke();
      x.fillStyle = hot ? '#e8f4fa' : '#d9dee2'; x.fillText(name, lx + 8, l.ly + 0.5);
    }
    if (mode === 'torque') this.drawTorquePath(x, now);
  }

  /** Schematic torque path — deliberately not the physical routing. */
  private drawTorquePath(x: CanvasRenderingContext2D, now: number) {
    const chain: GroupKey[] = ['pcb', 'coils', 'magMain', 'rotor', 'sun', 'planets', 'carrier'];
    const fixed: Partial<Record<GroupKey, [number, number, number]>> = {
      coils: [-4.6, 0, 0], magMain: [-4.6, 0, 0], rotor: [-2.6, -1.8, 0], planets: [-1.9, 0, 0],
      carrier: [-0.8, 1.6, 0], pcb: [-1.6, -2.6, 0], sun: [-0.4, -0.4, 0],
    };
    const pts = chain.map((g) => {
      const f = fixed[g];
      const c = f ? new THREE.Vector3(...f) : this.gbox[g]?.getCenter(new THREE.Vector3());
      return c ? this.project(c) : null;
    });
    const step = this.torqueStep || 1, upto = [1, 2, 3, 5, 6][step - 1];
    x.lineWidth = 2; x.setLineDash([6, 6]); x.lineDashOffset = motion.reduced ? 0 : -((now / 40) % 12);
    for (let i = 0; i < upto && i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; if (!a || !b) continue;
      x.strokeStyle = i >= 4 ? 'rgba(229,154,92,0.95)' : 'rgba(124,196,224,0.95)';
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    }
    x.setLineDash([]);
    for (let j = 0; j <= upto && j < pts.length; j++) {
      const q = pts[j]; if (!q) continue;
      x.fillStyle = j >= 5 ? '#e59a5c' : '#7cc4e0'; x.beginPath(); x.arc(q.x, q.y, 4, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#0d0f11'; x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
      x.fillText(String(j + 1), q.x, q.y + 0.5); x.textAlign = 'left';
    }
    x.font = '500 10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(205,212,218,0.6)';
    x.fillText('SCHEMATIC PATH — not physical routing', 16, this.h - 16);
  }
}

function roundRect(x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number, r: number) {
  x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r);
  x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h);
  x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath();
}
