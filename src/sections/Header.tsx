const NAV: [string, string][] = [
  ['#explorer', 'Explorer'], ['#stack', 'Assembly'], ['#motor', 'Motor'], ['#gearbox', 'Gearbox'],
  ['#torque', 'Torque path'], ['#performance', 'Performance'], ['#build', 'CAD → hardware'], ['#source', 'Source'],
];

export function Header() {
  return (
    <header className="wrap top">
      <a className="brand" href="#top" aria-label="QDD / Teardown — back to top">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="12.5" fill="none" stroke="#ecebe6" strokeWidth="1.2" />
          <circle cx="14" cy="14" r="5" fill="none" stroke="#7cc4e0" strokeWidth="1.2" />
          <circle cx="14" cy="5.5" r="1.4" fill="#ecebe6" />
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="brand-name">QDD / Teardown</span>
          <span className="brand-sub">Independent visualization · design by Caden Kraft</span>
        </span>
      </a>
      <nav aria-label="Sections">
        {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
    </header>
  );
}
