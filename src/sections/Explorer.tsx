import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  CATEGORIES, GROUPS, GROUP_KEYS, INFO, SWATCH, stageOf, stageTitle, type GroupKey,
} from '../content/parts';
import { EXPLORER_COPY as C, TABS, TORQUE_STEPS, modeInfo, viewButtons } from '../content/explorer';
import { ViewerCanvas } from '../viewer/ViewerCanvas';
import { explorerEngine as E, stopSequence, toggleSequence, useExplorer } from '../viewer/store';

export function Explorer() {
  return (
    <section id="explorer" className="wrap explorer" aria-labelledby="explorer-title">
      <div className="explorer-head">
        <div className="intro">
          <span className="kicker">{C.kicker}</span>
          <h2 id="explorer-title" className="h2">{C.title}</h2>
          <p className="lede">{C.intro}</p>
        </div>
        <p className="note keys">{C.keys}</p>
      </div>
      <ModeTabs />
      <div className="explorer-body">
        <div className="stage-card">
          <Stage />
          <Toolbar />
        </div>
        <aside className="side" aria-label="Components">
          <InfoCard />
          <PartsList />
        </aside>
      </div>
      <p className="note" style={{ marginTop: 14, maxWidth: '70rem' }}>{C.geometryNote}</p>
    </section>
  );
}

function ModeTabs() {
  const mode = useExplorer((s) => s.mode);
  const setMode = useExplorer((s) => s.setMode);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let j = -1;
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = TABS.length - 1;
    if (j < 0) return;
    e.preventDefault();
    setMode(TABS[j][0]);
    refs.current[j]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label="Explorer mode">
      {TABS.map(([m, label], i) => (
        <button
          key={m}
          ref={(el) => { refs.current[i] = el; }}
          className="q-btn"
          role="tab"
          id={'tab-' + m}
          aria-selected={mode === m}
          aria-controls="explorer-stage"
          tabIndex={mode === m ? 0 : -1}
          data-mode={m}
          onClick={() => setMode(m)}
          onKeyDown={(e) => onKey(e, i)}
        >
          <span className="n">{'0' + (i + 1)}</span>{label}
        </button>
      ))}
    </div>
  );
}

function Stage() {
  const status = useExplorer((s) => s.status);
  const loadMsg = useExplorer((s) => s.loadMsg);
  const mode = useExplorer((s) => s.mode);
  const stage = useExplorer((s) => s.stage);
  const tstep = useExplorer((s) => s.torqueStep);
  const hover = useExplorer((s) => s.hover);
  const selected = useExplorer((s) => s.selected);
  const wheelHint = useExplorer((s) => s.wheelHint);
  const [hint, setHint] = useState(false);
  const onStatus = useCallback((s: 'ready' | 'error', msg?: string) => {
    if (s === 'error') useExplorer.getState().setStatus('error', msg);
  }, []);

  useEffect(() => {
    if (!wheelHint) return;
    setHint(true);
    const t = setTimeout(() => setHint(false), 1600);
    return () => clearTimeout(t);
  }, [wheelHint]);

  const [title, sub] = modeInfo(mode, stage, tstep);
  const isKin = mode === 'gearbox' || mode === 'motor' || mode === 'torque';
  return (
    <div className="stage" id="explorer-stage" role="tabpanel" aria-labelledby={'tab-' + mode} data-status={status} data-mode={mode}>
      <ViewerCanvas engine={E} onStatus={onStatus} label={C.canvasLabel} interactive overlay>
        {status !== 'ready' && (
          <div className="viewer-status"><span className={status === 'loading' ? 'pulse' : ''}>{loadMsg}</span></div>
        )}
        <div className="stage-mode">
          <span className="t">{title}</span>
          <span className="h" aria-live="polite">{sub}</span>
        </div>
        {hover && hover !== selected && <div className="stage-hover">{GROUPS[hover].name}</div>}
        {isKin && mode === 'gearbox' && (
          <div ref={(el) => { E.readout = el; }} className="stage-readout" aria-live="off">
            INPUT (sun + rotor) 0.00 rev → OUTPUT (carrier) 0.00 rev
          </div>
        )}
        {hint && <div className="stage-hint" role="status">Click the model, then scroll to zoom</div>}
      </ViewerCanvas>
    </div>
  );
}

