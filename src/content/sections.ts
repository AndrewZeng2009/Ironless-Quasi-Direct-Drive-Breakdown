/* Copy and figures for the page sections, verbatim from reference/prototype/Main.dc.html.
   Every figure carries its evidence qualifier. Only sources in BUILD_BRIEF.md §7 are used. */
import type { GroupKey } from './parts';

export const ARTICLE_URL = 'https://cadenkraft.com/ironless-cycloidal-planetary-actuator/';
export const REPO_URL = 'https://github.com/CKraft11/Ironless-QDD-Actuator';

// ------------------------------------------------------------------ 1 Hero
export const HERO = {
  kicker: 'Open-source robotics actuator · 2025',
  lede: 'A low-cost quasi-direct-drive actuator built around a 3D-printed rotor carrying a Halbach magnet array — no iron back-iron — and a 7:1 planetary gearbox with cycloidal “lobe” teeth. Designed, built and documented by Caden Kraft; taken apart here from his original Fusion 360 model.',
  canvasLabel: 'Slowly rotating 3D render of the complete actuator',
  renderNote: 'Real-time render · display mesh from the author’s CAD files',
  sizeNote: 'Ø ≈121 mm · 728 g (reported)',
};

export interface HeroStat { v: string; u: string; l: string; q: string }
export const HERO_STATS: HeroStat[] = [
  { v: '29.4', u: 'N·m', l: 'Peak holding torque', q: 'Reported · one test at the 50 A controller limit' },
  { v: '728', u: 'g', l: 'Actuator mass', q: 'Reported' },
  { v: '40.4', u: 'N·m/kg', l: 'Torque-to-weight', q: 'Reported · 29.4 ÷ 0.728' },
  { v: '7:1', u: '', l: 'Cycloidal planetary', q: 'Design · 6 / 15 / 36 lobes' },
  { v: '~$40', u: '/ $70', l: 'Actuator / with controller', q: 'Historical estimate · pre-tariff pricing' },
];

