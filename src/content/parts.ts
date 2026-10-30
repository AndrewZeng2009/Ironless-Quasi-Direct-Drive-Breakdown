/* Part groups, their display names and per-part info cards.
   All copy is taken verbatim from the prototype (reference/prototype). Do not add figures here
   that are not in the sources listed in BUILD_BRIEF.md §7. */

export type GroupKey =
  | 'housing' | 'frame' | 'retainer' | 'cover'
  | 'stator' | 'coils' | 'rotor' | 'magMain' | 'magHal'
  | 'sun' | 'planets' | 'ring' | 'carrier' | 'pins'
  | 'pbearings' | 'b6710' | 'b6805' | 'axle' | 'fasteners'
  | 'encoder' | 'pcb' | 'encplate' | 'terminals' | 'xt30';

export type Category = 'structure' | 'motor' | 'gearbox' | 'hardware' | 'electronics';

export type MaterialKey =
  | 'polyHousing' | 'polyFrame' | 'polyRotor' | 'polyGear' | 'polyGear2' | 'polyRing' | 'polyCarrier'
  | 'lamination' | 'copper' | 'nickel' | 'nickel2' | 'steel' | 'bearing' | 'blackOxide' | 'brass'
  | 'pcb' | 'xt30' | 'pcbMask' | 'pcbGold' | 'aluCan' | 'blackPlastic' | 'creamPlastic' | 'whitePlastic'
  | 'beige' | 'greenTerm' | 'termDark' | 'steelBright' | 'steelDark' | 'epoxy';

export interface GroupDef { name: string; cat: Category; mat: MaterialKey }

export const GROUPS: Record<GroupKey, GroupDef> = {
  housing:   { name: 'Main housing', cat: 'structure', mat: 'polyHousing' },
  frame:     { name: 'Output clamshell frame', cat: 'structure', mat: 'polyFrame' },
  retainer:  { name: 'Lower clamshell ring', cat: 'structure', mat: 'polyFrame' },
  cover:     { name: 'Controller cover', cat: 'structure', mat: 'polyHousing' },
  stator:    { name: '10010 stator · 36 slots', cat: 'motor', mat: 'lamination' },
  coils:     { name: 'Windings · 36 coils', cat: 'motor', mat: 'copper' },
  rotor:     { name: 'Ironless rotor (printed)', cat: 'motor', mat: 'polyRotor' },
  magMain:   { name: 'Main-pole magnets ×42', cat: 'motor', mat: 'nickel' },
  magHal:    { name: 'Halbach magnets ×42', cat: 'motor', mat: 'nickel2' },
  sun:       { name: 'Sun gear · 6 lobes', cat: 'gearbox', mat: 'polyGear' },
  planets:   { name: 'Planet gears ×3 · 15 lobes', cat: 'gearbox', mat: 'polyGear2' },
  ring:      { name: 'Ring gear · 36 lobes', cat: 'gearbox', mat: 'polyRing' },
  carrier:   { name: 'Planet carrier (output)', cat: 'gearbox', mat: 'polyCarrier' },
  pins:      { name: 'Planet pins & washers', cat: 'gearbox', mat: 'steel' },
  pbearings: { name: 'Planet bearings 5×14×5 ×6', cat: 'hardware', mat: 'bearing' },
  b6710:     { name: '6710 bearings ×2', cat: 'hardware', mat: 'bearing' },
  b6805:     { name: '6805 bearings ×2', cat: 'hardware', mat: 'bearing' },
  axle:      { name: 'M4 shoulder bolt & spacer', cat: 'hardware', mat: 'blackOxide' },
  fasteners: { name: 'Fasteners & heat-set inserts', cat: 'hardware', mat: 'blackOxide' },
  encoder:   { name: 'Encoder magnet & holder', cat: 'electronics', mat: 'polyGear' },
  pcb:       { name: 'MKS XDrive Mini · main board', cat: 'electronics', mat: 'pcbMask' },
  encplate:  { name: 'Encoder-side plate & standoffs', cat: 'electronics', mat: 'pcbMask' },
  terminals: { name: 'Stock screw terminals (off)', cat: 'electronics', mat: 'greenTerm' },
  xt30:      { name: 'XT60 power connector', cat: 'electronics', mat: 'xt30' },
};

export const GROUP_KEYS = Object.keys(GROUPS) as GroupKey[];

export const CATEGORIES: [Category, string][] = [
  ['structure', 'Structure'],
  ['motor', 'Electromagnetic'],
  ['gearbox', 'Gearbox'],
  ['hardware', 'Bearings & hardware'],
  ['electronics', 'Electronics'],
];

