import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { CUT_COLORS, makeMaterials, patchSection, type SectionMaterial } from './materials';
import { decalTexture } from './decals';
import { MODEL_SCALE, type ModelData } from './model';
import { DEFAULT_HIDDEN } from '../content/parts';
import type { RuntimeNode, ViewerEngine } from './engine';

interface Props { model: ModelData; engine: ViewerEngine }

/** Builds the actuator scene graph (root → pivot → holder → mesh per node) and hands it to the engine.
    Pivots carry explode offsets and rotation about the motor axis; holders carry the planet self-spin. */
export function Actuator({ model, engine }: Props) {
  const gl = useThree((s) => s.gl);

  const { root, nodes } = useMemo(() => {
    const mats = makeMaterials();
    const root = new THREE.Group();
    root.name = 'actuator';
    root.scale.setScalar(MODEL_SCALE);
    const nodes: RuntimeNode[] = model.nodes.map((def) => {
      const pivot = new THREE.Group();
      const holder = new THREE.Group();
      pivot.add(holder);
      if (def.center) holder.position.copy(def.center);
      let mat: SectionMaterial;
      if (def.decal) {
        const m = new THREE.MeshStandardMaterial({
          map: decalTexture(def.decal, gl.capabilities.getMaxAnisotropy()), transparent: true, alphaTest: 0.35,
          roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        }) as SectionMaterial;
        m.userData.tint = { value: new THREE.Vector4() };
        mat = m;
      } else {
        mat = patchSection(mats[def.materialKey].clone(), CUT_COLORS[def.materialKey] ?? 0x777777);
        if (def.group === 'magMain' || def.group === 'magHal') {
          // Magnets share faces with the floors of their rotor pockets; bias them forward so they
          // win the depth tie (otherwise the pocket floor z-fights over the magnet in section views).
          mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4;
        }
      }
      const mesh = new THREE.Mesh(def.geometry, mat);
      mesh.name = def.name;
      mesh.userData.group = def.group;
      // correct before the first frame (rendering is paused while the canvas is off-screen)
      mesh.visible = !DEFAULT_HIDDEN[def.group];
      holder.add(mesh);
      root.add(pivot);
      return { def, pivot, holder, mesh, mat, vis: true };
    });
    Object.values(mats).forEach((m) => m.dispose());
    return { root, nodes };
  }, [model, gl]);

  useLayoutEffect(() => {
    engine.attachNodes(nodes);
    return () => {
      engine.detachNodes();
      nodes.forEach((n) => n.mat.dispose());
    };
  }, [engine, nodes]);

  return <primitive object={root} />;
}