// ------------------------------------------------------------------ 3 Exploded assembly
export const STACK_COPY = {
  kicker: '02 — Exploded assembly',
  title: 'A pancake, built inside out.',
  p1: 'It is an outrunner: the stator’s teeth point outward and the printed rotor wraps around them. The gearbox does not sit beside the motor — it lives inside the stator’s 78 mm bore, with the ring gear keyed into the stator yoke at mid-plane. The article describes the gearbox module running “through the center of the actuator” with the stator assembled into its clam-shell.',
  p2: 'The list runs along the motor axis from the output face down to the controller. Pick a layer to explode the model and frame it.',
  cta: 'Play the six-stage build →',
  listLabel: 'Axial stack, output face to controller',
};
export const STACK_FACTS: { k: string; v: string; q: string }[] = [
  { k: 'Air gap', v: '0.70 mm', q: 'CAD: stator Ø100.0 → magnets Ø101.4 · article: 0.7 mm' },
  { k: 'Envelope', v: 'Ø121 × 57 mm', q: 'Measured from the CAD body, incl. controller cover and centre bolt' },
  { k: 'Bodies in model', v: '287 → 750', q: 'Unique bodies → placed instances (fasteners, magnets, bearings repeat)' },
  { k: 'BOM lines', v: '18', q: 'Bought parts in BOM.xlsx; everything else is printed' },
];
export interface StackRow { name: string; note: string; group: GroupKey; bar: number; col: string }
export const STACK: StackRow[] = [
  { name: 'M4 shoulder bolt & spacer', note: 'Centre bolt through sun and rotor hub', group: 'axle', bar: 18, col: '#55585d' },
  { name: 'Output clamshell frame', note: 'Ø115 mm flange · 8× M2.5 countersunk into heat-set inserts', group: 'frame', bar: 92, col: '#454b52' },
  { name: '6710 + 6805 bearings', note: 'Upper pair: carrier and sun support (BOM 2 + 2)', group: 'b6710', bar: 52, col: '#c9ced3' },
  { name: 'Planet carrier · output', note: 'Two plates, three spacer blocks, M2.5 + M3 inserts', group: 'carrier', bar: 54, col: '#e59a5c' },
  { name: 'Ring gear ×2 halves', note: 'Double-helical, 36 lobes, keyed into the stator bore', group: 'ring', bar: 66, col: '#565d65' },
  { name: 'Planets ×3 + sun', note: '15-lobe planets on 5×12 pins and 5×14×5 bearings; 6-lobe sun', group: 'planets', bar: 60, col: '#7c858e' },
  { name: 'Stator + 36 coils', note: '10010 stator, teeth outward, Ø100 mm', group: 'stator', bar: 80, col: '#c47b4f' },
  { name: 'Ironless rotor + 84 magnets', note: 'Printed ring around the stator, 0.7 mm gap', group: 'rotor', bar: 90, col: '#d3d7db' },
  { name: 'Lower clamshell ring', note: 'Retains the lower ring half; M3×6 and M2 nuts', group: 'retainer', bar: 66, col: '#454b52' },
  { name: 'Encoder magnet & holder', note: 'On the rotor axis, read through the board', group: 'encoder', bar: 14, col: '#6b737c' },
  { name: 'Main housing', note: 'Ventilated printed shell around the rotor', group: 'housing', bar: 98, col: '#2f343a' },
  { name: 'Encoder plate & standoffs', note: 'Ø10.5 mm window over the AS5047P, facing the motor', group: 'encplate', bar: 52, col: '#3a4046' },
  { name: 'MKS XDrive Mini', note: '63 × 58 mm board, rebuilt from the Makerbase drawing and photos', group: 'pcb', bar: 52, col: '#2d3a3f' },
  { name: 'Controller cover + XT60', note: 'Closes the electronics bay', group: 'cover', bar: 54, col: '#2f343a' },
];

// ------------------------------------------------------------------ 4 Motor
export const MOTOR_COPY = {
  kicker: '03 — Inside the ironless motor',
  title: '36 slots, 42 poles, no back-iron.',
  lede: 'A conventional outrunner bonds its magnets to a steel ring that carries flux from pole to pole. Here the ring is printed plastic. Instead, 42 radially magnetised N52 blocks alternate with 42 thin N50 blocks magnetised sideways — a Halbach arrangement that pushes field toward the stator and cancels much of it on the outside.',
  svgLabel: 'Cross-section through the motor mid-plane: 36-tooth stator with copper coils inside, 84 magnets around it, separated by a 0.7 mm air gap',
  insetLabel: 'Zoomed detail of the 0.70 millimetre air gap between stator tooth tips and magnets',
  caption: 'Stator and air gap: section of the CAD at the motor mid-plane. Magnets: drawn at their CAD angles and radii, simplified to rectangles. Rotor ring simplified.',
  note: 'Phase layout follows the repository’s 36N42P winding scheme (AabBCcaABbcC ×3, winding factor 0.933, 252 cogging steps per turn). Its rotational alignment to the CAD is not documented and is shown illustratively. Magnet polarities are not stated in the sources; the inward-strong Halbach sequence shown is our inference from the design intent. The flux sketch is hand-drawn to show the idea — it is not an FEMM result.',
  cmpTitle: 'What the back-iron would have bought',
  cmpLede: 'The author simulated static torque in FEMM for four rotor variants (three phase pairs each, fixed angle) and kept the Halbach, ironless one. Select a variant.',
  femmTitle: 'FEMM average static torque by rotor configuration',
  femmUnit: 'N·m · comparative only',
  femmNote: 'Source: article table. The author notes these torques “are not really representative of the actual torque of the actuator” and are only a point of comparison; he also invites feedback on the simulations.',
};
/** Magnet and coil angles (degrees) measured from the CAD. */
export const MAIN_ANGLES = [-178.25, -169.67, -161.1, -152.53, -143.96, -135.39, -126.82, -118.25, -109.68, -101.11, -92.54, -84.07, -75.5, -66.93, -58.36, -49.79, -41.22, -32.65, -24.08, -15.5, -6.93, 1.64, 10.21, 18.78, 27.35, 35.93, 44.5, 53.07, 61.64, 70.21, 78.79, 87.36, 96.03, 104.61, 113.18, 121.75, 130.32, 138.9, 147.47, 156.04, 164.61, 173.18];
export const HAL_ANGLES = [-174.0, -165.43, -156.86, -148.28, -139.71, -131.14, -122.57, -114.0, -105.43, -96.86, -88.32, -79.75, -71.18, -62.61, -54.04, -45.46, -36.89, -28.32, -19.75, -11.18, -2.61, 5.96, 14.53, 23.11, 31.68, 40.25, 48.82, 57.39, 65.97, 74.54, 83.11, 91.71, 100.28, 108.86, 117.43, 126.0, 134.57, 143.14, 151.72, 160.29, 168.86, 177.43];
export const COIL_ANGLES = [-90.01, -80.04, -70.08, -60.06, -50.05, -40.08, -30.07, -20.06, -10.03, 0.0, 9.97, 19.94, 29.87, 39.94, 49.97, 59.93, 69.96, 79.94, 89.9, 99.96, 109.97, 119.93, 129.95, 139.93, 149.93, 159.94, 169.94, 179.94, 189.91, 199.92, 209.92, 219.93, 229.92, 239.95, 249.94, 259.97];
export const PHASE_COLORS: Record<'A' | 'B' | 'C', string> = { A: '#e08a52', B: '#5fa9cc', C: '#d8cfb8' };

