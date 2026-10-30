import * as THREE from 'three';

export type DecalKind = 'silkTop' | 'silkEnc' | 'capTop';

const cache: Partial<Record<DecalKind, THREE.CanvasTexture>> = {};

/** Runtime-generated silkscreen and capacitor-top textures (ported from the prototype's decalTexture()).
    Positions are board coordinates in mm (MKS XDrive Mini, 63 × 58 mm). */
export function decalTexture(kind: DecalKind, maxAnisotropy = 1): THREE.CanvasTexture {
  const hit = cache[kind];
  if (hit) return hit;
  const c = document.createElement('canvas');
  const x = c.getContext('2d')!;
  const PX = 20, W = 63, H = 58;
  interface TxtOpt { rot?: number; weight?: string; italic?: boolean; align?: CanvasTextAlign; col?: string }
  const txt = (t: string, mx: number, my: number, size: number, opt: TxtOpt = {}) => {
    x.save();
    x.translate((mx + W / 2) * PX, (H / 2 - my) * PX);
    if (opt.rot) x.rotate(opt.rot);
    x.font = (opt.weight || '600') + ' ' + (opt.italic ? 'italic ' : '') + Math.round(size * PX) + 'px Arial, Helvetica, sans-serif';
    x.textAlign = opt.align || 'center';
    x.textBaseline = 'middle';
    x.fillStyle = opt.col || '#eef0f2';
    x.fillText(t, 0, 0);
    x.restore();
  };
  if (kind === 'silkTop') {
    c.width = W * PX; c.height = H * PX;
    ([['A', -17.6], ['B', -9.3], ['C', -1.4], ['+', 10.7], ['−', 19.5], ['DC', 27.2]] as [string, number][])
      .forEach(([l, px]) => txt(l, px, 15.6, 3.1, { weight: '500' }));
    txt('MKS  XDRIVE MINI V1.0', 2.8, 6.8, 2.75, { italic: true, weight: '500' });
    txt('+ AUX −', -29.6, 14.0, 1.7, { rot: -Math.PI / 2, weight: '500' });
    txt('120R', -27.3, -9.5, 1.2, { rot: -Math.PI / 2 });
    txt('CAN', -28.6, -21.4, 1.8, { weight: '500' }); txt('L', -26.6, -15.3, 1.0); txt('H', -26.6, -18.0, 1.0);
    txt('RESET', -5.3, -16.0, 1.55, { align: 'left', weight: '500' }); txt('BOOT', 13.8, -16.0, 1.55, { align: 'left', weight: '500' });
    txt('PWR', 24.6, -20.6, 1.25);
    txt('5V', -12.4, -21.4, 1.1); txt('3.3V', -1.1, -21.4, 1.1); txt('GND', 11.3, -21.4, 1.1); txt('GPIO', 5.1, -21.0, 1.05);
    const pins: [number, number, string[]][] = [
      [-23.2, -13.5, ['GND', 'A', 'B', 'Z', '5V']],
      [-11.6, -2.3, ['RST', 'SWD', 'GND', 'SWC', '3.3V']],
      [0.0, 10.2, ['1', '2', '3', '4', '5V', 'GND']],
      [12.5, 23.2, ['GND', 'MOSI', 'MISO', 'SCK', 'GPIO_6', '3.3V']],
    ];
    pins.forEach(([a, b, labels]) => {
      const n = labels.length;
      labels.forEach((l, i) => txt(l, a + 1.6 + (b - a - 3.2) * (i / (n - 1)), -21.2, 0.85, { rot: -Math.PI / 2, align: 'left' }));
    });
    x.fillStyle = '#c9a14a';
    [[-12.4, -19.6], [-1.1, -19.6], [11.3, -19.6]].forEach(([qx, qy]) => {
      x.beginPath(); x.arc((qx + W / 2) * PX, (H / 2 - qy) * PX, 0.55 * PX, 0, 7); x.fill();
    });
    x.strokeStyle = '#eef0f2'; x.lineWidth = 0.18 * PX;
    [-22.7, -10.95, 0.8, 12.55, 24.3].forEach((cx) => {
      const y0 = -5.3;
      x.strokeRect((cx - 5.8 + W / 2) * PX, (H / 2 - y0 - 5.8) * PX, 11.6 * PX, 11.6 * PX);
    });
    x.fillStyle = 'rgba(70,52,18,0.9)';
    [[-21.3, 14.4], [-13.0, 13.9], [-7.0, 11.6], [1.9, 13.9], [7.9, 11.6], [16.2, 13.9], [22.3, 11.6], [-23.7, 7.3]].forEach(([px, py]) => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        x.beginPath(); x.arc((px + i * 1.2 + W / 2) * PX, (H / 2 - py - j * 1.2) * PX, 0.32 * PX, 0, 7); x.fill();
      }
    });
  } else if (kind === 'silkEnc') {
    c.width = W * PX; c.height = H * PX;
    txt('MKS XDRIVE MINI ENCODER', 2.0, 20.5, 2.9, { italic: true, weight: '700' });
  } else {
    c.width = c.height = 256;
    x.fillStyle = '#16171a';
    x.beginPath(); x.arc(128, 128, 126, Math.PI * 0.62, Math.PI * 1.38); x.closePath(); x.fill();
    x.save(); x.translate(140, 128); x.rotate(-Math.PI / 2);
    x.fillStyle = '#1b1c1f'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 44px Arial, sans-serif';
    x.fillText('100', 0, -44); x.fillText('63V', 0, 2); x.fillText('RVT', 0, 48);
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAnisotropy);
  cache[kind] = t;
  return t;
}
