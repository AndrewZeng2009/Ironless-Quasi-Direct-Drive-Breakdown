# Build brief — "Anatomy of an Ironless QDD Actuator"

A premium, interactive engineering exhibit for Caden Kraft's open-source 3D-printed quasi-direct-drive
actuator (ironless Halbach outrunner + 7:1 cycloidal-profile planetary). A full working prototype exists
(`reference/prototype/`, renders in `reference/renders/`); this brief turns it into a production site.

## 1. What's in this folder
| Path | What it is |
|---|---|
| `assets/actuator.glb` | The actuator, 95 named mesh nodes, mm, +Y = motor axis. Decimated Fusion 360 display mesh from the author's `.f3d`; controller replaced by a dimensioned MKS XDrive Mini model. |
| `assets/actuator.parts.json` | Per-node metadata: `group`, `kinematics` (`static`/`input`/`carrier`/`planet`), `planet` index, `explodeY_mm`, `stage` (1–6), `coilIndex`, `magnetPolarity`, `materialKey`; plus `planetCenters_xz_mm` and lobe counts. |
| `assets/qdd-model.json` | Same geometry in the prototype's quantized format (only needed if you port the vanilla engine). |
| `assets/svg-profiles.json` | 2D sections cut from the CAD: sun/planet/ring/carrier/pins (gearbox mid-plane), stator, coil outline, magnet angles. Units mm, SVG coords (x right, y down = top view). |
| `assets/fusion-preview.png` | Preview thumbnail embedded in the author's CAD file (a render, not a photo). |
| `reference/prototype/Main.dc.html` | The designed page: all copy, layout, colours, section order, interactions. Treat as the design source of truth. |
| `reference/prototype/qdd-engine.js` | Working three.js viewer: materials, studio PMREM environment, explode, section clipping with cut-face colour, picking, overlay leader labels, gearbox kinematics, coil phase glow, decals (silkscreen, capacitor tops). Port this logic. |
| `reference/sources/` | Repo README, BOM.xlsx, MKS XDrive Config.json, 36N42P winding scheme, Makerbase XDrive Mini size drawing + pinout + photos. |
| `reference/pipeline/` | Python scripts that decoded the `.f3d`, rebuilt the scene graph, decimated meshes and built the controller. Reproducibility only. |

## 2. Stack & structure
- Vite + React 18 + TypeScript, `three@0.160+`, `@react-three/fiber`, `@react-three/drei`, `zustand`.
- Fonts (Google): **Archivo** (variable width 62–125, used at 112–125% for display) + **IBM Plex Mono** for data/annotations.
- Palette: bg `#0b0d0f`, panel `#101316`/`#15191d`, lines `rgba(214,222,230,.12)`, ink `#ecebe6`, secondary `#b4bac0`, muted `#8b939b`, accent steel-cyan `#7cc4e0` (input / interaction), output orange `#e59a5c`, copper `#c47b4f`.
- Suggested layout: `src/sections/*` (Hero, Explorer, Assembly, Motor, Gearbox, Torque, Performance, Build, Source), `src/viewer/*` (Scene, Actuator, materials, controls, labels, kinematics, store), `src/content/*.ts` (all copy + figures with evidence tags + sources), `public/models/`.
- Deploy target: static (Vercel / Netlify / GitHub Pages). GLB served with gzip/brotli; consider Draco/meshopt compression via `gltf-transform` (keep node names).

## 3. The 3D model contract
- Group nodes by `group` (22 groups: housing, frame, retainer, cover, stator, coils, rotor, magMain, magHal, sun, planets, ring, carrier, pins, pbearings, b6710, b6805, axle, fasteners, encoder, pcb, encplate, terminals, xt30). Names/descriptions per group are in the prototype's `info()` and `GROUPS`.
- **Explode**: translate each node by `explodeY_mm × t` along +Y (t ∈ 0..1). Camera distance grows ~×1.6 and target drops ~23 mm at full explode.
- **Kinematics** (exact for measured lobes sun 6 / planet 15 / ring 36; ring fixed): carrier angle θ; input nodes (rotor, magnets, sun, encoder) rotate 7θ about Y through the origin; carrier nodes rotate θ; planet nodes orbit θ about the origin **and** spin −2.4θ about their own centre (`planetCenters_xz_mm`). Same sign convention for all rotations.
- **Coil phase glow**: winding string `AabBCcaABbcC` repeated ×3 (index = coilIndex mod 12; capital = +, lower = −). Current ∝ sign·cos(θe − phase·120°), θe = 21 × rotor angle. Warm emissive for +, cool for −. Illustrative timing.
- **Magnet tint (motor mode)**: `magnetPolarity` 0/1 alternate; main poles orange/blue, Halbach lighter tints. Inferred polarity — label it.
- `terminals` group (stock XDrive screw terminals) is **hidden by default** (would intersect the printed cover); user can toggle it.
- Silkscreen/capacitor-top decals are generated at runtime (see `decalTexture()` in the engine) — reproduce them with CanvasTexture or bake to textures.
- Section views: clipping plane through the axis (half cut) and a radial plane at mid-height (motor cross-section); render back faces with a flat "cut" colour.