export type RotorKey = 'hi' | 'hn' | 'ci' | 'cn';
export interface RotorVariant { key: RotorKey; name: string; val: string; iron: boolean; halbach: boolean; title: string; body: string }
export const ROTORS: RotorVariant[] = [
  { key: 'hi', name: 'Halbach + iron', val: '1.017', iron: true, halbach: true, title: 'Halbach with back-iron · 1.017 N·m (100%)', body: 'The strongest variant in the simulation. Iron behind a Halbach array adds relatively little, because the array already cancels most of the field on its back side — and it adds mass and rotational inertia to the rotor.' },
  { key: 'hn', name: 'Halbach, ironless', val: '0.929 · chosen', iron: false, halbach: true, title: 'Halbach, ironless · 0.929 N·m (91.4%) — the built design', body: 'Keeps 91.4% of the best simulated torque with a plastic rotor. The author’s stated reasons: avoid the iron ring, keep performance, and cut rotational inertia for quicker direction changes. Cost: 84 magnets instead of 42 and a fiddlier assembly.' },
  { key: 'ci', name: 'Conventional + iron', val: '0.928', iron: true, halbach: false, title: 'Conventional with back-iron · 0.928 N·m (91.3%)', body: 'The standard outrunner recipe: alternating radial magnets bonded to a steel ring that closes the flux path. Practically tied with the ironless Halbach in this simulation, but it needs a steel rotor ring.' },
  { key: 'cn', name: 'Conventional, ironless', val: '0.737', iron: false, halbach: false, title: 'Conventional, ironless · 0.737 N·m (72.5%)', body: 'Without iron or the Halbach magnets, field leaks equally to both sides and the stator sees much less of it — the weakest of the four, which is why the Halbach magnets earn their place.' },
];
export const FEMM: { name: string; v: number; p: string; key: RotorKey }[] = [
  { name: 'Halbach + iron', v: 1.017, p: '100.0%', key: 'hi' },
  { name: 'Halbach, ironless', v: 0.929, p: '91.4%', key: 'hn' },
  { name: 'Conventional + iron', v: 0.928, p: '91.3%', key: 'ci' },
  { name: 'Conventional, ironless', v: 0.737, p: '72.5%', key: 'cn' },
];

