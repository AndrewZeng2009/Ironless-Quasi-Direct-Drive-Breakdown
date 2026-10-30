# Anatomy of an Ironless QDD Actuator

An interactive 3D teardown of Caden Kraft's open-source ironless Halbach quasi-direct-drive actuator.
Independent educational visualization — not an official or endorsed site.
**Credit: Caden Kraft (GitHub: CKraft11)** · original design MIT-licensed:
<https://github.com/CKraft11/Ironless-QDD-Actuator>

Read `CLAUDE.md` (content and engineering rules) and `BUILD_BRIEF.md` before changing anything.

## Commands

```bash
npm install
npx playwright install chromium   # once, for the tests
npm run dev        # dev server on http://localhost:5173
npm run build      # type-check (tsc -b) + production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run test:e2e   # builds, serves, and runs the Playwright smoke tests
```

The tests save one screenshot per viewer mode to `tests/screenshots/`. They run WebGL on SwiftShader,
so they need no GPU (and are slow: a few minutes).

## Layout

| Path | What it is |
|---|---|
| `src/content/` | All copy and figures (with evidence tags), verbatim from the prototype. `svgPaths.ts` is generated. |
| `src/viewer/engine.ts` | Viewer behaviour ported from `reference/prototype/qdd-engine.js`: camera rig, input, picking, explode, section, kinematics, coil glow, tints, leader labels, torque path. |
| `src/viewer/ViewerCanvas.tsx`, `Actuator.tsx` | React Three Fiber canvas, lights/environment, and the scene graph built from the GLB. |
| `src/viewer/store.ts` | zustand store for the Explorer UI state. |
| `src/sections/` | One component per page section. |
| `public/models/` | `actuator.glb`, `actuator.parts.json`, and `decals.json` (silkscreen/capacitor-top quads). |
| `scripts/` | `extract_decals.py` (decals from the prototype's `qdd-model.json`) and `extract_svg_paths.py` (CAD section paths from the prototype page). |
| `reference/` | The handoff reference: prototype, renders, sources, pipeline. Not shipped. |

## Notes on the model

- The GLB is in mm with +Y as the motor axis and is not modified. In code the root is scaled ×0.1 so the
  prototype's camera presets carry over unchanged.
- The GLB carries positions only: normals are computed on load (its vertices are already split at creases),
  materials come from `src/viewer/materials.ts`, and the decal meshes come from `decals.json`.
- Section views render back faces in a flat cut colour; mode tints and coil glow are carried onto the cut faces
  so the motor cross-section reads. Magnets get a small depth bias so they win over their rotor-pocket floors.

## Deploy

`dist/` is a static site (relative base path). Serve `.glb`/`.json` with gzip or brotli.

**GitHub Pages:** `.github/workflows/deploy.yml` builds and publishes on every push to `main`.
One-time setup: in the repository on GitHub, open Settings → Pages and set Source to "GitHub Actions".
The site then appears at `https://<user>.github.io/<repo>/`.

Don't open `dist/index.html` straight from disk — browsers block loading the model from `file://`.
Use `npm run preview` instead.
