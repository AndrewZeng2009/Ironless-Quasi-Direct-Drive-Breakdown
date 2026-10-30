import { STACK, STACK_COPY as C, STACK_FACTS } from '../content/sections';
import { goToGroup } from '../viewer/store';
import { openInExplorer, SectionHead } from './ui';

export function Assembly() {
  return (
    <section id="stack" className="wrap sec" aria-labelledby="stack-title">
      <div className="split" style={{ gap: '32px 56px' }}>
        <div className="col" style={{ flex: '1 1 340px', gap: 16 }}>
          <SectionHead kicker={C.kicker} title={C.title} id="stack-title" />
          <p className="body">{C.p1}</p>
          <p className="body">{C.p2}</p>
          <div className="row-gap" style={{ marginTop: 4 }}>
            <a className="q-btn" href="#explorer" onClick={(e) => { e.preventDefault(); openInExplorer('sequence'); }}>{C.cta}</a>
          </div>
          <dl className="facts">
            {STACK_FACTS.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd className="v">{f.v}</dd>
                <dd className="q">{f.q}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ol aria-label={C.listLabel} className="stack-list">
          {STACK.map((s, i) => (
            <li key={s.name}>
              <a href="#explorer" onClick={(e) => {
                e.preventDefault();
                openInExplorer('explore');
                goToGroup(s.group);
              }}>
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="txt">
                  <span className="name">{s.name}</span>
                  <span className="note-s">{s.note}</span>
                </span>
                <span className="show">
                  <span aria-hidden="true" className="bar" style={{ width: s.bar, background: s.col }} />
                  <span className="lbl">Show<span className="sr-only"> {s.name} in the 3D explorer</span></span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