// ------------------------------------------------------------------ 5 Gearbox
export const GEAR_COPY = {
  kicker: '04 — The 7:1 cycloidal planetary',
  title: 'Lobes, not teeth.',
  lede: 'A standard planetary layout — sun in, ring fixed, carrier out — but every gear outline is a continuous wave of cycloidal lobes generated with the author’s modified version of Eelco Hoogendoorn’s pygeartrain.',
  lobeNote: 'Lobe counts were measured from the CAD geometry (the article gives only the ratio). The ring is modelled as two halves with opposite helix hands, i.e. a double-helical (herringbone) set; the article shows the script can export helical and double-helical variants.',
  whyTitle: 'Why lobes suit a printer — the author’s reasoning',
  backlashNote: '“No backlash” and “no perceptible backlash” are the author’s statements from design intent and hand-feel after testing; no backlash measurement is published.',
  svgLabel: 'Animated mid-plane section of the gearbox: blue 6-lobe sun turns seven times for each turn of the orange planet carrier, while three 15-lobe planets roll inside the fixed 36-lobe ring',
  figNote: 'Profiles are sections through the CAD at one plane (helical lobes twist with depth). Kinematics are exact for the measured lobe counts: the sun turns 7× per carrier turn, each planet spins −2.4× relative to the carrier. The black dots mark rotation; nothing here models contact forces, deflection or clearance.',
};
export const GEAR_WHY: { n: string; t: string }[] = [
  { n: '01', t: 'Spur teeth need sharp edges, but a round nozzle leaves a corner radius on every printed path — the tooth tips and roots never come out true.' },
  { n: '02', t: 'Small printed spur teeth tend to shear off at the base; a lobe is a broad, rounded section with no notch at its root.' },
  { n: '03', t: 'The “teeth” become one continuous wavy outline, which a 3D printer reproduces easily.' },
  { n: '04', t: 'The profile gives constant contact with no backlash (the author’s design claim). After several minutes at about 30 N·m he reports no perceptible backlash.' },
];
/** Planet centres in the SVG top view (x, y = CAD x, z in mm). */
export const PLANET_POS: [number, number][] = [[19.853, -0.937], [-9.115, 17.662], [-10.739, -16.725]];

// ------------------------------------------------------------------ 6 Torque
export const TORQUE_COPY = {
  kicker: '05 — Follow the torque',
  title: 'From battery to output flange in five steps.',
  cta: 'Play in the 3D cutaway',
  note: 'Schematic: wiring between the controller and the coils is not modelled in the CAD, so electrical steps are shown as a path, not as physical routing. “×7 torque” is the ideal ratio before friction and other losses; the article does not report gearbox efficiency.',
};
export const FLOW: [string, number][] = [
  ['Battery / PSU', 1], ['power connector', 1], ['MKS XDrive Mini · FOC', 1], ['phases A · B · C', 2], ['36 coils', 2],
  ['air-gap force on 84 magnets', 3], ['rotor + sun · 1×', 4], ['3 planets', 4], ['fixed ring', 4], ['carrier · ≈7× torque', 5], ['load', 5],
];

