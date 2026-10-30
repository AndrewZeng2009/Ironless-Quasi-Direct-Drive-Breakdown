# Project rules — Ironless QDD Actuator interactive teardown

This repo builds a production website: an interactive 3D teardown of Caden Kraft's open-source
Ironless QDD Actuator. Read `BUILD_BRIEF.md` before writing code.

## Non-negotiable content rules
- Original design credit: **Caden Kraft (GitHub: CKraft11)**. MIT licence with required notice
  "Credit: Caden Kraft (GitHub: CKraft11)". The site is an independent educational visualization,
  not an official or endorsed site — say so in the footer.
- Use only figures from the sources listed in `BUILD_BRIEF.md` §7. Never invent dimensions,
  performance numbers, part numbers, photos or quotes.
- Every figure carries its evidence type: Measured (reported), Calculated, Simulated (comparative),
  Design goal, Historical estimate, CAD-derived, or Inferred.
- 29.4 N·m is a single reported **peak holding** test at the controller's 50 A limit — never call it
  continuous or rated torque. $40 / $70 are historical, pre-tariff estimates.
- FEMM torques are comparative only (the author says they are not actual actuator torque).
- Field-line drawings, magnet polarities and coil-phase timing are illustrative — label them.
- Do not hotlink or reproduce photos from cadenkraft.com; link to the article instead.

## Engineering rules
- Stack: Vite + React + TypeScript + three / @react-three/fiber / @react-three/drei, zustand for
  shared viewer state. No backend. Static deploy.
- 3D asset: `public/models/actuator.glb` + `actuator.parts.json` (see BUILD_BRIEF §3). Units mm,
  +Y is the motor axis (output face +Y, controller −Y). Do not re-orient the model in the GLB;
  apply transforms in code.
- `reference/prototype/` is a working reference (vanilla three.js engine + a Claude Design page).
  Port its behaviour; do not copy its DCLogic templating.
- Performance budget: first meaningful 3D frame < 3 s on a mid laptop; 60 fps desktop, ≥30 fps on a
  recent phone. Use `<Bvh>` (drei) for raycasting, a single WebGL canvas per view, DPR cap 2.
- Accessibility: real buttons/inputs, visible focus, keyboard controls for the viewer, aria labels,
  `prefers-reduced-motion` stops auto-rotation and animations, text contrast ≥ 4.5:1.
- Test: `npm run build` must pass with zero TS errors; add Playwright smoke tests that load the page,
  wait for the model, switch every viewer mode and take screenshots.
