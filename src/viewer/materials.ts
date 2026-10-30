import * as THREE from 'three';
import type { MaterialKey } from '../content/parts';

type Extra = Partial<THREE.MeshPhysicalMaterialParameters>;
const std = (color: number, roughness: number, metalness: number, extra: Extra = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });

/** Base material library (ported from the prototype engine). */
export function makeMaterials(): Record<MaterialKey, THREE.MeshPhysicalMaterial> {
  return {
    polyHousing: std(0x2b2f34, 0.62, 0.0, { clearcoat: 0.15, clearcoatRoughness: 0.6 }),
    polyFrame: std(0x3a3f46, 0.55, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.5 }),
    polyRotor: std(0x33373d, 0.5, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.45 }),
    polyGear: std(0x5c636b, 0.48, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    polyGear2: std(0x6b737c, 0.46, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    polyRing: std(0x474d55, 0.5, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.45 }),
    polyCarrier: std(0x7a818a, 0.45, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    lamination: std(0x5d646b, 0.38, 0.85),
    copper: std(0xb8714a, 0.33, 1.0),
    nickel: std(0xc9ced4, 0.2, 1.0),
    nickel2: std(0xaab1b8, 0.24, 1.0),
    steel: std(0xa9afb5, 0.25, 1.0),
    bearing: std(0xc4c9ce, 0.16, 1.0),
    blackOxide: std(0x232427, 0.42, 0.7),
    brass: std(0xb8995a, 0.3, 1.0),
    pcb: std(0x1d2528, 0.55, 0.1),
    xt30: std(0xb59a3a, 0.5, 0.0),
    pcbMask: std(0x0f1113, 0.45, 0.0, { clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    pcbGold: std(0xd1a95a, 0.28, 1.0),
    aluCan: std(0xd9dcdf, 0.3, 0.9),
    blackPlastic: std(0x1c1d20, 0.55, 0.0),
    creamPlastic: std(0xe4d9c2, 0.6, 0.0),
    whitePlastic: std(0xe6e4de, 0.5, 0.0),
    beige: std(0xcbb894, 0.5, 0.0),
    greenTerm: std(0x23a03c, 0.5, 0.0, { clearcoat: 0.15 }),
    termDark: std(0x1f5a2b, 0.6, 0.0),
    steelBright: std(0xcfd3d7, 0.2, 1.0),
    steelDark: std(0x3a3d41, 0.35, 0.9),
    epoxy: std(0x131416, 0.4, 0.0),
  };
}

/** Flat colour shown on back faces when a clipping plane cuts a part. */
export const CUT_COLORS: Record<MaterialKey, number> = {
  polyHousing: 0x5b6670, polyFrame: 0x6b7782, polyRotor: 0x60707c, polyGear: 0x8fa3b2, polyGear2: 0x9aaebc,
  polyRing: 0x7a8995, polyCarrier: 0xa5b4bf, lamination: 0x8c959d, copper: 0xd08a5c, nickel: 0xdfe3e7,
  nickel2: 0xcfd5da, steel: 0xc3c8cd, bearing: 0xd2d6da, blackOxide: 0x55585d, brass: 0xc9ab6a, pcb: 0x3d4a50,
  xt30: 0xc7ae55, pcbMask: 0x3a4146, pcbGold: 0xd8b36a, aluCan: 0xc9cdd1, blackPlastic: 0x3b3d41,
  creamPlastic: 0xd9ceb6, whitePlastic: 0xd5d3cd, beige: 0xc2b08c, greenTerm: 0x58c76c, termDark: 0x2f6f3c,
  steelBright: 0xc9cdd1, steelDark: 0x5a5e62, epoxy: 0x3a3c40,
};

export interface TintUniform { value: THREE.Vector4 }

/** Material with a tint uniform (mode emphasis) and a flat colour on back faces (section cut). */
export type SectionMaterial = (THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial) & {
  userData: { tint: TintUniform; cut?: { value: THREE.Color } };
};

export function patchSection(mat: THREE.MeshPhysicalMaterial, cutColor: number): SectionMaterial {
  const m = mat as SectionMaterial;
  m.side = THREE.DoubleSide;
  m.userData.tint = { value: new THREE.Vector4(0, 0, 0, 0) };
  m.userData.cut = { value: new THREE.Color(cutColor).multiplyScalar(0.5) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCut = m.userData.cut!;
    sh.uniforms.uTint = m.userData.tint;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCut;\nuniform vec4 uTint;')
      .replace(
        '#include <opaque_fragment>',
        // Back faces = section cut: flat cut colour, still carrying mode tints (magnet polarity, dimming)
        // and emissive (coil phase glow) so the cut face reads in motor/torque views.
        '#include <opaque_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, uTint.rgb, uTint.a);\n if(!gl_FrontFacing){ gl_FragColor = vec4(mix(uCut, uTint.rgb * 0.85, uTint.a) + emissive * 0.9, 1.0); }',
      );
  };
  m.customProgramCacheKey = () => 'qddcut';
  return m;
}