/** Swatch colours used in the parts list. */
export const SWATCH: Record<GroupKey, string> = {
  housing: '#2f343a', frame: '#454b52', retainer: '#454b52', cover: '#2f343a', stator: '#6d757c',
  coils: '#c47b4f', rotor: '#3a3f45', magMain: '#d3d7db', magHal: '#b5bcc2', sun: '#7cc4e0',
  planets: '#7c858e', ring: '#565d65', carrier: '#e59a5c', pins: '#b0b6bb', pbearings: '#c9ced3',
  b6710: '#c9ced3', b6805: '#c9ced3', axle: '#55585d', fasteners: '#b8995a', encoder: '#6b737c',
  pcb: '#2d3a3f', encplate: '#3a4046', terminals: '#23a03c', xt30: '#b59a3a',
};

export const GEARBOX_SET: GroupKey[] = ['sun', 'planets', 'ring', 'carrier', 'pins', 'pbearings'];
export const MOTOR_SET: GroupKey[] = ['stator', 'coils', 'rotor', 'magMain', 'magHal', 'housing'];

/** Groups emphasised in each "Follow the torque" step. */
export const TORQUE_SETS: Record<number, GroupKey[]> = {
  1: ['pcb', 'encplate', 'xt30', 'encoder'],
  2: ['coils', 'stator'],
  3: ['magMain', 'magHal', 'rotor', 'coils'],
  4: ['rotor', 'sun', 'planets', 'ring'],
  5: ['carrier', 'frame', 'pins'],
};

/** Hidden on load: the stock terminals would intersect the printed cover. */
export const DEFAULT_HIDDEN: Partial<Record<GroupKey, boolean>> = { terminals: true };

/** 36N42P winding scheme (repo image): AabBCcaABbcC ×3 ; capital = +, lower = −. */
export const WINDING = 'AabBCcaABbcC';

export function stageTitle(n: number): string {
  return ['Gearbox core', 'Gearbox clamshell & bearings', 'Stator & windings', 'Halbach rotor', 'Housing', 'Controller & cover'][n - 1] || '';
}

export function stageOf(g: GroupKey): string {
  const m: Record<GroupKey, number | string> = {
    sun: 1, planets: 1, pbearings: 1, pins: 1, carrier: 1, ring: 1, frame: 2, retainer: 2, b6710: 2, b6805: 2, axle: 2,
    stator: 3, coils: 3, rotor: 4, magMain: 4, magHal: 4, encoder: 4, housing: 5, pcb: 6, encplate: 6, terminals: 6,
    cover: 6, xt30: 6, fasteners: '2–6',
  };
  return String(m[g] ?? '');
}

export interface PartInfo {
  title: string; spec: string; fn: string; mat: string; why: string; rel: string; src: string[];
}

