import { useState } from 'react';
import {
  BIG_STATS, BOM, EVIDENCE_CHIPS, EVIDENCE_COLORS, FIGURES, PERF_COPY as C, TRADES, type Evidence,
} from '../content/sections';
import { SectionHead } from './ui';

export function Performance() {
  const [ev, setEv] = useState<Evidence | 'all'>('all');
  const figs = FIGURES.filter((f) => ev === 'all' || f.ev === ev);
  return (
    <section id="performance" className="wrap sec" aria-labelledby="perf-title">
      <SectionHead kicker={C.kicker} title={C.title} id="perf-title">
        <p className="body">{C.lede}</p>
      </SectionHead>

      <div className="big-stats">
        {BIG_STATS.map((s) => (
          <div key={s.l} style={{ borderTopColor: s.col }}>
            <span className="tag" style={{ color: s.col }}>{s.tag}</span>
            <span className="v">{s.v}<span className="u">{s.u}</span></span>
            <span className="l">{s.l}</span>
            <span className="q">{s.q}</span>
          </div>
        ))}
      </div>

      <div className="split" style={{ gap: 28 }}>
        <div className="col" style={{ flex: '1.2 1 480px', gap: 14 }}>
          <div className="row-gap" role="group" aria-label="Filter figures by evidence type" style={{ alignItems: 'center', gap: 8 }}>
            <span className="eyebrow" style={{ color: '#8b939b', marginRight: 6, letterSpacing: '0.08em' }}>Evidence</span>
            {EVIDENCE_CHIPS.map(([k, label]) => (
              <button key={k} className="q-chip" aria-pressed={ev === k} onClick={() => setEv(k)}>{label}</button>
            ))}
          </div>
          <ul aria-label="Figures" aria-live="polite" className="figs">
            {figs.map((f) => (
              <li key={f.l}>
                <span className="v">{f.v}</span>
                <span className="col" style={{ gap: 5 }}>
                  <span className="row-gap" style={{ gap: 8, alignItems: 'center' }}>
                    <span className="l">{f.l}</span>
                    <span className="ev" style={{ background: EVIDENCE_COLORS[f.ev] }}>{f.tag}</span>
                  </span>
                  <span className="q">{f.q}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="col" style={{ flex: '1 1 380px', gap: 14 }}>
          <h3 className="h3">{C.connectTitle}</h3>
          <div className="panel math-panel">
            <div><span className="dim">holding torque</span><br />117.5 N × 0.250 m arm = <span className="hi">29.4 N·m</span></div>
            <div><span className="dim">torque-to-weight</span><br />29.4 N·m ÷ 0.728 kg = <span className="hi">40.4 N·m/kg</span></div>
            <div><span className="dim">cost per N·m (article: $2.47/N·m)</span><br />BOM sum $72.62 ÷ 29.4 N·m = <span className="hi">$2.47</span><br /><span className="dim">the rounded $70 ÷ 29.4 gives $2.38 — the article’s figure matches the exact BOM total</span></div>
            <div><span className="dim">rough ideal ceiling (our estimate, not a source figure)</span><br />K<sub>t</sub> ≈ 8.27 / K<sub>v</sub> = 8.27 / 79 ≈ 0.105 N·m/A<br />× 50 A × 7 ≈ <span className="hi">37 N·m</span> before losses and saturation<br /><span className="dim">29.4 N·m is ~80% of that. The 8.27/Kv rule assumes ideal sinusoidal FOC conventions; treat it as order-of-magnitude.</span></div>
          </div>
          <h3 className="h3" style={{ marginTop: 10 }}>{C.bomTitle}</h3>
          <table className="bars bom" aria-label="BOM cost by item">
            <tbody>
              {BOM.map(([name, v]) => (
                <tr key={name} title={`${name}: $${v.toFixed(2)}`}>
                  <td>{name}</td>
                  <td className="track"><span style={{ width: (v / 30 * 100).toFixed(1) + '%', background: name === 'MKS XDrive Mini' ? '#5f6870' : '#9aa3ab' }} /></td>
                  <td className="num">${v.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note" style={{ fontSize: 10.5, lineHeight: 1.5 }}>{C.bomNote}</p>
        </div>
      </div>

      <h3 className="trades-title">{C.tradesTitle}</h3>
      <div className="trades">
        {TRADES.map((t) => (
          <article key={t.title}>
            <h4>{t.title}</h4>
            <p><span aria-hidden="true" style={{ color: '#7cc4e0' }} className="mono">+</span><span><span className="sr-only">Strength: </span>{t.plus}</span></p>
            <p><span aria-hidden="true" style={{ color: '#e59a5c' }} className="mono">−</span><span><span className="sr-only">Cost: </span>{t.minus}</span></p>
            <span className="note" style={{ fontSize: 10.5 }}>{t.src}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
