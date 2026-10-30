import * as THREE from 'three';

let envCache: WeakMap<THREE.WebGLRenderer, THREE.Texture> = new WeakMap();

/** Procedural studio lighting environment: a dark room with soft boxes, prefiltered with PMREM. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const hit = envCache.get(renderer);
  if (hit) return hit;
  const scene = new THREE.Scene();
  const g = new THREE.BoxGeometry();
  const room = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0x0c0d0f }));
  room.scale.set(40, 30, 40); room.position.y = 8; scene.add(room);
  const soft = (i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, col = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color: col });
    m.color.multiplyScalar(i);
    const b = new THREE.Mesh(g, m);
    b.position.set(x, y, z); b.scale.set(sx, sy, sz); scene.add(b);
  };
  soft(9, 0, 20, 0, 14, 0.2, 9);                // overhead softbox
  soft(5, -18, 9, 6, 0.2, 12, 4);               // left strip
  soft(3.2, 18, 7, -6, 0.2, 10, 3, 0xdfe9f2);   // right cool strip
  soft(2.2, 0, 4, 19, 10, 5, 0.2);              // front fill
  soft(1.2, 4, 10, -19, 6, 4, 0.2, 0xc9dceb);   // back rim
  soft(1.9, 0, -6.4, 2, 12, 0.2, 10, 0xdde6ee); // floor bounce (lights the controller side)
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.035);
  pm.dispose();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.material) (mesh.material as THREE.Material).dispose();
  });
  g.dispose();
  envCache.set(renderer, rt.texture);
  return rt.texture;
}

export function resetEnvironmentCache() { envCache = new WeakMap(); }

/** Soft radial contact shadow under the model. */
export function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
