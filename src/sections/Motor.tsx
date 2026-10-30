import { useMemo, useState } from 'react';
import {
  COIL_ANGLES, FEMM, HAL_ANGLES, MAIN_ANGLES, MOTOR_COPY as C, PHASE_COLORS, ROTORS, type RotorKey, type RotorVariant,
} from '../content/sections';
import { WINDING } from '../content/parts';
import { COIL, ROTOR_RING, STATOR } from '../content/svgPaths';
import { openInExplorer, SectionHead, Swatch } from './ui';

const pol = (r: number, a: number) => {
  const t = (a * Math.PI) / 180;
  return (r * Math.cos(t)).toFixed(2) + ' ' + (r * Math.sin(t)).toFixed(2);
};

/** Hand-drawn flux sketch (illustrative, not an FEMM result). */
function fluxPaths() {
  const inner: string[] = [], outer: string[] = [];
  for (let i = 0; i < MAIN_ANGLES.length; i++) {
    const a = MAIN_ANGLES[i], b = i + 1 < MAIN_ANGLES.length ? MAIN_ANGLES[i + 1] : MAIN_ANGLES[0] + 360, m = (a + b) / 2;
    inner.push('M' + pol(50.4, a) + 'Q' + pol(41.5, m) + ' ' + pol(50.4, b));
    inner.push('M' + pol(50.4, a + 1.6) + 'Q' + pol(45.5, m) + ' ' + pol(50.4, b - 1.6));
    outer.push('M' + pol(54.6, a + 1.2) + 'Q' + pol(56.6, m) + ' ' + pol(54.6, b - 1.2));
  }
  return { inner, outer };
}

