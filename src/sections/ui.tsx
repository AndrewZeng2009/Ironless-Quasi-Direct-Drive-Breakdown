import type { ReactNode } from 'react';
import type { Mode } from '../content/explorer';
import { explorerEngine, useExplorer } from '../viewer/store';

export function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function SectionHead({ kicker, title, id, children, max = '50rem' }: { kicker: string; title: ReactNode; id: string; children?: ReactNode; max?: string }) {
  return (
    <div className="sec-head" style={{ maxWidth: max }}>
      <span className="kicker">{kicker}</span>
      <h2 id={id} className="h2 h2-sec">{title}</h2>
      {children}
    </div>
  );
}

export function Swatch({ color, border }: { color: string; border?: string }) {
  return <span aria-hidden="true" className="sw" style={{ background: color, border: border ? `1px solid ${border}` : undefined }} />;
}

/** Switch the Explorer to a mode and scroll it into view. */
export function openInExplorer(mode: Mode, after?: () => void) {
  useExplorer.getState().setMode(mode);
  after?.();
  const el = document.getElementById('explorer');
  if (el) {
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // move keyboard focus to the viewer so keys work immediately
    setTimeout(() => (document.querySelector('[data-testid=explorer-canvas]') as HTMLElement | null)?.focus({ preventScroll: true }), 400);
  }
  return explorerEngine;
}