// ------------------------------------------------------------------ 7 Performance
export const PERF_COPY = {
  kicker: '06 — Performance & trade-offs',
  title: 'What was measured, and under what conditions.',
  lede: 'Every figure is tagged by where it comes from. 29.4 N·m is one peak holding test at the controller’s 50 A limit — not a continuous rating, and not a guarantee for other builds.',
  connectTitle: 'How the headline numbers connect',
  bomTitle: 'Where the money goes (BOM, priced 4/22/25)',
  bomNote: 'Line items × quantities from BOM.xlsx, summed here: $72.62 with controller, $42.63 without. The BOM has no filament line. The author notes parts were ordered before US tariffs took effect, so prices and availability may differ today.',
  tradesTitle: 'Trade-offs, stated plainly',
};
export const BIG_STATS: { v: string; u: string; l: string; q: string; tag: string; col: string }[] = [
  { v: '29.4', u: 'N·m', l: 'Peak holding torque', q: 'Reported test result at the 50 A current limit. Not a continuous or rated torque.', tag: 'Measured · reported', col: '#7cc4e0' },
  { v: '728', u: 'g', l: 'Actuator mass', q: 'Reported in the article for the built actuator.', tag: 'Measured · reported', col: '#7cc4e0' },
  { v: '40.38', u: 'N·m/kg', l: 'Torque-to-weight', q: 'Derived from the two figures above.', tag: 'Calculated', col: '#cfd5da' },
  { v: '$40', u: '/ $70', l: 'Actuator / with controller', q: 'Historical, rounded, pre-tariff. Varies with supply.', tag: 'Historical estimate', col: '#e59a5c' },
];
export type Evidence = 'measured' | 'calculated' | 'simulated' | 'design' | 'estimate';
export const EVIDENCE_COLORS: Record<Evidence, string> = { measured: '#7cc4e0', calculated: '#cfd5da', simulated: '#b9a6e0', design: '#9fd3a3', estimate: '#e59a5c' };
export const EVIDENCE_CHIPS: [Evidence | 'all', string][] = [['all', 'All'], ['measured', 'Measured'], ['calculated', 'Calculated'], ['simulated', 'Simulated'], ['design', 'Design'], ['estimate', 'Estimate']];
export const FIGURES: { v: string; l: string; ev: Evidence; tag: string; q: string }[] = [
  { v: '29.4 N·m', l: 'Peak holding torque', ev: 'measured', tag: 'Measured', q: '117.5 N on a force gauge at a 250 mm printed arm; 13S Audi e-tron module; stopped at the controller’s 50 A limit. Coil surface ≈78 °C. Single reported test.' },
  { v: '14 N·m', l: 'Peak holding torque, lab supply', ev: 'measured', tag: 'Measured', q: 'Limited by a 24 V, 25 A Meanwell supply. Already above the 10 N·m goal.' },
  { v: '≈79', l: 'Kᵥ (rpm/V)', ev: 'measured', tag: 'Measured', q: 'Back-driven with a drill at known speed, voltage read from one phase. Indirect method.' },
  { v: '728 g', l: 'Actuator mass', ev: 'measured', tag: 'Measured', q: 'As reported in the article.' },
  { v: '62.4–63.3 mΩ', l: 'Phase resistance (LCR)', ev: 'measured', tag: 'Measured', q: 'A 62.36 · B 62.42 · C 63.31 mΩ; inductance 33.04–33.92 µH. Article quotes ±0.76% / ±1.31% matching.' },
  { v: '40.4 N·m/kg', l: 'Torque-to-weight', ev: 'calculated', tag: 'Calculated', q: '29.4 ÷ 0.728 = 40.38 (article states 40.38).' },
  { v: '$2.47 /N·m', l: 'Cost per newton-metre', ev: 'calculated', tag: 'Calculated', q: 'Article figure; equals the summed BOM ($72.62) ÷ 29.4 N·m.' },
  { v: '91.4%', l: 'Ironless Halbach vs best variant', ev: 'simulated', tag: 'Simulated', q: 'FEMM average static torque, comparative only (0.929 vs 1.017).' },
  { v: '7 : 1', l: 'Gear reduction', ev: 'design', tag: 'Design', q: 'Chosen ratio; lobe counts 6 / 15 / 36 measured from CAD.' },
  { v: '10 N·m · <$80', l: 'Original goals', ev: 'design', tag: 'Design goal', q: 'Holding-torque and per-actuator cost targets set at the start of the project.' },
  { v: '~$40 / ~$70', l: 'Actuator / with controller', ev: 'estimate', tag: 'Historical est.', q: 'Rounded article figures; BOM priced 4/22/25, before US tariffs.' },
];
export const BOM: [string, number][] = [
  ['MKS XDrive Mini', 29.99], ['10010 stator', 17.63], ['N50 Halbach ×42', 5.88], ['N52 main ×42', 5.0], ['6710 bearings ×2', 4.52],
  ['6805 bearings ×2', 2.58], ['5×14×5 bearings ×6', 1.92], ['Magnet wire', 1.2], ['Pins, fasteners, inserts', 3.9],
];
export const TRADES: { title: string; plus: string; minus: string; src: string }[] = [
  { title: 'Cost', plus: 'Summed BOM is $72.62 with controller; the stator and controller are about two-thirds of it, so the printed design itself is cheap.', minus: 'Prices are April 2025, pre-tariff. Filament, printer time and failed prints are not in the BOM.', src: 'BOM.xlsx · article' },
  { title: 'Printable construction', plus: 'Every custom part is FFF-printable; threads come from heat-set inserts, not machining.', minus: 'Plastic creeps. The README warns a PLA rotor will creep under magnetic load: print it at 100% infill in a stiff, low-creep engineering plastic.', src: 'README · article' },
  { title: 'Ironless Halbach rotor', plus: '91.4% of the best simulated torque with no iron ring, and lower rotational inertia for fast direction changes.', minus: 'Twice the magnet count, a fixture to set the gap, and glue through radial holes. The torque comparison is simulated, not measured.', src: 'Article · FEMM table' },
  { title: 'Cycloidal lobes', plus: 'Rounded, continuous outlines suit nozzle radii and avoid thin printed teeth that shear at the root.', minus: 'Backlash and wear are design claims and hand impressions, not measurements. The author worries glass-filled nylon may abrade the lobes over time.', src: 'Article' },
  { title: 'Packaging', plus: 'Putting the gearbox inside the stator bore gives a flat Ø121 × 57 mm package (CAD) with the controller on the back.', minus: 'The clamshell, ring keying and stacked bearings make assembly order and tolerances critical; the article notes many prototype iterations.', src: 'CAD · article' },
  { title: 'Heat', plus: 'Thermocouples inside the coils were used; the 29.4 N·m test ended with ≈78 °C at the coil surface and no failure.', minus: 'No continuous rating or thermal model is published; the author felt he was near the limit of coils and plastic gearbox.', src: 'Article' },
  { title: 'Durability', plus: 'No mechanical or electrical failure in the reported tests.', minus: 'No long-term or cycle testing is reported; gear material choice (PA6-GF) was later questioned by the author.', src: 'Article' },
  { title: 'Controller', plus: 'A ~$30 ODrive 3.6 derivative with an on-board encoder keeps the system cost down.', minus: 'Chosen for price over newer ODrive or moteus boards; it is an older ODrive 3.6 design. The stock screw terminals appear too tall for the printed cover in the CAD.', src: 'Article · BOM · Makerbase docs' },
];

