import { useCallback, useMemo, useState } from 'react';
import { ARTICLE_URL, HERO, HERO_STATS } from '../content/sections';
import { ViewerCanvas } from '../viewer/ViewerCanvas';
import { ViewerEngine } from '../viewer/engine';
import { Arrow } from './ui';

export function Hero() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState('Loading CAD geometry…');
  const engine = useMemo(() => new ViewerEngine('hero', {
    onReady: () => { performance.mark('qdd-hero-ready'); setStatus('ready'); },
  }), []);
  const onStatus = useCallback((s: 'ready' | 'error', m?: string) => {
    if (s === 'error') { setStatus('error'); if (m) setMsg(m); }
  }, []);

  return (
    <section className="wrap hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="rule" aria-hidden="true" /><span>{HERO.kicker}</span></div>
        <h1 id="hero-title">Anatomy of an <span className="heavy">Ironless</span> QDD Actuator</h1>
        <p className="hero-lede">{HERO.lede}</p>
        <div className="row-gap">
          <a className="q-cta" href="#explorer">Explore the actuator <Arrow /></a>
          <a className="q-ghost" href={ARTICLE_URL} target="_blank" rel="noopener">Original article ↗</a>
        </div>
      </div>
      <figure className="hero-figure">
        <div className="hero-stage" data-status={status}>
          <ViewerCanvas engine={engine} onStatus={onStatus} label={HERO.canvasLabel} interactive={false}>
            {status !== 'ready' && <div className="viewer-status"><span className={status === 'loading' ? 'pulse' : ''}>{msg}</span></div>}
          </ViewerCanvas>
          <figcaption className="hero-cap">
            <span>{HERO.renderNote}</span>
            <span className="q-hide-sm">{HERO.sizeNote}</span>
          </figcaption>
        </div>
      </figure>
      <div role="list" aria-label="Key figures" className="hero-stats">
        {HERO_STATS.map((s) => (
          <div role="listitem" key={s.l} className="hero-stat">
            <span className="v">{s.v}{s.u && <span className="u">{s.u}</span>}</span>
            <span className="l">{s.l}</span>
            <span className="q">{s.q}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
