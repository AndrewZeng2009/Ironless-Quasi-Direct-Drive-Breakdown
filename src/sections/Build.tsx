import { ARTICLE_URL, BUILD_COPY as C, BUILD_STEPS, CONFIG } from '../content/sections';
import { SectionHead } from './ui';

export function Build() {
  return (
    <section id="build" className="band" aria-labelledby="build-title">
      <div className="wrap sec-in">
        <SectionHead kicker={C.kicker} title={C.title} id="build-title">
          <p className="body">{C.lede}</p>
        </SectionHead>
        <div className="build-grid">
          {BUILD_STEPS.map((s) => (
            <article key={s.n} className="build-card">
              {s.img && (
                <div className="build-img">
                  <img src={s.img.src} alt={s.img.alt} width={s.img.w} height={s.img.h} loading="lazy" decoding="async" />
                </div>
              )}
              <div className="build-body">
                <span className="eyebrow" style={{ color: 'var(--acc)' }}>{s.n} · {s.kicker}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {s.cfg && (
                  <dl className="cfg">
                    {CONFIG.map((c) => (
                      <div key={c.k} style={{ display: 'contents' }}><dt>{c.k}</dt><dd>{c.v}</dd></div>
                    ))}
                  </dl>
                )}
                <span style={{ flex: 1 }} />
                <span className="note" style={{ fontSize: 10.5, lineHeight: 1.5 }}>{s.cap}</span>
                {s.link && <a href={ARTICLE_URL} target="_blank" rel="noopener" className="mono" style={{ fontSize: 12, lineHeight: 1.4 }}>{s.link} ↗</a>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
