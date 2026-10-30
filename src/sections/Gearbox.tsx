import { useState } from 'react';
import { GEAR_COPY as C, GEAR_WHY, PLANET_POS } from '../content/sections';
import { CARRIER, GEAR_RING, PLANET_0, PLANET_1, PLANET_2, SUN } from '../content/svgPaths';
import { openInExplorer, SectionHead, Swatch } from './ui';

const PLANETS = [PLANET_0, PLANET_1, PLANET_2];

export function Gearbox() {
  const [paused, setPaused] = useState(false);
  return (
    <section id="gearbox" className="wrap sec" aria-labelledby="gear-title">
      <div className="split" style={{ gap: '32px 48px' }}>
        <div className="col" style={{ flex: '1 1 380px', gap: 16 }}>
          <SectionHead kicker={C.kicker} title={C.title} id="gear-title">
            <p className="body">{C.lede}</p>
          </SectionHead>
          <div className="lobes">
            <div><span className="k" style={{ color: '#7cc4e0' }}>Sun · input</span><span className="n">6</span><span className="u">lobes</span></div>
            <div><span className="k" style={{ color: '#cfd5da' }}>Planet ×3</span><span className="n">15</span><span className="u">lobes</span></div>
            <div><span className="k" style={{ color: '#9aa3ab' }}>Ring · fixed</span><span className="n">36</span><span className="u">lobes</span></div>
          </div>
          <p className="math">
            ratio = 1 + Z<sub>ring</sub>/Z<sub>sun</sub> = 1 + 36/6 = <span style={{ color: '#e59a5c' }}>7 : 1</span><br />
            check: Z<sub>ring</sub> = Z<sub>sun</sub> + 2·Z<sub>planet</sub> = 6 + 30 ✓ · (6+36)/3 planets = 14 ✓
          </p>
          <p className="note">{C.lobeNote}</p>
          <h3 className="h3" style={{ marginTop: 12 }}>{C.whyTitle}</h3>
          <ul className="why">
            {GEAR_WHY.map((w) => <li key={w.n}><span className="n">{w.n}</span><span>{w.t}</span></li>)}
          </ul>
          <p className="note">{C.backlashNote}</p>
        </div>
        <figure className="col" style={{ flex: '1.15 1 480px', gap: 12, margin: 0 }}>
          <div className="gear-fig">
            <svg className="gears block" data-paused={paused ? '1' : '0'} viewBox="-41 -41 82 82" role="img" aria-label={C.svgLabel}>
              <path d={GEAR_RING} fill="#3a4047" fillRule="evenodd" stroke="#59616a" strokeWidth="0.12" />
              <g className="g-anim g-carrier">
                <circle r="39.5" fill="none" stroke="none" />
                <path d={CARRIER} fill="rgba(229,154,92,0.16)" fillRule="evenodd" stroke="#e59a5c" strokeWidth="0.3" />
                <path d="M0,-25.8 L1.4,-27.9 L-1.4,-27.9Z" fill="#e59a5c" />
                {PLANET_POS.map(([x, y], i) => (
                  <g key={i} transform={`translate(${x} ${y})`}>
                    <g className="g-anim g-planet">
                      <circle r="15.3" fill="none" stroke="none" />
                      <path d={PLANETS[i]} fill="#6b737c" fillRule="evenodd" stroke="#8a939c" strokeWidth="0.12" />
                      <circle r="6.6" fill="none" stroke="#c4c9ce" strokeWidth="1.1" />
                      <circle r="4.1" fill="none" stroke="#9aa3ab" strokeWidth="0.6" />
                      {i === 0 && <circle cx="0" cy="-10.5" r="0.7" fill="#0b0d0f" />}
                    </g>
                    <circle r="2.5" fill="#e59a5c" />
                  </g>
                ))}
              </g>
              <g className="g-anim g-sun">
                <circle r="7" fill="none" stroke="none" />
                <path d={SUN} fill="#7cc4e0" fillRule="evenodd" />
                <circle cx="0" cy="-3.6" r="0.55" fill="#0b0d0f" />
              </g>
              <circle r="0.9" fill="#0b0d0f" />
            </svg>
          </div>
          <figcaption className="between" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div className="legend">
              <span><Swatch color="#7cc4e0" />sun · input (with rotor)</span>
              <span><Swatch color="#e59a5c" />carrier &amp; pins · output</span>
              <span><Swatch color="#3a4047" border="#59616a" />ring · fixed</span>
            </div>
            <div className="row-gap" style={{ gap: 6 }}>
              <button className="q-btn" aria-pressed={!paused} onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
              <a className="q-btn" href="#explorer" onClick={(e) => { e.preventDefault(); openInExplorer('gearbox'); }}>Isolate in 3D →</a>
            </div>
          </figcaption>
          <p className="note">{C.figNote}</p>
        </figure>
      </div>
    </section>
  );
}