// ------------------------------------------------------------------ 8 CAD → hardware
export const BUILD_COPY = {
  kicker: '07 — From CAD to physical hardware',
  title: 'Seven steps the author actually took.',
  lede: 'The real build photos and the test videos live in the original article; they are linked rather than reproduced here. The two images on this page are genuine project files: the Fusion 360 preview embedded in the CAD file, and the winding diagram from the repository.',
};
export interface BuildStep {
  n: string; kicker: string; title: string; body: string; cap: string;
  img?: { src: string; alt: string; w: number; h: number }; link?: string; cfg?: boolean;
}
const base = import.meta.env.BASE_URL;
export const BUILD_STEPS: BuildStep[] = [
  { n: '01', kicker: 'CAD & simulation', title: 'Model in Fusion 360, compare rotors in FEMM', body: 'Four rotor variants were compared for static torque before committing to an ironless Halbach rotor with a 0.7 mm gap. The gearbox profiles came from the author’s extension of pygeartrain.', cap: 'Image: preview thumbnail embedded in the shared .f3d file (CAD render, not a photo).', img: { src: base + 'images/fusion-preview.png', alt: 'Fusion 360 preview render of the actuator from the controller side', w: 1024, h: 1024 } },
  { n: '02', kicker: 'Printing', title: 'Print every custom part in PA6-GF', body: 'All printed parts were glass-filled nylon. Nearly every part went through several revisions; the article shows the pile of failed prints. In hindsight the author would print the gears in plain nylon.', cap: 'Photo of failed and revised parts is in the article.', link: 'See the prototype parts photo' },
  { n: '03', kicker: 'Magnets', title: 'Insert 84 magnets with a fixture', body: 'A fixture held the magnets at the target air gap while they were slid in from the bottom; radial holes behind each magnet let them be superglued from behind once all were in place.', cap: 'Photos of the finished rotor and insertion fixture are in the article.', link: 'See the rotor and fixture photos' },
  { n: '04', kicker: 'Winding', title: 'Wind the stator with six strands at once', body: 'One spool was split into six smaller spools and fed together: 6 turns per tooth (5 full, 1 partial) of six parallel 0.4 mm strands, about three hours of work, then each phase checked on an LCR meter.', cap: 'Image: 36N42P winding scheme from the repository (online calculator output).', img: { src: base + 'images/winding-scheme-36N42P.png', alt: 'Winding diagram for 36 slots and 42 poles showing phases A, B and C around the stator', w: 687, h: 857 }, link: 'See the winding setup photos' },
  { n: '05', kicker: 'Assembly', title: 'Build the gearbox module, then the motor around it', body: 'The gearbox module runs through the centre and the stator goes into its clam-shell. The README calls for an M3 tap for the planet carrier and lithium grease inside the gearbox.', cap: 'Final assembly and gearbox photos are in the article.', link: 'See the assembly photos' },
  { n: '06', kicker: 'Controller', title: 'Configure the MKS XDrive Mini', body: 'An ODrive 3.6-based board chosen for cost. Selected values from the published configuration file:', cap: 'Source: MKS XDrive Config.json in the repository (axis0).', cfg: true },
  { n: '07', kicker: 'Testing', title: 'Tune, measure Kv, then pull until the limit', body: 'A 250 mm printed arm was used for tuning; Kv was measured by back-driving. 14 N·m on a 25 A lab supply, then 29.4 N·m on a loaned Audi e-tron module until the 50 A limit, with no failure.', cap: 'Test set-up photos and videos are in the article.', link: 'See the test set-ups and videos' },
];
export const CONFIG: { k: string; v: string }[] = [
  { k: 'pole_pairs', v: '21' }, { k: 'current_lim', v: '50.0 A' }, { k: 'encoder mode / cpr', v: '257 (SPI abs) / 16384' },
  { k: 'phase_resistance', v: '0.0899 Ω' }, { k: 'phase_inductance', v: '26.2 µH' }, { k: 'control / input mode', v: '3 / 3 (position)' },
];

