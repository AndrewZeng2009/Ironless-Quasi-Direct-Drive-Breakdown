import { ARTICLE_URL, LINKS, REPO_URL, SOURCE_COPY as C } from '../content/sections';

export function Source() {
  return (
    <section id="source" className="wrap source" aria-labelledby="source-title">
      <div className="split" style={{ gap: '40px 64px' }}>
        <div className="col" style={{ flex: '1 1 420px', gap: 22 }}>
          <span className="kicker">{C.kicker}</span>
          <h2 id="source-title" className="source-title">Designed by<br /><span className="heavy">Caden Kraft.</span></h2>
          <p className="source-lede">{C.lede}</p>
          <div className="row-gap">
            <a className="q-cta" href={REPO_URL} target="_blank" rel="noopener">Open the repository ↗</a>
            <a className="q-ghost" href={ARTICLE_URL} target="_blank" rel="noopener">Read the article ↗</a>
          </div>
          <div className="panel" style={{ padding: 18, gap: 10, borderColor: 'rgba(214,222,230,0.14)' }}>
            <span className="eyebrow" style={{ color: '#9aa3ab' }}>Licence &amp; attribution</span>
            <p className="body-s" style={{ color: '#c3c9ce', fontSize: 14 }}>{C.licence}</p>
            <p className="body-s" style={{ color: '#c3c9ce', fontSize: 14 }}>{C.independent}</p>
          </div>
        </div>
        <div className="col" style={{ flex: '1 1 420px' }}>
          <h3 className="eyebrow links-head">Project files</h3>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a className="q-link" href={l.href} target="_blank" rel="noopener">
                  <span className="col" style={{ gap: 4 }}><span>{l.t}</span><span className="d">{l.d}</span></span>
                  <span aria-hidden="true" className="ext">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="how">
        <summary>{C.howTitle}</summary>
        <div className="how-grid">
          {C.how.map(([k, v]) => <p key={k}><strong>{k}</strong> {v}</p>)}
        </div>
      </details>

      <footer className="foot">
        <span>{C.footerLeft}</span>
        <span>Credit: Caden Kraft (GitHub: CKraft11)</span>
        <span>{C.footerRight}</span>
        <span>Independent educational visualization — not an official or endorsed site.</span>
      </footer>
    </section>
  );
}
