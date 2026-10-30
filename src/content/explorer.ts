/* Explorer copy: modes, camera presets, torque steps. Verbatim from the prototype. */
import { stageTitle } from './parts';

export type Mode = 'explore' | 'sequence' | 'gearbox' | 'motor' | 'torque';
export type ViewName =
  | 'iso' | 'output' | 'controller' | 'side' | 'section' | 'exploded' | 'gearbox' | 'motor' | 'torque' | 'hero';

export const TABS: [Mode, string][] = [
  ['explore', 'Explore'],
  ['sequence', 'Build sequence'],
  ['gearbox', 'Gearbox'],
  ['motor', 'Motor section'],
  ['torque', 'Follow the torque'],
];

export function viewButtons(mode: Mode): [ViewName, string][] {
  if (mode === 'gearbox') return [['gearbox', 'Top'], ['side', 'Side'], ['iso', 'Iso']];
  if (mode === 'motor') return [['motor', 'Axial'], ['iso', 'Iso']];
  return [['iso', 'Iso'], ['output', 'Output face'], ['controller', 'Controller side'], ['side', 'Side']];
}

export interface TorqueStep { short: string; tag: string; title: string; body: string }

export const TORQUE_STEPS: TorqueStep[] = [
  { short: 'Command', tag: 'Electrical', title: 'Command and commutation', body: 'The MKS XDrive Mini (an ODrive 3.6 derivative) runs field-oriented control. Its config reads an SPI absolute encoder at 16 384 counts, facing a diametric magnet on the rotor axis, and limits current to 50 A.' },
  { short: 'Coils', tag: 'Electrical', title: 'Current through 36 coils', body: 'Three phases are spread over the 36 teeth in the AabBCcaABbcC pattern. Each tooth carries 6 turns of six parallel 0.4 mm strands.' },
  { short: 'Air gap', tag: 'Electromagnetic', title: 'Force across a 0.7 mm gap', body: 'The rotating stator field pulls on 84 magnets. The Halbach arrangement concentrates flux toward the stator without iron behind the magnets.' },
  { short: 'Reduction', tag: 'Mechanical', title: 'Rotor turns the sun', body: 'Rotor and 6-lobe sun turn together. Three 15-lobe planets roll around the inside of the fixed 36-lobe ring.' },
  { short: 'Output', tag: 'Mechanical', title: 'Carrier delivers ≈7× torque', body: 'The planet carrier turns at one-seventh of rotor speed with up to seven times the torque, before losses, and drives the output face.' },
];

export function modeInfo(mode: Mode, stage: number, tstep: number): [string, string] {
  switch (mode) {
    case 'explore': return ['Explore', 'Full assembly. Select parts, explode along the axis, or cut a half-section.'];
    case 'sequence': return ['Build sequence · stage ' + stage + ' of 6', stageTitle(stage) + ' — the newest parts slide into place.'];
    case 'gearbox': return ['Gearbox · sun in, ring fixed, carrier out', 'Blue sun = input, orange carrier = output. Lid off hides the upper ring half and carrier plate.'];
    case 'motor': return ['Motor · axial cut at mid-plane', 'Magnets tinted by assumed polarity; coils glow with phase current (illustrative timing).'];
    case 'torque': return ['Follow the torque · step ' + tstep + ' of 5', TORQUE_STEPS[tstep - 1].title];
  }
}

export const EXPLORER_COPY = {
  kicker: '01 — Interactive teardown',
  title: 'Take it apart.',
  intro: 'Every part below comes from the original CAD file, placed where the author put it. Drag to orbit, select a part to read what it does, explode the stack along the motor axis, or cut it in half.',
  keys: 'Drag orbit · right-drag / shift pan · click to select · click the model, then scroll to zoom · keys: ← → ↑ ↓, + −, E explode, S section, R reset, Esc clear',
  canvasLabel: 'Interactive 3D model of the actuator. Use arrow keys to orbit, plus and minus to zoom, E to explode, S for section, R to reset.',
  emptyTitle: 'Component detail',
  emptyBody: 'Click any part in the model or the list below. Each entry states what the part does, what it is made of and where the claim comes from: the article, the bill of materials, the repository, the CAD geometry itself, or our own inference.',
  emptyNote: 'Part names are ours: the display mesh carries no body names. The MKS XDrive Mini is a rebuilt model (Makerbase drawing + product photos), replacing the simplified board in the original CAD.',
  geometryNote: 'Geometry: Fusion 360 display tessellation extracted from the shared .f3d file and decimated for the web (~420k triangles rendered). Gearbox and controller sub-assembly placement was reconstructed from the file’s scene graph and checked visually against the author’s preview render. The controller is not from the CAD: it was rebuilt from Makerbase’s dimension drawing and product photos, and its stock screw terminals are hidden by default (use the eye icon). Explode directions, part grouping and the build sequence are our interpretation, not the author’s documented procedure.',
};
