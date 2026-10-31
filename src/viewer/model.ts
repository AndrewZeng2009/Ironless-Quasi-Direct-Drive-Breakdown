import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Low-poly organic parts that get softened shading (see build()). */
const SMOOTH_GROUPS = new Set(['coils', 'fasteners']);
import { GROUPS, type GroupKey, type MaterialKey } from '../content/parts';
import type { DecalKind } from './decals';

/** The GLB is authored in mm. The scene works in cm (root scale 0.1) so the
    camera presets and light rig from the prototype engine carry over unchanged. */
export const MODEL_SCALE = 0.1;

export type Kinematics = 'static' | 'input' | 'carrier' | 'planet';

interface PartsJsonNode {
  node: string;
  group: GroupKey;
  kinematics: Kinematics;
  planet: number | null;
  explodeY_mm: number;
  materialKey: MaterialKey | null;
  fastenerKind: string | null;
  coilIndex: number | null;
  magnetPolarity: number | null;
  stage: number;
}
interface PartsJson {
  units: string;
  planetCenters_xz_mm: Record<string, [number, number]>;
  lobes: { sun: number; planet: number; ring: number };
  nodes: PartsJsonNode[];
}
interface DecalsJson {
  decals: {
    group: GroupKey; texture: DecalKind; kinematics: Kinematics; stage: number; explodeY_mm: number;
    position: number[]; normal: number[]; uv: number[]; index: number[];
  }[];
}

/** One renderable node of the actuator. Geometry is in mm; planet geometry is re-centred
    on its own axis so it can spin about it. */
export interface NodeDef {
  name: string;
  group: GroupKey;
  kinematics: Kinematics;
  planet: number | null;
  explodeY: number; // mm at full explode
  stage: number;
  coilIndex: number | null;
  polarity: number | null;
  materialKey: MaterialKey;
  decal: DecalKind | null;
  center: THREE.Vector3 | null; // planet axis (mm)
  geometry: THREE.BufferGeometry;
  bbox: THREE.Box3; // assembled, mm
}

export interface ModelData {
  nodes: NodeDef[];
  lobes: PartsJson['lobes'];
}

const base = import.meta.env.BASE_URL;
export const MODEL_URLS = {
  glb: base + 'models/actuator.glb',
  parts: base + 'models/actuator.parts.json',
  decals: base + 'models/decals.json',
};

let pending: Promise<ModelData> | null = null;

/** Loads the GLB + metadata once and shares geometry between viewers. */
export function loadModel(onProgress?: (fraction: number) => void): Promise<ModelData> {
  if (!pending) {
    pending = build(onProgress).catch((e) => { pending = null; throw e; });
  }
  return pending;
}

/** Quantized (integer, normalized) positions can't hold transformed coordinates, so convert to
    float32 before baking the node transform into the geometry. */
function toFloatPositions(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  if (pos.array instanceof Float32Array && !pos.normalized) return g;
  const f = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { f[i * 3] = pos.getX(i); f[i * 3 + 1] = pos.getY(i); f[i * 3 + 2] = pos.getZ(i); }
  g.setAttribute('position', new THREE.BufferAttribute(f, 3));
  g.deleteAttribute('normal'); // recomputed below in the final frame
  return g;
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json() as Promise<T>;
}

async function build(onProgress?: (fraction: number) => void): Promise<ModelData> {
  performance.mark('qdd-model-fetch');
  // actuator.glb is meshopt-compressed with quantized positions (gltf-transform); see README
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [gltf, parts, decals] = await Promise.all([
    loader.loadAsync(MODEL_URLS.glb, (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); }),
    fetchJson<PartsJson>(MODEL_URLS.parts),
    fetchJson<DecalsJson>(MODEL_URLS.decals),
  ]);

  const meta = new Map(parts.nodes.map((n) => [n.node, n]));
  const nodes: NodeDef[] = [];
  gltf.scene.updateMatrixWorld(true);

  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = meta.get(mesh.name) ?? meta.get(mesh.parent?.name ?? '');
    if (!m) { console.warn('No metadata for node', mesh.name); return; }
    let geometry = toFloatPositions(mesh.geometry.clone());
    geometry.applyMatrix4(mesh.matrixWorld);
    if (SMOOTH_GROUPS.has(m.group)) {
      // Coils and fasteners were simplified to very few triangles; with hard edges between every
      // facet they read as crystals. Blend normals across facets < 70 deg apart (shading only).
      geometry = toCreasedNormals(geometry, (70 * Math.PI) / 180);
    } else if (!geometry.attributes.normal) geometry.computeVertexNormals();
    let center: THREE.Vector3 | null = null;
    if (m.kinematics === 'planet' && m.planet != null) {
      const c = parts.planetCenters_xz_mm[String(m.planet)];
      center = new THREE.Vector3(c[0], 0, c[1]);
      geometry.translate(-center.x, 0, -center.z);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const bbox = geometry.boundingBox!.clone();
    if (center) bbox.translate(center);
    const materialKey: MaterialKey =
      m.materialKey ?? (m.group === 'fasteners' && m.fastenerKind?.startsWith('ins') ? 'brass' : GROUPS[m.group].mat);
    nodes.push({
      name: m.node, group: m.group, kinematics: m.kinematics, planet: m.planet, explodeY: m.explodeY_mm,
      stage: m.stage, coilIndex: m.coilIndex, polarity: m.magnetPolarity, materialKey, decal: null,
      center, geometry, bbox,
    });
  });

  decals.decals.forEach((d, i) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.normal, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
    g.setIndex(d.index);
    g.computeBoundingBox(); g.computeBoundingSphere();
    nodes.push({
      name: `decal_${d.texture}_${i}`, group: d.group, kinematics: d.kinematics, planet: null, explodeY: d.explodeY_mm,
      stage: d.stage, coilIndex: null, polarity: null, materialKey: GROUPS[d.group].mat, decal: d.texture,
      center: null, geometry: g, bbox: g.boundingBox!.clone(),
    });
  });

  performance.mark('qdd-model-built');
  return { nodes, lobes: parts.lobes };
}