function Toolbar() {
  const mode = useExplorer((s) => s.mode);
  const exploded = useExplorer((s) => s.exploded);
  const stage = useExplorer((s) => s.stage);
  const seqPlaying = useExplorer((s) => s.seqPlaying);
  const tstep = useExplorer((s) => s.torqueStep);
  const playing = useExplorer((s) => s.playing);
  const openTop = useExplorer((s) => s.openTop);
  const section = useExplorer((s) => s.section);
  const labels = useExplorer((s) => s.labels);
  const slider = useRef<HTMLInputElement>(null);

  useEffect(() => {
    E.onExplodeValue = (x) => {
      const el = slider.current; if (!el) return;
      el.value = String(Math.round(x * 100));
      el.setAttribute('aria-valuetext', `Exploded view ${Math.round(x * 100)}%`);
    };
    if (slider.current) slider.current.value = String(Math.round(E.explode * 100));
    return () => { E.onExplodeValue = null; };
  }, [mode]);

  const isKin = mode === 'gearbox' || mode === 'motor' || mode === 'torque';
  return (
    <div className="toolbar">
      <div className="grp" role="group" aria-label="Camera presets">
        {viewButtons(mode).map(([v, label]) => (
          <button key={v} className="q-btn" onClick={() => E.setView(v)}>{label}</button>
        ))}
      </div>
      <span className="sep" aria-hidden="true" />
      {mode === 'explore' && (
        <>
          <div className="explode-ctl">
            <label htmlFor="qdd-explode">Explode</label>
            <input
              id="qdd-explode" ref={slider} className="q-range" type="range" min={0} max={100} step={1} defaultValue={0}
              aria-valuetext="Exploded view 0%"
              onInput={(e) => {
                const v = Number((e.target as HTMLInputElement).value) / 100;
                E.setExplode(v);
                (e.target as HTMLInputElement).setAttribute('aria-valuetext', `Exploded view ${Math.round(v * 100)}%`);
                useExplorer.setState({ exploded: v > 0.5 });
              }}
            />
          </div>
          <button className="q-btn" aria-pressed={exploded} data-action="explode" onClick={() => E.animateExplode(exploded ? 0 : 1)}>
            {exploded ? 'Assemble' : 'Explode'}
          </button>
        </>
      )}
      {mode === 'sequence' && (
        <div className="grp">
          <button className="q-btn" aria-label="Previous stage" onClick={() => { stopSequence(); E.setStage(Math.max(1, stage - 1)); }}>←</button>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} className="q-btn" aria-pressed={stage === n} aria-label={`Stage ${n}: ${stageTitle(n)}`}
              onClick={() => { stopSequence(); E.setStage(n); }}>{n}</button>
          ))}
          <button className="q-btn" aria-label="Next stage" onClick={() => { stopSequence(); E.setStage(Math.min(6, stage + 1)); }}>→</button>
          <button className="q-btn" aria-pressed={seqPlaying} onClick={toggleSequence}>{seqPlaying ? 'Pause' : 'Play build'}</button>
        </div>
      )}
      {mode === 'torque' && (
        <div className="grp" role="group" aria-label="Torque path steps">
          {TORQUE_STEPS.map((t, i) => (
            <button key={t.short} className="q-btn" aria-pressed={tstep === i + 1} onClick={() => E.setTorqueStep(i + 1)}>
              <span style={{ color: i >= 3 ? 'var(--out)' : 'var(--acc)' }}>{i + 1}</span>{t.short}
            </button>
          ))}
        </div>
      )}
      {isKin && (
        <button className="q-btn" aria-pressed={playing} onClick={() => E.setPlaying(!playing)}>
          {playing ? 'Pause motion' : 'Play motion'}
        </button>
      )}
      {mode === 'gearbox' && (
        <button className="q-btn" aria-pressed={openTop} onClick={() => E.setOpenTop(!openTop)}>Lid off</button>
      )}
      <div className="grp end">
        <button className="q-btn" aria-pressed={section} onClick={() => E.setSection(!section)}>Section</button>
        <button className="q-btn" aria-pressed={labels} onClick={() => { E.setLabels(!labels); useExplorer.setState({ labels: !labels }); }}>Labels</button>
        <button className="q-btn" onClick={() => {
          stopSequence(); E.resetView();
          if (slider.current) slider.current.value = '0';
          useExplorer.setState({ exploded: false, selected: null });
        }}>Reset</button>
      </div>
    </div>
  );
}

