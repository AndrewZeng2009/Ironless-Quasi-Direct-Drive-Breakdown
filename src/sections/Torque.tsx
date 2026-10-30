import { FLOW, TORQUE_COPY as C } from '../content/sections';
import { TORQUE_STEPS } from '../content/explorer';
import { explorerEngine, useExplorer } from '../viewer/store';
import { openInExplorer } from './ui';

export function Torque() {
  const tstep = useExplorer((s) => s.torqueStep);
  const setStep = (n: number) => { useExplorer.setState({ torqueStep: n }); explorerEngine.setTorqueStep(n); };
  return (
    <section id="torque" className="band" aria-labelledby="torque-title">
      <div className="wrap sec-in">
        <div className="between" style={{ flexWrap: 'wrap', alignItems: 'end', gap: '20px 40px', marginBottom: 30 }}>
          <div className="sec-head" style={{ maxWidth: '46rem', marginBottom: 0 }}>
            <span className="kicker">{C.kicker}</span>
            <h2 id="torque-title" className="h2 h2-sec">{C.title}</h2>
          </div>
          <a className="q-cta" href="#explorer" onClick={(e) => {
            e.preventDefault();
            openInExplorer('torque', () => explorerEngine.setTorqueStep(useExplorer.getState().torqueStep || 1));
          }}>{C.cta}</a>
        </div>
        <ol aria-label="Energy and torque flow, schematic" className="flow">
          {FLOW.map(([t, s], i) => {
            const on = s === tstep, past = s < tstep, out = s >= 5;
            return (
              <li key={t}>
                <span className="chip" aria-current={on ? 'step' : undefined} style={{
                  color: on ? '#0b0d0f' : past ? '#ecebe6' : '#9aa3ab',
                  background: on ? (out ? '#e59a5c' : '#7cc4e0') : 'transparent',
                  borderColor: on ? (out ? '#e59a5c' : '#7cc4e0') : past ? 'rgba(214,222,230,0.4)' : 'rgba(214,222,230,0.16)',
                }}>{t}</span>
                {i < FLOW.length - 1 && <span aria-hidden="true" className="arr">→</span>}
              </li>
            );
          })}
        </ol>
        <div role="group" aria-label="Torque path steps" className="tcards">
          {TORQUE_STEPS.map((t, i) => (
            <button key={t.short} className="q-cell" aria-pressed={tstep === i + 1} onClick={() => setStep(i + 1)} style={{ gap: 12, padding: 18 }}>
              <span className="between" style={{ width: '100%', alignItems: 'center' }}>
                <span className="tnum" style={{ color: i >= 3 ? '#e59a5c' : '#7cc4e0' }}>{i + 1}</span>
                <span className="eyebrow" style={{ fontSize: 10, color: '#8b939b', letterSpacing: '0.08em' }}>{t.tag}</span>
              </span>
              <span className="cell-title">{t.title}</span>
              <span className="cell-body">{t.body}</span>
            </button>
          ))}
        </div>
        <p className="note" style={{ marginTop: 18, maxWidth: '70rem' }}>{C.note}</p>
      </div>
    </section>
  );
}