## 4. Sections (copy and order exactly as in `Main.dc.html`)
1. **Hero** — live auto-rotating model with slow light orbit; headline "Anatomy of an Ironless QDD Actuator"; CTA "Explore the actuator"; five key figures with evidence qualifiers.
2. **Explorer (centrepiece)** — modes: Explore · Build sequence (6 stages) · Gearbox · Motor section · Follow the torque. Orbit/zoom/pan (mouse, touch, keyboard), camera presets, explode slider + animate, section toggle, labels toggle, reset; parts list by category with select / show-hide / isolate; info card per part with sources; hover highlight; overlay leader labels; scroll-zoom only after the user clicks the canvas.
3. **Exploded assembly** — axial stack list (output face → controller) where each row explodes + frames that part.
4. **Inside the motor** — CAD cross-section SVG (stator, coils with phase colours, 84 magnets with magnetisation arrows, 0.70 mm air-gap inset, optional flux sketch); 2×2 rotor comparison + FEMM bar chart (1.017 / 0.929 / 0.928 / 0.737 N·m, comparative only).
5. **Gearbox** — animated CAD-profile SVG (CSS rotations: carrier 42 s, sun 6 s, planets −17.5 s relative); ratio math; the author's reasons for lobe profiles; play/pause; "Isolate in 3D".
6. **Follow the torque** — 5 step cards + schematic chip flow synced to the 3D torque mode.
7. **Performance & trade-offs** — headline stats, evidence filter chips, derivations (117.5 N × 0.25 m; 29.4 / 0.728; BOM $72.62 / 29.4 = $2.47/N·m), BOM cost bars, 8 trade-off cards.
8. **CAD → hardware** — 7 build steps; only genuine project images (Fusion preview, winding scheme); article photos are links.
9. **Open source** — credit, licence, links, "how this was made / limits" disclosure.

## 5. Quality bar
Industrial-design portfolio × product launch × museum exhibit. Dark graphite, editorial typography with strong scale contrast, restrained accents, purposeful motion, no gratuitous glow or gradients. Everything interactive must actually work. Responsive to 360 px (viewer ≥ 440 px tall on mobile, panel stacks under it).

## 6. Acceptance checklist
- [ ] Model loads, all 22 groups selectable, info card + sources shown.
- [ ] Explode is axial and reversible; build sequence animates stages 1→6.
- [ ] Gearbox mode: sun/planets/carrier move with exact 7:1 kinematics, no visible interpenetration; readout shows input vs output revolutions.
- [ ] Motor mode: radial cut, magnets tinted, coil phase glow.
- [ ] Torque mode: 5 steps highlight the right groups + schematic path labelled "not physical routing".
- [ ] All evidence labels and caveats from §CLAUDE.md present; no invented numbers.
- [ ] Keyboard + reduced-motion + contrast pass; Lighthouse performance ≥ 80 desktop.
- [ ] Playwright smoke test screenshots for each mode committed.

## 7. Sources (only these)
- Repo: https://github.com/CKraft11/Ironless-QDD-Actuator (README, BOM.xlsx, MKS XDrive Config.json, 36N42P Winding Scheme.png; MIT + credit)
- Article: https://cadenkraft.com/ironless-cycloidal-planetary-actuator/
- Original CAD: `Caden Kraft Quasi Direct Drive Actuator.f3d` (geometry already extracted into `assets/`)
- MKS XDrive Mini: https://makerbase3d.com/product/makerbase-xdrive-mini-high-precision-brushless-servo-motor-controller-based-on-odrive3-6-with-as5047p-on-board/ and size drawing/pinout via https://github.com/Smurf/xdrive-mini-docs
- MakerWorld mirror: https://makerworld.com/en/models/2042262-caden-kraft-s-qdd-cycloidal-planetary-actuator
