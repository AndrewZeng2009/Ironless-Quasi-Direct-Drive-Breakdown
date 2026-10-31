import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bvh, PerformanceMonitor } from '@react-three/drei';
import { Actuator } from './Actuator';
import { loadModel, type ModelData } from './model';
import { shadowTexture, studioEnvironment } from './environment';
import type { ViewerEngine } from './engine';

interface Props {
  engine: ViewerEngine;
  /** Called when the model has loaded or failed. */
  onStatus?: (s: 'ready' | 'error', msg?: string) => void;
  /** Accessible label for the canvas. */
  label: string;
  /** Focusable, keyboard-controlled viewer (explorer) vs decorative image (hero). */
  interactive: boolean;
  /** Canvas for 2D leader labels drawn by the engine. */
  overlay?: boolean;
  children?: ReactNode;
}

/** Drives the engine every frame and wires lights, environment and contact shadow. */
function Rig({ engine }: { engine: ViewerEngine }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const key = useRef<THREE.DirectionalLight>(null);
  const shadow = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2; m.scale.set(19, 19, 1); m.position.y = -4.1; m.renderOrder = -1;
    return m;
  }, []);

  useEffect(() => {
    scene.environment = studioEnvironment(gl);
    engine.gl = gl; engine.camera = camera; engine.shadow = shadow;
    if (engine.ready) shadow.position.y = engine.allBox.min.y - 0.25;
    if (interactiveCanvas(engine)) engine.bindInput(gl.domElement);
    return () => engine.dispose();
  }, [engine, gl, scene, camera, shadow]);

  useEffect(() => { engine.key = key.current; }, [engine]);
  useEffect(() => { engine.resizeOverlay(size.width, size.height); }, [engine, size.width, size.height]);

  // On-demand rendering: draw only when something changed or is still moving.
  // The hero's slow idle rotation is capped at ~30 fps to leave headroom for scrolling.
  const invalidate = useThree((s) => s.invalidate);
  const heroTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    engine.wake = () => invalidate();
    invalidate();
    return () => {
      engine.wake = () => {};
      if (heroTimer.current) clearTimeout(heroTimer.current);
    };
  }, [engine, invalidate]);

  useFrame((_, delta) => {
    const now = performance.now();
    engine.frame(now, delta);
    engine.drawOverlay(now);
    if (!engine.needsAnotherFrame()) return;
    if (engine.kind === 'hero') {
      // ~30 fps idle rotation, paused while the page is actively scrolling so scrolling stays smooth
      const scrolling = performance.now() - lastScrollAt < 200;
      if (!heroTimer.current) heroTimer.current = setTimeout(() => { heroTimer.current = null; invalidate(); }, scrolling ? 200 : 33);
    } else {
      invalidate();
    }
  });

  return (
    <>
      <directionalLight ref={key} color={0xffffff} intensity={1.6} position={[8, 14, 10]} />
      <directionalLight color={0xbfd8ea} intensity={0.9} position={[-10, 4, -12]} />
      <hemisphereLight args={[0xdfe6ec, 0x2a3036, 0.35]} />
      <primitive object={shadow} />
    </>
  );
}

const interactiveCanvas = (e: ViewerEngine) => e.kind === 'explorer';

let lastScrollAt = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });
}
const MAX_DPR = 1.5;

/** One WebGL canvas per view. Rendering pauses while the canvas is off-screen. */
export function ViewerCanvas({ engine, onStatus, label, interactive, overlay, children }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<ModelData | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [webgl, setWebgl] = useState(true);
  // Resolution: at most 1.5× (sharp on high-DPI screens at a fraction of the cost of 2×),
  // dropping to 1× if the frame rate can't keep up.
  const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  // the hero is decorative: 1x is plenty and halves its pixel cost on high-DPI screens
  const maxDpr = engine.kind === 'hero' ? 1 : Math.min(deviceDpr, MAX_DPR);
  // 4x MSAA is expensive and adds little once the screen is high-density; keep it on 1x screens
  // and for the 1x hero, where jagged edges would show
  const antialias = engine.kind === 'hero' || deviceDpr < 1.5;
  const [dpr, setDpr] = useState(maxDpr);

  useEffect(() => {
    let alive = true;
    loadModel()
      .then((m) => { if (alive) setModel(m); })
      .catch((e) => { console.error(e); if (alive) onStatus?.('error', 'Could not load the model file'); });
    return () => { alive = false; };
  }, [onStatus]);

  // Pause rendering while off-screen. The decision uses the element's real position: the observer
  // and scroll/resize events only trigger a re-check, because an observer's reported state can go
  // stale (seen after full-page screenshots), which would leave the viewer frozen.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const MARGIN = 120;
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      setOnScreen(r.bottom > -MARGIN && r.top < window.innerHeight + MARGIN && r.width > 0);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(schedule, { rootMargin: MARGIN + 'px' }) : null;
    io?.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    el.addEventListener('pointerdown', check);
    el.addEventListener('focusin', check);
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      el.removeEventListener('pointerdown', check);
      el.removeEventListener('focusin', check);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => { engine.overlay = overlayRef.current; }, [engine, overlay]);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      if (!(c.getContext('webgl2') || c.getContext('webgl'))) { setWebgl(false); onStatus?.('error', 'WebGL is not available here'); }
    } catch { setWebgl(false); onStatus?.('error', 'WebGL is not available here'); }
  }, [onStatus]);

  return (
    <div ref={wrap} className="viewer-canvas" data-onscreen={onScreen ? '1' : '0'}>
      {webgl && (
        <Canvas
          frameloop={onScreen ? 'demand' : 'never'}
          dpr={dpr}
          // don't re-measure (and redraw) on every page scroll; the engine reads the canvas
          // position itself when it needs it
          resize={{ scroll: false, debounce: { scroll: 0, resize: 50 } }}
          camera={{ fov: 30, near: 0.5, far: 400, position: [0, 0, 34] }}
          gl={{ antialias, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.localClippingEnabled = true;
            gl.setClearColor(0x000000, 0);
            const el = gl.domElement;
            el.setAttribute('aria-label', label);
            if (interactive) {
              el.tabIndex = 0;
              el.setAttribute('role', 'application');
              el.setAttribute('aria-roledescription', '3D viewer');
              el.style.cursor = 'grab';
            } else {
              el.setAttribute('role', 'img');
            }
            el.dataset.testid = interactive ? 'explorer-canvas' : 'hero-canvas';
          }}
        >
          <Rig engine={engine} />
          {/* hero renders at ~30 fps by design, so only the explorer is monitored */}
          {interactive && (
            <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} flipflops={3} onFallback={() => setDpr(1)} />
          )}
          {model && (interactive ? (
            <Bvh firstHitOnly={false}>
              <Actuator model={model} engine={engine} />
            </Bvh>
          ) : (
            <Actuator model={model} engine={engine} />
          ))}
        </Canvas>
      )}
      {overlay && <canvas ref={overlayRef} className="viewer-overlay" aria-hidden="true" />}
      {children}
    </div>
  );
}