function InfoCard() {
  const sel = useExplorer((s) => s.selected);
  const isolate = useExplorer((s) => s.isolate);
  if (!sel) {
    return (
      <div className="card info" data-testid="info-card">
        <span className="eyebrow" style={{ color: 'var(--acc)' }}>{C.emptyTitle}</span>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{C.emptyBody}</p>
        <p className="note" style={{ lineHeight: 1.5 }}>{C.emptyNote}</p>
      </div>
    );
  }
  const info = INFO[sel];
  return (
    <div className="card info" data-testid="info-card" data-group={sel} aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--acc)' }}>{GROUPS[sel].cat} · stage {stageOf(sel)}</span>
          <h3>{info.title}</h3>
          <span className="spec">{info.spec}</span>
        </div>
        <button className="q-icon" onClick={() => E.select(null)} aria-label="Clear selection">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      <dl>
        <dt>Function</dt><dd>{info.fn}</dd>
        <dt>Material</dt><dd>{info.mat}</dd>
        <dt>Why</dt><dd>{info.why}</dd>
        <dt>Sits</dt><dd>{info.rel}</dd>
      </dl>
      <div className="src-row">
        <span className="lbl">Sources</span>
        {info.src.map((s) => <span key={s} className="src-tag">{s}</span>)}
      </div>
      <div className="grp" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="q-btn" aria-pressed={isolate === sel} onClick={() => E.isolate(sel)}>Isolate</button>
        <button className="q-btn" onClick={() => E.focus(sel)}>Frame</button>
      </div>
    </div>
  );
}

function PartsList() {
  const vis = useExplorer((s) => s.vis);
  const sel = useExplorer((s) => s.selected);
  const hov = useExplorer((s) => s.hover);
  const iso = useExplorer((s) => s.isolate);
  const setHover = (g: GroupKey | null) => { E.setHover(g); useExplorer.setState({ hover: g }); };
  return (
    <div className="card parts">
      <div className="parts-head">
        <span className="eyebrow" style={{ color: '#9aa3ab' }}>Parts · {GROUP_KEYS.length} groups</span>
        <button className="q-btn" style={{ minHeight: 28, padding: '0 10px' }} onClick={() => E.showAll()}>Show all</button>
      </div>
      {CATEGORIES.map(([cat, label]) => {
        const items = GROUP_KEYS.filter((g) => GROUPS[g].cat === cat);
        return (
          <div key={cat}>
            <span className="parts-cat-label" id={'cat-' + cat} style={{ display: 'block' }}>{label}</span>
            <ul className="parts-cat" aria-labelledby={'cat-' + cat}>
              {items.map((g) => {
                const isVis = vis[g] !== false, isSel = sel === g, isIso = iso === g;
                const name = GROUPS[g].name;
                return (
                  <li key={g} className={'part' + (isSel ? ' sel' : hov === g ? ' hov' : '')}>
                    <button className="q-row" aria-pressed={isSel} data-group={g} style={{ opacity: isVis ? 1 : 0.55 }}
                      onClick={() => E.select(isSel ? null : g)}
                      onMouseEnter={() => setHover(g)} onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(g)} onBlur={() => setHover(null)}>
                      <span className="swatch" aria-hidden="true" style={{ background: SWATCH[g] }} />
                      <span style={{ flex: 1, minWidth: 0 }}>{name}</span>
                    </button>
                    <button className="q-icon" aria-label={(isVis ? 'Hide ' : 'Show ') + name} aria-pressed={isVis}
                      onClick={() => E.toggleVisible(g)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="8" cy="8" r={isVis ? 2.2 : 0} fill="currentColor" />
                      </svg>
                    </button>
                    <button className="q-icon" aria-label={(isIso ? 'Stop isolating ' : 'Isolate ') + name} aria-pressed={isIso}
                      style={{ color: isIso ? 'var(--acc)' : '#8b939b' }} onClick={() => E.isolate(g)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="8" cy="8" r="2" fill="currentColor" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