export function Motor() {
  const [arrows, setArrows] = useState(true);
  const [phase, setPhase] = useState(true);
  const [flux, setFlux] = useState(false);
  const [cmp, setCmp] = useState<RotorKey>('hi');
  const fl = useMemo(fluxPaths, []);
  const sel = ROTORS.find((r) => r.key === cmp)!;

  return (
    <section id="motor" className="band" aria-labelledby="motor-title">
      <div className="wrap sec-in">
        <SectionHead kicker={C.kicker} title={C.title} id="motor-title">
          <p className="body">{C.lede}</p>
        </SectionHead>
        <div className="split" style={{ gap: 28 }}>
          <figure className="col" style={{ flex: '1.2 1 520px', gap: 12, margin: 0 }}>
            <div className="motor-fig">
              <svg viewBox="-60 -60 120 120" role="img" aria-label={C.svgLabel} className="block">
                <defs>
                  <g id="qdd-motor-geo">
                    <path d={ROTOR_RING} fill="#262b31" fillRule="evenodd" />
                    <path d={STATOR} fill="#4b5259" fillRule="evenodd" />
                    {COIL_ANGLES.map((a) => {
                      let idx = Math.round(a / 10); idx = ((idx % 36) + 36) % 36;
                      const ch = WINDING.charAt(idx % 12), up = ch === ch.toUpperCase();
                      return (
                        <path key={a} d={COIL} transform={`rotate(${a})`}
                          fill={phase ? PHASE_COLORS[ch.toUpperCase() as 'A' | 'B' | 'C'] : '#b8714a'}
                          fillOpacity={phase ? (up ? 1 : 0.5) : 1} />
                      );
                    })}
                    {MAIN_ANGLES.map((a, i) => (
                      <g key={a} transform={`rotate(${a})`}>
                        <rect x="50.7" y="-2.6" width="3.35" height="5.2" rx="0.25" fill={i % 2 ? '#6fb6d6' : '#e59a5c'} />
                        <path d={i % 2 ? 'M53.5 0H51.2M51.2 0l0.9 -0.7M51.2 0l0.9 0.7' : 'M51.2 0H53.5M53.5 0l-0.9 -0.7M53.5 0l-0.9 0.7'}
                          fill="none" stroke="#0b0d0f" strokeWidth="0.42" strokeLinecap="round" opacity={arrows ? 0.9 : 0} />
                      </g>
                    ))}
                    {HAL_ANGLES.map((a, i) => (
                      <g key={a} transform={`rotate(${a})`}>
                        <rect x="50.7" y="-0.85" width="3.6" height="1.7" rx="0.2" fill={i % 2 ? '#bfe0ee' : '#f2c9a8'} />
                        <path d={i % 2 ? 'M52.5 0.6V-0.6M52.5 -0.6l-0.4 0.45M52.5 -0.6l0.4 0.45' : 'M52.5 -0.6V0.6M52.5 0.6l-0.4 -0.45M52.5 0.6l0.4 -0.45'}
                          fill="none" stroke="#0b0d0f" strokeWidth="0.32" strokeLinecap="round" opacity={arrows ? 0.9 : 0} />
                      </g>
                    ))}
                  </g>
                </defs>
                <circle r="59.4" fill="none" stroke="rgba(214,222,230,0.10)" strokeWidth="0.25" strokeDasharray="0.6 1.2" />
                <use href="#qdd-motor-geo" />
                {flux && (
                  <g fill="none" strokeLinecap="round" data-testid="flux-sketch">
                    {fl.inner.map((d, i) => <path key={'i' + i} className="flux" d={d} stroke="#7cc4e0" strokeWidth="0.32" opacity="0.85" />)}
                    {fl.outer.map((d, i) => <path key={'o' + i} d={d} stroke="#7cc4e0" strokeWidth="0.22" opacity="0.28" />)}
                  </g>
                )}
                <g fontFamily="IBM Plex Mono, monospace" fontSize="2.3">
                  <text x="0" y="-2" textAnchor="middle" fill="#9aa3ab">gearbox lives</text>
                  <text x="0" y="1.4" textAnchor="middle" fill="#9aa3ab">inside this bore</text>
                  <text x="0" y="5" textAnchor="middle" fill="#8b939b">Ø78 mm</text>
                </g>
                <rect x="-7.5" y="-57.2" width="15" height="9.2" fill="none" stroke="#ecebe6" strokeWidth="0.25" strokeDasharray="0.8 0.6" />
              </svg>
              <div className="motor-inset">
                <svg viewBox="-7.5 -57.2 15 9.2" role="img" aria-label={C.insetLabel} className="block">
                  <use href="#qdd-motor-geo" />
                  <path d="M-7.5,-50 H7.5" stroke="#7cc4e0" strokeWidth="0.05" strokeDasharray="0.25 0.2" />
                  <path d="M-7.5,-50.7 H7.5" stroke="#7cc4e0" strokeWidth="0.05" strokeDasharray="0.25 0.2" />
                  <rect x="-6.6" y="-49.95" width="4.6" height="0.95" fill="#0b0d0f" opacity="0.8" />
                  <text x="-6.4" y="-49.2" fontFamily="IBM Plex Mono, monospace" fontSize="0.62" fill="#7cc4e0">gap 0.70 mm</text>
                </svg>
              </div>
            </div>
            <figcaption className="note">{C.caption}</figcaption>
            <div role="group" aria-label="Cross-section layers" className="row-gap" style={{ gap: 8 }}>
              <button className="q-chip" aria-pressed={arrows} onClick={() => setArrows(!arrows)}>Magnetisation</button>
              <button className="q-chip" aria-pressed={phase} onClick={() => setPhase(!phase)}>Phase colours</button>
              <button className="q-chip" aria-pressed={flux} onClick={() => setFlux(!flux)}>Flux sketch</button>
              <a className="q-chip" href="#explorer" onClick={(e) => { e.preventDefault(); openInExplorer('motor'); }}>Open motor section in 3D →</a>
            </div>
            <div className="legend">
              <span><Swatch color="#e59a5c" />main pole, out</span>
              <span><Swatch color="#6fb6d6" />main pole, in</span>
              <span><Swatch color="#f2c9a8" /><Swatch color="#bfe0ee" />Halbach, tangential</span>
              {phase && (
                <span><Swatch color={PHASE_COLORS.A} />A <Swatch color={PHASE_COLORS.B} />B <Swatch color={PHASE_COLORS.C} />C · faded = reverse-wound</span>
              )}
            </div>
            <p className="note">{C.note}</p>
          </figure>

          <div className="col" style={{ flex: '1 1 400px', gap: 18 }}>
            <h3 className="h3">{C.cmpTitle}</h3>
            <p className="body-s">{C.cmpLede}</p>
            <div role="group" aria-label="Rotor configurations" className="cmp-grid">
              {ROTORS.map((r) => <RotorCell key={r.key} r={r} on={cmp === r.key} onPick={() => setCmp(r.key)} />)}
            </div>
            <div className="panel" style={{ padding: 16, gap: 12 }}>
              <div className="between">
                <span className="h4">{C.femmTitle}</span>
                <span className="note" style={{ fontSize: 10.5 }}>{C.femmUnit}</span>
              </div>
              <table className="bars" aria-label="FEMM average static torque (comparative only)">
                <tbody>
                  {FEMM.map((f) => {
                    const col = f.key === 'hn' ? '#7cc4e0' : cmp === f.key ? '#9aa3ab' : '#4f575f';
                    return (
                      <tr key={f.key} title={`${f.name}: ${f.v} N·m average static torque (${f.p} of max), FEMM, comparative only`}>
                        <td style={{ color: f.key === 'hn' ? '#d4eef9' : '#b4bac0' }}>{f.name}</td>
                        <td className="track"><span style={{ width: (f.v / 1.1 * 100).toFixed(1) + '%', background: col }} /></td>
                        <td className="num">{f.v.toFixed(3)} <span className="dim">{f.p}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="note" style={{ fontSize: 10.5, lineHeight: 1.5 }}>{C.femmNote}</p>
            </div>
            <div className="callout" aria-live="polite">
              <span className="h4">{sel.title}</span>
              <p>{sel.body}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- rotor-variant mini sketches (illustrative field sketch)
const arrowUp = (x: number) => `M${x + 8} 33V25M${x + 8} 25l-3 3.5M${x + 8} 25l3 3.5`;
const arrowDn = (x: number) => `M${x + 8} 25V33M${x + 8} 33l-3 -3.5M${x + 8} 33l3 -3.5`;
const arrowR = (x: number) => `M${x + 4} 29H${x + 12}M${x + 12} 29l-3.5 -3M${x + 12} 29l-3.5 3`;
const arrowL = (x: number) => `M${x + 12} 29H${x + 4}M${x + 4} 29l3.5 -3M${x + 4} 29l3.5 3`;
const XS = [8, 26, 44, 62, 80, 98, 116, 134];
const HAL_MAGS = XS.map((x, i) => ({ x, fill: i % 2 ? '#d7dbdf' : i % 4 === 0 ? '#e59a5c' : '#6fb6d6', ar: [arrowUp, arrowR, arrowDn, arrowL][i % 4](x) }));
const CON_MAGS = [8, 44, 80, 116].map((x, i) => ({ x, fill: i % 2 ? '#6fb6d6' : '#e59a5c', ar: i % 2 ? arrowDn(x) : arrowUp(x) }));
const loopsBelow = (k: number, w: number, o: number) => [0, 1, 2].slice(0, k).map((j) => ({
  d: `M${16 + j * 2} 38 Q 34 ${60 + j * 6} ${52 - j * 2} 38 M${52 + j * 2} 38 Q 70 ${60 + j * 6} ${88 - j * 2} 38 M${88 + j * 2} 38 Q 106 ${60 + j * 6} ${124 - j * 2} 38`, w, o,
}));
const loopsAbove = (k: number, w: number, o: number) => [0, 1].slice(0, k).map((j) => ({
  d: `M${16 + j * 2} 20 Q 34 ${4 - j * 3} ${52 - j * 2} 20 M${52 + j * 2} 20 Q 70 ${4 - j * 3} ${88 - j * 2} 20 M${88 + j * 2} 20 Q 106 ${4 - j * 3} ${124 - j * 2} 20`, w, o,
}));
const LINES: Record<RotorKey, { d: string; w: number; o: number }[]> = {
  hi: loopsBelow(3, 1.2, 0.9),
  hn: loopsBelow(3, 1.0, 0.8).concat(loopsAbove(1, 0.6, 0.25)),
  ci: loopsBelow(2, 1.0, 0.75),
  cn: loopsBelow(2, 0.8, 0.55).concat(loopsAbove(2, 0.8, 0.55)),
};

function RotorCell({ r, on, onPick }: { r: RotorVariant; on: boolean; onPick: () => void }) {
  const mags = r.halbach ? HAL_MAGS : CON_MAGS;
  return (
    <button className="q-cell" aria-pressed={on} onClick={onPick}>
      <svg viewBox="0 0 160 76" role="img" aria-label={r.title + '. Illustrative field sketch.'} className="block">
        {r.iron && <rect x="8" y="10" width="144" height="10" fill="#5d646b" />}
        {mags.map((m) => (
          <g key={m.x}>
            <rect x={m.x} y="21" width="16" height="16" fill={m.fill} />
            <path d={m.ar} fill="none" stroke="#0b0d0f" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        ))}
        <rect x="8" y="50" width="144" height="2" fill="#4b5259" />
        {LINES[r.key].map((l, i) => <path key={i} d={l.d} fill="none" stroke="#7cc4e0" strokeWidth={l.w} opacity={l.o} />)}
        <text x="8" y="70" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="#8b939b">stator side</text>
      </svg>
      <span className="between" style={{ width: '100%', alignItems: 'baseline' }}>
        <span className="cell-name">{r.name}</span>
        <span className="cell-val" style={{ color: r.key === 'hn' ? '#7cc4e0' : '#b4bac0' }}>{r.val}</span>
      </span>
    </button>
  );
}
