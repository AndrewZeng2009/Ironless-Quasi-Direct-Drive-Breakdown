import { create } from 'zustand';
import { GROUP_KEYS, DEFAULT_HIDDEN, type GroupKey } from '../content/parts';
import type { Mode } from '../content/explorer';
import { ViewerEngine, type Visibility } from './engine';
import { motion } from './motion';

/** Shared UI state of the Explorer viewer. The engine is the source of truth for animation;
    it pushes discrete changes here so React only re-renders on real UI changes. */
export interface ExplorerState {
  status: 'loading' | 'ready' | 'error';
  loadMsg: string;
  mode: Mode;
  selected: GroupKey | null;
  hover: GroupKey | null;
  vis: Visibility;
  isolate: GroupKey | null;
  stage: number;
  torqueStep: number;
  section: boolean;
  labels: boolean;
  playing: boolean;
  openTop: boolean;
  exploded: boolean;
  seqPlaying: boolean;
  wheelHint: number;
  setMode: (m: Mode) => void;
  setStatus: (s: ExplorerState['status'], msg?: string) => void;
}

const initialVis = () => {
  const v = {} as Visibility;
  for (const g of GROUP_KEYS) v[g] = !DEFAULT_HIDDEN[g];
  return v;
};

export const useExplorer = create<ExplorerState>((set, get) => ({
  status: 'loading',
  loadMsg: 'Loading CAD geometry…',
  mode: 'explore',
  selected: null,
  hover: null,
  vis: initialVis(),
  isolate: null,
  stage: 1,
  torqueStep: 1,
  section: false,
  labels: true,
  playing: !motion.reduced,
  openTop: true,
  exploded: false,
  seqPlaying: false,
  wheelHint: 0,
  setStatus: (status, msg) => set({ status, ...(msg ? { loadMsg: msg } : {}) }),
  setMode: (m) => {
    stopSequence();
    const patch: Partial<ExplorerState> = { mode: m, seqPlaying: false };
    if (m !== 'explore') patch.exploded = false;
    set(patch);
    explorerEngine.setMode(m);
    if (get().mode === m && m === 'torque') explorerEngine.setTorqueStep(get().torqueStep || 1);
  },
}));

/** The single Explorer engine instance; created eagerly so UI handlers can call it before the model loads. */
export const explorerEngine = new ViewerEngine('explorer', {
  onSelect: (g) => useExplorer.setState({ selected: g }),
  onHover: (g) => useExplorer.setState({ hover: g }),
  onVisibility: (vis, isolate) => useExplorer.setState({ vis, isolate }),
  onStage: (n) => useExplorer.setState({ stage: n }),
  onTorqueStep: (n) => useExplorer.setState({ torqueStep: n }),
  onSection: (on) => useExplorer.setState({ section: on }),
  onPlaying: (on) => useExplorer.setState({ playing: on }),
  onOpenTop: (on) => useExplorer.setState({ openTop: on }),
  onExplodeTarget: (to) => useExplorer.setState({ exploded: to > 0.5 }),
  onReady: () => { performance.mark('qdd-explorer-ready'); useExplorer.setState({ status: 'ready' }); },
  onWheelHint: () => useExplorer.setState({ wheelHint: Date.now() }),
});

// Test/debug hook (used by the Playwright smoke tests to wait for the model).
if (typeof window !== 'undefined') {
  (window as unknown as { __qdd: unknown }).__qdd = { engine: explorerEngine, store: useExplorer };
}

// ---- build-sequence autoplay (2.4 s per stage, as in the prototype)
let seqTimer: ReturnType<typeof setInterval> | null = null;
export function stopSequence() {
  if (seqTimer) clearInterval(seqTimer);
  seqTimer = null;
  if (useExplorer.getState().seqPlaying) useExplorer.setState({ seqPlaying: false });
}
export function toggleSequence() {
  if (useExplorer.getState().seqPlaying) { stopSequence(); return; }
  if (useExplorer.getState().stage >= 6) explorerEngine.setStage(1);
  useExplorer.setState({ seqPlaying: true });
  seqTimer = setInterval(() => {
    const s = useExplorer.getState().stage;
    if (s >= 6) { stopSequence(); return; }
    explorerEngine.setStage(s + 1);
  }, 2400);
}

/** Jump to Explore, explode, and frame one group (used by the Assembly section). */
export function goToGroup(g: GroupKey) {
  if (useExplorer.getState().mode !== 'explore') useExplorer.getState().setMode('explore');
  explorerEngine.showAll();
  explorerEngine.animateExplode(1, 1300);
  setTimeout(() => explorerEngine.focus(g), 700);
}