export const INFO: Record<GroupKey, PartInfo> = {
  housing: { title: 'Main housing', spec: 'Printed shell · ventilated lattice windows', fn: 'Encloses the rotor, carries the controller bay underneath and bolts to the clamshell flange.', mat: 'PA6-GF, FFF-printed (all printed parts per the article); M4 heat-set inserts.', why: 'The lattice windows are visible in the CAD; the article does not state their purpose (likely cooling and mass).', rel: 'Outermost layer around the rotor, between the clamshell flange and the controller.', src: ['Article', 'CAD', 'Inferred'] },
  frame: { title: 'Output clamshell frame', spec: 'Ø115 mm flange · 8× M2.5 countersunk', fn: 'Upper half of the gearbox module’s clam-shell; locates the ring gear and upper bearings and forms the mounting flange.', mat: 'PA6-GF, printed; M2.5 and M4 heat-set inserts.', why: 'The article says the stator is assembled into the gearbox module’s clam-shell, so the gearbox can run through the centre of the motor.', rel: 'Top of the stack on the output side.', src: ['Article', 'CAD'] },
  retainer: { title: 'Lower clamshell ring', spec: 'Ø81 mm ring · M3×6 and M2 locknuts', fn: 'Closes the clam-shell from below and holds the lower ring-gear half.', mat: 'PA6-GF, printed.', why: 'A split clam-shell lets a double-helical ring be built from two halves around the planets.', rel: 'Below the stator, inside the rotor.', src: ['CAD', 'Inferred'] },
  cover: { title: 'Controller cover', spec: 'Printed cover with power input', fn: 'Closes the electronics bay on the back of the actuator.', mat: 'Printed plastic.', why: 'Keeps the controller integrated in the actuator envelope.', rel: 'Outermost layer on the controller side.', src: ['CAD'] },
  stator: { title: '10010 stator', spec: '36 slots · Ø100 mm OD · Ø78 mm bore', fn: 'Laminated steel core that carries the windings; its teeth point outward toward the rotor (outrunner).', mat: 'Bought part, laminated electrical steel ($17.63 in the BOM).', why: 'An off-the-shelf stator avoids the hardest part to make at home. Its large bore leaves room for the gearbox.', rel: 'Centre of the motor; the ring gear is keyed into its bore.', src: ['Article', 'BOM', 'CAD'] },
  coils: { title: 'Windings', spec: '36 coils · 6 turns · 6 × 0.4 mm strands', fn: 'Three-phase windings that produce the rotating field.', mat: 'Enameled 0.4 mm copper magnet wire (60 units in the BOM).', why: 'Six thin strands in parallel act like a thicker conductor but are easier to wind. Phase R matched within ±0.76% on an LCR meter.', rel: 'Around each stator tooth; pattern AabBCcaABbcC ×3.', src: ['Article', 'Repo image', 'BOM'] },
  rotor: { title: 'Ironless rotor', spec: 'Printed ring · no back-iron', fn: 'Holds 84 magnets around the stator and transmits torque through its hub to the sun gear.', mat: 'PA6-GF in the build. README: 100% infill, high-stiffness, low-creep plastic; PLA will creep.', why: 'No iron ring: lower mass and rotational inertia, at 91.4% of the best simulated torque.', rel: 'Wraps the stator with a 0.7 mm gap; hub bolts to the sun at the bottom.', src: ['Article', 'README'] },
  magMain: { title: 'Main-pole magnets', spec: '42 × N52 · 12 × 5 × 3 mm', fn: 'Radially magnetised poles; 42 poles = 21 pole pairs (matches the controller’s pole_pairs).', mat: 'Sintered NdFeB, nickel plated (bought; $0.119 each).', why: 'Standard block magnets are cheap and easy to source.', rel: 'Rotor inner wall, alternating with Halbach magnets; inner face 0.7 mm from the stator.', src: ['Article', 'BOM', 'Config', 'CAD'] },
  magHal: { title: 'Halbach magnets', spec: '42 × N50 · ½ × ⅛ × 1/16 in', fn: 'Thin, tangentially magnetised magnets between the main poles that steer flux toward the stator.', mat: 'Sintered NdFeB (bought; $0.14 each).', why: 'They replace the job of back-iron: closing flux between poles while weakening the field on the outside.', rel: 'Between each pair of main-pole magnets.', src: ['Article', 'BOM', 'Inferred orientation'] },
  sun: { title: 'Sun gear', spec: '6 lobes · Ø25 mm hub', fn: 'Input of the reduction; turns with the rotor.', mat: 'Printed (PA6-GF in the build).', why: 'Ratio = 1 + 36/6 = 7 with the ring held fixed.', rel: 'Centre of the gearbox, inside the 6805 bearings, on the shoulder bolt.', src: ['CAD (lobe count)', 'Article (ratio)'] },
  planets: { title: 'Planet gears', spec: '3 × 15 lobes · double-helical', fn: 'Roll between sun and fixed ring; carry load to the carrier through their pins.', mat: 'Printed (PA6-GF in the build).', why: 'Three planets share load; (6 + 36)/3 is an integer, so they space evenly.', rel: 'Between sun and ring, each on two 5×14×5 bearings and a 5×12 pin.', src: ['CAD', 'BOM'] },
  ring: { title: 'Ring gear', spec: '36 lobes · two opposite-hand helical halves', fn: 'Fixed reaction member of the planetary.', mat: 'Printed (PA6-GF in the build).', why: 'Splitting a double-helical ring into halves makes it printable and assemblable around the planets.', rel: 'Keyed into the stator bore at the motor mid-plane (CAD).', src: ['CAD', 'Article'] },
  carrier: { title: 'Planet carrier', spec: 'Output · two plates + three spacer blocks', fn: 'Collects planet motion and turns at 1/7 rotor speed with ≈7× torque (ideal).', mat: 'Printed; M3 and M2.5 heat-set inserts; 9 × M2.5 countersunk screws.', why: 'README: an M3 tap is needed when assembling the planet carrier.', rel: 'Straddles the planets; top plate faces the output side.', src: ['CAD', 'README', 'BOM'] },
  pins: { title: 'Planet pins & thrust washers', spec: '3 × 5 × 12 mm pins · 6 washers', fn: 'Axles for the planets, fixed to the carrier.', mat: 'Steel dowel pins (BOM); washers as modelled.', why: 'Hardened pins give the plastic planets a true axis.', rel: 'Through each planet’s bearings.', src: ['BOM', 'CAD'] },
  pbearings: { title: 'Planet bearings', spec: '6 × 5 × 14 × 5 mm', fn: 'Two per planet so the planets spin freely on their pins.', mat: 'Steel ball bearings ($0.32 each).', why: 'Rolling bearings instead of plastic-on-steel sliding.', rel: 'Pressed into the planets.', src: ['BOM', 'CAD'] },
  b6710: { title: '6710 bearings', spec: '2 × 50 × 62 × 6 mm', fn: 'Large thin-section bearings above and below the gearbox.', mat: 'Steel ball bearings ($2.26 each).', why: 'Thin section keeps the package flat while supporting a large-diameter member.', rel: 'Either side of the carrier in the clamshell (role inferred from position).', src: ['BOM', 'CAD', 'Inferred'] },
  b6805: { title: '6805 bearings', spec: '2 × 25 × 37 × 7 mm', fn: 'Support the sun gear hub on both sides.', mat: 'Steel ball bearings ($1.29 each).', why: 'Their 25 mm bore matches the sun’s Ø25 mm hub in the CAD.', rel: 'Inside the carrier, around the sun (role inferred from position).', src: ['BOM', 'CAD', 'Inferred'] },
  axle: { title: 'Shoulder bolt, spacer & locknut', spec: 'M4 × 25 shoulder bolt · M4 locknut', fn: 'Runs along the centreline through the sun and rotor hub and clamps the stack.', mat: 'Steel (BOM); spacer as modelled.', why: 'A shoulder bolt gives a precise Ø5 mm journal from a cheap part.', rel: 'On the axis, from the output face to under the rotor hub.', src: ['BOM', 'CAD', 'Inferred'] },
  fasteners: { title: 'Fasteners & heat-set inserts', spec: '20 M2.5×12 CS · 8 M3×6 · 4 M2×25 + nuts · 36 inserts', fn: 'Hold the printed parts together. Brass inserts: 7 × M2.5, 14 × M3, 15 × M4.', mat: 'Steel screws; brass heat-set inserts.', why: 'Inserts give durable metal threads in printed plastic.', rel: 'Throughout; they explode with the part they hold.', src: ['BOM', 'CAD'] },
  encoder: { title: 'Encoder magnet & holder', spec: 'Diametric magnet on the rotor axis', fn: 'Gives the controller absolute rotor angle for commutation.', mat: 'Magnet in a printed holder.', why: 'The config uses an SPI absolute encoder (mode 257, 16 384 CPR), the AS5047P on the MKS board; the article calls it a built-in hall-effect encoder.', rel: 'Bottom of the shaft, facing the board’s centre hole.', src: ['Config', 'CAD', 'Article'] },
  pcb: { title: 'MKS XDrive Mini', spec: '63 × 58 mm · 6 × Ø3.3 mm holes · ODrive 3.6-based', fn: 'Field-oriented control of the three phases with closed-loop position control. Interfaces: CAN, ABZ/Hall, SWD, GPIO, SPI and USB-C, plus RESET/BOOT buttons and a 120 Ω CAN termination jumper.', mat: 'Bought board ($29.99 in the BOM): five 100 µF 63 V electrolytics, a SOIC-8 CAN transceiver, and the AS5047P on the underside at the board centre.', why: 'Chosen over newer ODrive and moteus boards for cost. Rebuilt here because the board body in the original CAD is simplified.', rel: 'Outline and holes from the Makerbase drawing; parts placed from Makerbase photos (about ±1 mm); heights estimated. Sits on six standoffs in the bay under the housing.', src: ['Makerbase drawing', 'Makerbase photos', 'BOM', 'Article', 'Config'] },
  encplate: { title: 'Encoder-side plate & standoffs', spec: '63 × 58 mm · Ø10.5 mm centre window · 4 slots', fn: 'Covers the underside of the board; the centre window lets the encoder magnet sit over the AS5047P.', mat: 'Black PCB-style plate on six standoffs, as the board is sold.', why: 'Protects the underside while leaving the sensor open to the magnet.', rel: 'Between the board and the housing floor. Stack heights (3.0 mm standoffs, 1.4 mm plate) follow the author’s CAD; the nuts on the shipped part are omitted.', src: ['Makerbase photos', 'CAD'] },
  terminals: { title: 'Stock screw terminals', spec: '3-pole A/B/C · 2-pole DC · 2-pole AUX · heights estimated', fn: 'Motor-phase, DC-input and brake-resistor (AUX) connections as the board ships.', mat: 'Green terminal blocks with clamp screws.', why: 'Hidden by default: at an estimated ~14.5 mm they would pass through the printed controller cover in the author’s CAD, which also carries a separate XT60. Whether he removed them is not stated in the sources.', rel: 'Along the top edge of the board, overhanging it by about 3 mm. Toggle with the eye icon in the parts list.', src: ['Makerbase photos', 'Inferred'] },
  xt30: { title: 'XT60 power connector', spec: 'As modelled in the author’s CAD (XT60 lettering on the part)', fn: 'DC input to the controller.', mat: 'Bought part.', why: 'A standard high-current battery connector.', rel: 'In the controller cover.', src: ['CAD'] },
};