// ------------------------------------------------------------------ 9 Open source
export const SOURCE_COPY = {
  kicker: '08 — Open source',
  lede: 'Everything shown on this page — the CAD, the simulations, the bill of materials, the controller configuration and the test results — is his work, published openly. If you want to study or build the actuator, go to the source.',
  licence: 'The repository is released under the MIT License with an added notice: copies must include “Credit: Caden Kraft (GitHub: CKraft11)”. The article also asks for credit if the work is reused.',
  independent: 'This page is an independent educational visualization. It is not an official project site and is not endorsed by Caden Kraft, Makerbase or any supplier.',
  howTitle: 'How this visualization was made, and what it cannot tell you',
  how: [
    ['Geometry.', 'The shared .f3d file embeds Fusion’s display tessellation (≈1.06 M vertices, 287 unique bodies). It was decoded, decimated to about 175 k unique triangles with crease-preserving normals, and re-instanced for 750 placed parts. B-rep surfaces, tolerances and body names are not used. That decimation erased the housing’s fine grille panels, leaving holes, so the housing and rotor were later re-meshed from the per-part STEP print files in the repository (1x_outer_case, 1x_rotor) and aligned to the original parts by shape matching. The STEP housing is a slightly later revision; where it differs from the modelled design (no floor plate, an extra top plate) the original geometry was kept. Flat faces that decimation deleted from other parts (the housing floor plate, the output frame’s top face, the lower clamshell ring) were rebuilt by re-filling their surviving outlines; nothing was added beyond those outlines.'],
    ['Placement.', 'Most occurrence transforms come straight from the file. The gearbox and controller sub-assemblies needed a parent transform that we reconstructed (a 90° axis change, plus a 24.4 mm offset for the board) and verified visually against the CAD preview. Small misplacements are possible.'],
    ['Identification.', 'Parts were named from shape, BOM quantities and the article — for example six identical 5×14×5 bearings, fifteen M4 heat-set inserts. The controller was rebuilt rather than taken from the CAD: outline and six Ø3.3 mm holes from Makerbase’s dimension drawing (63 × 58 mm), parts placed from Makerbase product photos (about ±1 mm), silkscreen redrawn, part heights estimated.'],
    ['Motion.', 'Gear and rotor motion follow ideal kinematics from lobe counts. Coil glow follows the published winding pattern at 21 electrical cycles per turn. Field sketches are illustrative. Nothing here is a structural, thermal or electromagnetic simulation, and no test was reproduced.'],
  ] as [string, string][],
  footerLeft: 'Ironless QDD Actuator · original design © Caden Kraft (CKraft11), MIT + credit',
  footerRight: 'Independent visualization · sources: GitHub repository, cadenkraft.com article (July 2025), original CAD',
};
export const LINKS: { t: string; d: string; href: string }[] = [
  { t: 'GitHub repository', d: 'github.com/CKraft11/Ironless-QDD-Actuator', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator' },
  { t: 'Technical article', d: 'cadenkraft.com · design, build and test write-up', href: 'https://cadenkraft.com/ironless-cycloidal-planetary-actuator/' },
  { t: 'CAD files', d: '/CAD · large files tracked with Git LFS', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator/tree/main/CAD' },
  { t: 'FEMM simulation files', d: '/FEMM · rotor configuration studies', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator/tree/main/FEMM' },
  { t: 'Bill of materials', d: 'BOM.xlsx · 18 purchased line items, priced 4/22/25', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator/blob/main/BOM.xlsx' },
  { t: 'Controller configuration', d: 'MKS XDrive Config.json · ODrive settings', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator/blob/main/MKS%20XDrive%20Config.json' },
  { t: 'Winding scheme', d: '36N42P Winding Scheme.png', href: 'https://github.com/CKraft11/Ironless-QDD-Actuator/blob/main/36N42P%20Winding%20Scheme.png' },
  { t: 'MakerWorld mirror', d: 'Print and CAD files if LFS bandwidth runs out', href: 'https://makerworld.com/en/models/2042262-caden-kraft-s-qdd-cycloidal-planetary-actuator' },
  { t: 'XDrive Mini drawing & pinout (third party)', d: 'Smurf/xdrive-mini-docs · copies of Makerbase’s size drawing and wiring diagram', href: 'https://github.com/Smurf/xdrive-mini-docs' },
  { t: 'Makerbase XDrive Mini product page', d: 'makerbase3d.com · ODrive 3.6-based, AS5047P on board', href: 'https://makerbase3d.com/product/makerbase-xdrive-mini-high-precision-brushless-servo-motor-controller-based-on-odrive3-6-with-as5047p-on-board/' },
];
