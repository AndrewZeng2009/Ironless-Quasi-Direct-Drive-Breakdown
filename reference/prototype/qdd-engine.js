/* QDD Engine \u2014 real-time viewer for the Ironless QDD Actuator teardown.
   Geometry: decimated display mesh extracted from Caden Kraft's Fusion 360 file (MIT, credit: Caden Kraft / CKraft11).
   Part names, explode paths, kinematics and assembly order are an independent interpretation.
   Requires THREE (r160 UMD build) on window. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) { console.error('QDDEngine: THREE missing'); return; }

  // ------------------------------------------------------------------ groups
  var GROUPS = {
    housing:  { name: 'Main housing',            cat: 'structure',  mat: 'polyHousing' },
    frame:    { name: 'Output clamshell frame',  cat: 'structure',  mat: 'polyFrame' },
    retainer: { name: 'Lower clamshell ring',    cat: 'structure',  mat: 'polyFrame' },
    cover:    { name: 'Controller cover',        cat: 'structure',  mat: 'polyHousing' },
    stator:   { name: '10010 stator \u00b7 36 slots', cat: 'motor',      mat: 'lamination' },
    coils:    { name: 'Windings \u00b7 36 coils',     cat: 'motor',      mat: 'copper' },
    rotor:    { name: 'Ironless rotor (printed)',cat: 'motor',      mat: 'polyRotor' },
    magMain:  { name: 'Main-pole magnets \u00d742',   cat: 'motor',      mat: 'nickel' },
    magHal:   { name: 'Halbach magnets \u00d742',     cat: 'motor',      mat: 'nickel2' },
    sun:      { name: 'Sun gear \u00b7 6 lobes',      cat: 'gearbox',    mat: 'polyGear' },
    planets:  { name: 'Planet gears \u00d73 \u00b7 15 lobes', cat: 'gearbox', mat: 'polyGear2' },
    ring:     { name: 'Ring gear \u00b7 36 lobes',    cat: 'gearbox',    mat: 'polyRing' },
    carrier:  { name: 'Planet carrier (output)', cat: 'gearbox',    mat: 'polyCarrier' },
    pins:     { name: 'Planet pins & washers',   cat: 'gearbox',    mat: 'steel' },
    pbearings:{ name: 'Planet bearings 5\u00d714\u00d75 \u00d76', cat: 'hardware', mat: 'bearing' },
    b6710:    { name: '6710 bearings \u00d72',        cat: 'hardware',   mat: 'bearing' },
    b6805:    { name: '6805 bearings \u00d72',        cat: 'hardware',   mat: 'bearing' },
    axle:     { name: 'M4 shoulder bolt & spacer', cat: 'hardware', mat: 'blackOxide' },
    fasteners:{ name: 'Fasteners & heat-set inserts', cat: 'hardware', mat: 'blackOxide' },
    encoder:  { name: 'Encoder magnet & holder', cat: 'electronics',mat: 'polyGear' },
    pcb:      { name: 'MKS XDrive Mini \u00b7 main board', cat: 'electronics', mat: 'pcbMask' },
    encplate: { name: 'Encoder-side plate & standoffs', cat: 'electronics', mat: 'pcbMask' },
    terminals:{ name: 'Stock screw terminals (off)', cat: 'electronics', mat: 'greenTerm' },
    xt30:     { name: 'XT60 power connector', cat: 'electronics',mat: 'xt30' }
  };
  var GEARBOX_SET = ['sun', 'planets', 'ring', 'carrier', 'pins', 'pbearings'];
  var MOTOR_SET = ['stator', 'coils', 'rotor', 'magMain', 'magHal', 'housing'];
  var STAGES = [
    { n: 1, title: 'Gearbox core',      groups: ['sun', 'planets', 'pbearings', 'pins', 'carrier', 'ring'] },
    { n: 2, title: 'Gearbox clamshell', groups: ['frame', 'retainer', 'b6710', 'b6805', 'axle'] },
    { n: 3, title: 'Stator & windings', groups: ['stator', 'coils'] },
    { n: 4, title: 'Halbach rotor',     groups: ['rotor', 'magMain', 'magHal', 'encoder'] },
    { n: 5, title: 'Housing',           groups: ['housing'] },
    { n: 6, title: 'Controller',        groups: ['pcb', 'cover', 'xt30'] }
  ];
  // winding scheme 36N42P (repo image): AabBCcaABbcC x3 ; capital = +, lower = -
  var WIND = 'AabBCcaABbcC';
  var EXS = 0.78;
  var DEFAULT_HIDDEN = { terminals: true };
  function defHidden() { var o = {}; for (var k in DEFAULT_HIDDEN) o[k] = DEFAULT_HIDDEN[k]; return o; }

  // ------------------------------------------------------------------ utils
  function b64(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var cache = {};
  function load(url) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('model ' + r.status); return r.json(); }).then(decode);
    return cache[url];
  }
  function decode(model) {
    var meshes = model.meshes.map(function (m) {
      var qp = new Int16Array(b64(m.p)), qn = new Int8Array(b64(m.n));
      var idx = m.it === 'u16' ? new Uint16Array(b64(m.i)) : new Uint32Array(b64(m.i));
      var n = m.nv, P = new Float32Array(n * 3), N = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) for (var k = 0; k < 3; k++) {
        P[i * 3 + k] = m.min[k] + (qp[i * 3 + k] + 32768) / 65535 * m.ext[k];
        N[i * 3 + k] = qn[i * 3 + k] / 127;
      }
      var UV = null;
      if (m.u) { var qu = new Uint16Array(b64(m.u)); UV = new Float32Array(n * 2); for (var j = 0; j < n * 2; j++) UV[j] = qu[j] / 65535; }
      return { P: P, N: N, I: idx, nv: n, UV: UV };
    });
    return { meshes: meshes, parts: model.parts, planetCenters: model.planetCenters, ratio: model.ratio };
  }

  // ------------------------------------------------------------------ materials
  function makeMaterials() {
    function std(c, r, m, extra) { var o = { color: c, roughness: r, metalness: m }; for (var k in extra) o[k] = extra[k]; return new T.MeshPhysicalMaterial(o); }
    return {
      polyHousing: std(0x2b2f34, 0.62, 0.0, { clearcoat: 0.15, clearcoatRoughness: 0.6 }),
      polyFrame:   std(0x3a3f46, 0.55, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.5 }),
      polyRotor:   std(0x33373d, 0.5, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.45 }),
      polyGear:    std(0x5c636b, 0.48, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      polyGear2:   std(0x6b737c, 0.46, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      polyRing:    std(0x474d55, 0.5, 0.0, { clearcoat: 0.2, clearcoatRoughness: 0.45 }),
      polyCarrier: std(0x7a818a, 0.45, 0.0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      lamination:  std(0x5d646b, 0.38, 0.85, {}),
      copper:      std(0xb8714a, 0.33, 1.0, {}),
      nickel:      std(0xc9ced4, 0.2, 1.0, {}),
      nickel2:     std(0xaab1b8, 0.24, 1.0, {}),
      steel:       std(0xa9afb5, 0.25, 1.0, {}),
      bearing:     std(0xc4c9ce, 0.16, 1.0, {}),
      blackOxide:  std(0x232427, 0.42, 0.7, {}),
      brass:       std(0xb8995a, 0.3, 1.0, {}),
      pcb:         std(0x1d2528, 0.55, 0.1, {}),
      xt30:        std(0xb59a3a, 0.5, 0.0, {}),
      pcbMask:     std(0x0f1113, 0.45, 0.0, { clearcoat: 0.3, clearcoatRoughness: 0.4 }),
      pcbGold:     std(0xd1a95a, 0.28, 1.0, {}),
      aluCan:      std(0xd9dcdf, 0.3, 0.9, {}),
      blackPlastic:std(0x1c1d20, 0.55, 0.0, {}),
      creamPlastic:std(0xe4d9c2, 0.6, 0.0, {}),
      whitePlastic:std(0xe6e4de, 0.5, 0.0, {}),
      beige:       std(0xcbb894, 0.5, 0.0, {}),
      greenTerm:   std(0x23a03c, 0.5, 0.0, { clearcoat: 0.15 }),
      termDark:    std(0x1f5a2b, 0.6, 0.0, {}),
      steelBright: std(0xcfd3d7, 0.2, 1.0, {}),
      steelDark:   std(0x3a3d41, 0.35, 0.9, {}),
      epoxy:       std(0x131416, 0.4, 0.0, {})
    };
  }
  function patchSection(mat, cutColor) {
    mat.side = T.DoubleSide;
    mat.userData.cut = { value: new T.Color(cutColor).multiplyScalar(0.5) };
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uCut = mat.userData.cut;
      sh.uniforms.uTint = mat.userData.tint || (mat.userData.tint = { value: new T.Vector4(0, 0, 0, 0) });
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uCut;\nuniform vec4 uTint;')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, uTint.rgb, uTint.a);\n if(!gl_FrontFacing){ gl_FragColor = vec4(uCut, 1.0); }');
    };
    mat.customProgramCacheKey = function () { return 'qddcut'; };
    if (!mat.userData.tint) mat.userData.tint = { value: new T.Vector4(0, 0, 0, 0) };
    return mat;
  }

  // ------------------------------------------------------------------ decals (silkscreen, cap tops)
  var decalCache = {};
  function decalTexture(kind, renderer) {
    if (decalCache[kind]) return decalCache[kind];
    var c = document.createElement('canvas'), x = c.getContext('2d');
    var PX = 20, W = 63, H = 58;
    function txt(t, mx, my, size, opt) {
      opt = opt || {}; x.save(); x.translate((mx + W / 2) * PX, (H / 2 - my) * PX); if (opt.rot) x.rotate(opt.rot);
      x.font = (opt.weight || '600') + ' ' + (opt.italic ? 'italic ' : '') + Math.round(size * PX) + 'px Arial, Helvetica, sans-serif';
      x.textAlign = opt.align || 'center'; x.textBaseline = 'middle'; x.fillStyle = opt.col || '#eef0f2'; x.fillText(t, 0, 0); x.restore();
    }
    if (kind === 'silkTop') {
      c.width = W * PX; c.height = H * PX; x.clearRect(0, 0, c.width, c.height);
      [['A', -17.6], ['B', -9.3], ['C', -1.4], ['+', 10.7], ['\u2212', 19.5], ['DC', 27.2]].forEach(function (l) { txt(l[0], l[1], 15.6, 3.1, { weight: '500' }); });
      txt('MKS  XDRIVE MINI V1.0', 2.8, 6.8, 2.75, { italic: true, weight: '500' });
      txt('+ AUX \u2212', -29.6, 14.0, 1.7, { rot: -Math.PI / 2, weight: '500' });
      txt('120R', -27.3, -9.5, 1.2, { rot: -Math.PI / 2 });
      txt('CAN', -28.6, -21.4, 1.8, { weight: '500' }); txt('L', -26.6, -15.3, 1.0); txt('H', -26.6, -18.0, 1.0);
      txt('RESET', -5.3, -16.0, 1.55, { align: 'left', weight: '500' }); txt('BOOT', 13.8, -16.0, 1.55, { align: 'left', weight: '500' });
      txt('PWR', 24.6, -20.6, 1.25);
      txt('5V', -12.4, -21.4, 1.1); txt('3.3V', -1.1, -21.4, 1.1); txt('GND', 11.3, -21.4, 1.1); txt('GPIO', 5.1, -21.0, 1.05);
      var pins = [[-23.2, -13.5, ['GND', 'A', 'B', 'Z', '5V']], [-11.6, -2.3, ['RST', 'SWD', 'GND', 'SWC', '3.3V']], [0.0, 10.2, ['1', '2', '3', '4', '5V', 'GND']], [12.5, 23.2, ['GND', 'MOSI', 'MISO', 'SCK', 'GPIO_6', '3.3V']]];
      pins.forEach(function (p) { var n = p[2].length; for (var i = 0; i < n; i++) { var px = p[0] + 1.6 + (p[1] - p[0] - 3.2) * (i / (n - 1)); txt(p[2][i], px, -21.2, 0.85, { rot: -Math.PI / 2, align: 'left' }); } });
      x.fillStyle = '#c9a14a'; [[-12.4, -19.6], [-1.1, -19.6], [11.3, -19.6]].forEach(function (q) { x.beginPath(); x.arc((q[0] + W / 2) * PX, (H / 2 - q[1]) * PX, 0.55 * PX, 0, 7); x.fill(); });
      x.strokeStyle = '#eef0f2'; x.lineWidth = 0.18 * PX;
      [-22.7, -10.95, 0.8, 12.55, 24.3].forEach(function (cx) { var y0 = -5.3; x.strokeRect((cx - 5.8 + W / 2) * PX, (H / 2 - y0 - 5.8) * PX, 11.6 * PX, 11.6 * PX); });
      x.fillStyle = 'rgba(70,52,18,0.9)';
      [[-21.3, 14.4], [-13.0, 13.9], [-7.0, 11.6], [1.9, 13.9], [7.9, 11.6], [16.2, 13.9], [22.3, 11.6], [-23.7, 7.3]].forEach(function (p) { for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) { x.beginPath(); x.arc((p[0] + i * 1.2 + W / 2) * PX, (H / 2 - p[1] - j * 1.2) * PX, 0.32 * PX, 0, 7); x.fill(); } });
    } else if (kind === 'silkEnc') {
      c.width = W * PX; c.height = H * PX; x.clearRect(0, 0, c.width, c.height);
      txt('MKS XDRIVE MINI ENCODER', 2.0, 20.5, 2.9, { italic: true, weight: '700' });
    } else {
      c.width = c.height = 256; x.clearRect(0, 0, 256, 256);
      x.fillStyle = '#16171a'; x.beginPath(); x.arc(128, 128, 126, Math.PI * 0.62, Math.PI * 1.38); x.closePath(); x.fill();
      x.save(); x.translate(140, 128); x.rotate(-Math.PI / 2); x.fillStyle = '#1b1c1f'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 44px Arial, sans-serif'; x.fillText('100', 0, -44); x.fillText('63V', 0, 2); x.fillText('RVT', 0, 48); x.restore();
    }
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    decalCache[kind] = t; return t;
  }

  // ------------------------------------------------------------------ studio environment
  function studioEnv(renderer) {
    var scene = new T.Scene();
    var g = new T.BoxGeometry();
    var room = new T.Mesh(g, new T.MeshStandardMaterial({ side: T.BackSide, color: 0x0c0d0f }));
    room.scale.set(40, 30, 40); room.position.y = 8; scene.add(room);
    function soft(i, x, y, z, sx, sy, sz, col) { var m = new T.MeshBasicMaterial({ color: col || 0xffffff }); m.color.multiplyScalar(i); var b = new T.Mesh(g, m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); scene.add(b); }
    soft(9, 0, 20, 0, 14, 0.2, 9);              // overhead softbox
    soft(5, -18, 9, 6, 0.2, 12, 4);             // left strip
    soft(3.2, 18, 7, -6, 0.2, 10, 3, 0xdfe9f2); // right cool strip
    soft(2.2, 0, 4, 19, 10, 5, 0.2);            // front fill
    soft(1.2, 4, 10, -19, 6, 4, 0.2, 0xc9dceb); // back rim
    soft(1.9, 0, -6.4, 2, 12, 0.2, 10, 0xdde6ee); // floor bounce (lights the controller side)
    var pm = new T.PMREMGenerator(renderer);
    var rt = pm.fromScene(scene, 0.035);
    pm.dispose();
    return rt.texture;
  }
  function shadowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d'); var gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  // ------------------------------------------------------------------ viewer
  function Viewer(canvas, overlay, opts) {
    this.canvas = canvas; this.overlay = overlay; this.opts = opts || {};
    this.kind = this.opts.kind || 'explorer';
    this.alive = true;
    this.state = {
      explode: 0, explodeTarget: null, explodeFrom: 0, explodeT0: 0, explodeDur: 1,
      section: false, sectionMode: 'axial', mode: 'explore', stage: 6, stageP: 1, stageT0: 0,
      playing: !reduced, thetaC: 0, speed: 1, hover: null, selected: null, isolate: null,
      hidden: defHidden(), torqueStep: 0, labels: true, openTop: false, engaged: false
    };
    this._init();
  }
  Viewer.prototype._init = function () {
    var self = this;
    var r = this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.kind === 'hero' ? 2 : 1.75));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.localClippingEnabled = true;
    r.setClearColor(0x000000, 0);
    this.scene = new T.Scene();
    this.scene.environment = studioEnv(r);
    this.camera = new T.PerspectiveCamera(30, 1, 0.5, 400);
    this.key = new T.DirectionalLight(0xffffff, 1.6); this.key.position.set(8, 14, 10); this.scene.add(this.key);
    this.rim = new T.DirectionalLight(0xbfd8ea, 0.9); this.rim.position.set(-10, 4, -12); this.scene.add(this.rim);
    this.scene.add(new T.HemisphereLight(0xdfe6ec, 0x2a3036, 0.35));
    this.root = new T.Group(); this.scene.add(this.root);
    this.clipAxial = new T.Plane(new T.Vector3(0, 0, -1), 0);
    this.clipRadial = new T.Plane(new T.Vector3(0, -1, 0), 0.05);
    this.clipping = [];
    var sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.set(19, 19, 1); sh.position.y = -4.1; sh.renderOrder = -1;
    this.shadow = sh; this.scene.add(sh);
    // camera rig
    this.cam = { target: new T.Vector3(0, -0.8, 0), theta: 0.72, phi: 1.08, dist: 34, tTarget: null };
    this.camGoal = null;
    this.raycaster = new T.Raycaster();
    this.pointer = { x: 0, y: 0, inside: false, moved: false, down: false };
    this._bindInput();
    this.ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(function () { self.resize(); }) : null;
    if (this.ro) this.ro.observe(this.canvas.parentElement || this.canvas); else window.addEventListener('resize', this._onWinResize = function () { self.resize(); });
    this.resize();
    load(this.opts.modelUrl).then(function (m) { if (self.alive) self._build(m); }).catch(function (e) { console.error(e); if (self.opts.onError) self.opts.onError(e); });
    this._t0 = performance.now(); this._last = this._t0;
    var loop = function (t) { if (!self.alive) return; self._frame(t); self._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  };

  Viewer.prototype._build = function (model) {
    var self = this;
    this.model = model;
    var mats = this.mats = makeMaterials();
    var cutCol = { polyHousing: 0x5b6670, polyFrame: 0x6b7782, polyRotor: 0x60707c, polyGear: 0x8fa3b2, polyGear2: 0x9aaebc, polyRing: 0x7a8995, polyCarrier: 0xa5b4bf, lamination: 0x8c959d, copper: 0xd08a5c, nickel: 0xdfe3e7, nickel2: 0xcfd5da, steel: 0xc3c8cd, bearing: 0xd2d6da, blackOxide: 0x55585d, brass: 0xc9ab6a, pcb: 0x3d4a50, xt30: 0xc7ae55, pcbMask: 0x3a4146, pcbGold: 0xd8b36a, aluCan: 0xc9cdd1, blackPlastic: 0x3b3d41, creamPlastic: 0xd9ceb6, whitePlastic: 0xd5d3cd, beige: 0xc2b08c, greenTerm: 0x58c76c, termDark: 0x2f6f3c, steelBright: 0xc9cdd1, steelDark: 0x5a5e62, epoxy: 0x3a3c40 };
    // geometry cache per mesh id
    var gcache = {};
    function geoFor(id) {
      if (gcache[id]) return gcache[id];
      var m = model.meshes[id], gg = new T.BufferGeometry();
      gg.setAttribute('position', new T.BufferAttribute(m.P, 3));
      gg.setAttribute('normal', new T.BufferAttribute(m.N, 3));
      gg.setIndex(new T.BufferAttribute(m.I, 1));
      if (m.UV) gg.setAttribute('uv', new T.BufferAttribute(m.UV, 2));
      return (gcache[id] = gg);
    }
    // bucket parts into nodes
    var nodes = {}; var order = [];
    model.parts.forEach(function (p) {
      var sub = '';
      if (p.g === 'coils') sub = '#' + p.ci;
      if (p.g === 'magMain' || p.g === 'magHal') sub = '#pol' + p.pol;
      if (p.g === 'fasteners' && /^ins/.test(p.kd)) sub = '#ins';
      if (p.mt) sub += '#mt' + p.mt; if (p.tx) sub += '#tx' + p.tx;
      var key = p.g + '|' + p.k + '|' + (p.pl == null ? '' : p.pl) + '|' + p.e + sub;
      if (!nodes[key]) { nodes[key] = { key: key, g: p.g, k: p.k, pl: p.pl, e: p.e, s: p.s, parts: [], ci: p.ci, pol: p.pol, ins: sub === '#ins', mt: p.mt, tx: p.tx }; order.push(key); }
      nodes[key].parts.push(p);
    });
    var M = new T.Matrix4();
    this.nodes = [];
    this.byGroup = {};
    this.pickables = [];
    order.forEach(function (key) {
      var nd = nodes[key];
      var pivot = new T.Group(); var holder = new T.Group(); pivot.add(holder);
      var center = null;
      if (nd.k === 'planet') { var c = model.planetCenters[nd.pl]; center = new T.Vector3(c[0], 0, c[1]); holder.position.copy(center); }
      // merge geometry
      var geos = nd.parts.map(function (p) {
        var t = p.t; M.set(t[0], t[3], t[6], t[9], t[1], t[4], t[7], t[10], t[2], t[5], t[8], t[11], 0, 0, 0, 1);
        if (center) M.premultiply(new T.Matrix4().makeTranslation(-center.x, 0, -center.z));
        var gg = geoFor(p.m).clone(); gg.applyMatrix4(M); return gg;
      });
      var merged = mergeGeos(geos);
      geos.forEach(function (g2) { g2.dispose(); });
      var matKey = nd.mt || GROUPS[nd.g].mat;
      if (nd.ins) matKey = 'brass';
      var mat;
      if (nd.tx) {
        mat = new T.MeshStandardMaterial({ map: decalTexture(nd.tx, self.renderer), transparent: true, alphaTest: 0.35, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        mat.userData.tint = { value: new T.Vector4(0, 0, 0, 0) };
      } else mat = patchSection(mats[matKey].clone(), cutCol[matKey] || 0x777777);
      mat.clippingPlanes = self.clipping;
      var mesh = new T.Mesh(merged, mat);
      merged.computeBoundingBox(); merged.computeBoundingSphere();
      mesh.userData.node = nd;
      holder.add(mesh);
      self.root.add(pivot);
      nd.pivot = pivot; nd.holder = holder; nd.mesh = mesh; nd.mat = mat; nd.baseColor = mat.color.clone();
      nd.vis = 1;
      var bb = merged.boundingBox.clone(); if (center) bb.translate(center);
      nd.bbox = bb;
      self.nodes.push(nd);
      (self.byGroup[nd.g] = self.byGroup[nd.g] || []).push(nd);
      self.pickables.push(mesh);
    });
    // group bboxes (assembled)
    this.gbox = {};
    for (var g in this.byGroup) { var b = new T.Box3(); this.byGroup[g].forEach(function (n) { b.union(n.bbox); }); this.gbox[g] = b; }
    var all = new T.Box3(); this.nodes.forEach(function (n) { all.union(n.bbox); }); this.allBox = all;
    this.shadow.position.y = all.min.y - 0.25;
    this.ready = true;
    this._applyMode(true);
    if (this.opts.onReady) this.opts.onReady();
  };
  function mergeGeos(geos) {
    if (geos.length === 1) return geos[0].clone();
    var hasUV = geos.every(function (g) { return !!g.attributes.uv; });
    var nv = 0, ni = 0; geos.forEach(function (g) { nv += g.attributes.position.count; ni += g.index.count; });
    var P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), UV = hasUV ? new Float32Array(nv * 2) : null;
    var vo = 0, io = 0;
    geos.forEach(function (g) {
      P.set(g.attributes.position.array, vo * 3); N.set(g.attributes.normal.array, vo * 3); if (UV) UV.set(g.attributes.uv.array, vo * 2);
      var idx = g.index.array; for (var i = 0; i < idx.length; i++) I[io + i] = idx[i] + vo;
      vo += g.attributes.position.count; io += idx.length;
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setIndex(new T.BufferAttribute(I, 1));
    if (UV) out.setAttribute('uv', new T.BufferAttribute(UV, 2));
    return out;
  }

  // ------------------------------------------------------------------ input
  Viewer.prototype._bindInput = function () {
    var self = this, el = this.canvas, ptrs = {}, last = null, pinch = null;
    el.style.touchAction = 'none';
    function pos(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; }
    this._h = {
      down: function (e) {
        if (self.kind === 'hero') return;
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        ptrs[e.pointerId] = pos(e); self.pointer.down = true; self.state.engaged = true; self._userMoved = true;
        last = pos(e); self._downAt = { x: last.x, y: last.y, t: performance.now(), button: e.button, shift: e.shiftKey };
        self.camGoal = null;
      },
      move: function (e) {
        var p = pos(e); self.pointer.x = p.x / p.w * 2 - 1; self.pointer.y = -(p.y / p.h) * 2 + 1; self.pointer.inside = true; self.pointer.moved = true;
        self.pointer.px = p.x; self.pointer.py = p.y;
        if (!ptrs[e.pointerId]) return;
        ptrs[e.pointerId] = p;
        var ids = Object.keys(ptrs);
        if (ids.length === 2) {
          var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          if (pinch) { self.cam.dist = clamp(self.cam.dist * pinch.d / d, 8, 90); self._pan(mx - pinch.mx, my - pinch.my); }
          pinch = { d: d, mx: mx, my: my }; return;
        }
        if (!last) { last = p; return; }
        var dx = p.x - last.x, dy = p.y - last.y; last = p;
        if (self._downAt && (self._downAt.button === 2 || self._downAt.shift)) self._pan(dx, dy);
        else { self.cam.theta -= dx * 0.0085; self.cam.phi = clamp(self.cam.phi - dy * 0.0085, 0.08, Math.PI - 0.08); }
      },
      up: function (e) {
        var p = pos(e);
        if (self._downAt && Math.hypot(p.x - self._downAt.x, p.y - self._downAt.y) < 5 && performance.now() - self._downAt.t < 450 && Object.keys(ptrs).length === 1) {
          self._pick(p.x / p.w * 2 - 1, -(p.y / p.h) * 2 + 1, true);
        }
        delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = null; if (!Object.keys(ptrs).length) { last = null; self.pointer.down = false; }
      },
      leave: function () { self.pointer.inside = false; if (self.state.hover) { self.state.hover = null; self._emitHover(); } self.state.engaged = false; },
      wheel: function (e) {
        if (self.kind === 'hero') return;
        if (!self.state.engaged && !e.ctrlKey) { if (self.opts.onWheelHint) self.opts.onWheelHint(); return; }
        e.preventDefault(); self.camGoal = null;
        self.cam.dist = clamp(self.cam.dist * Math.exp(e.deltaY * 0.0012), 8, 90);
      },
      ctx: function (e) { if (self.kind !== 'hero') e.preventDefault(); }
    };
    el.addEventListener('pointerdown', this._h.down); el.addEventListener('pointermove', this._h.move);
    el.addEventListener('pointerup', this._h.up); el.addEventListener('pointercancel', this._h.up);
    el.addEventListener('pointerleave', this._h.leave); el.addEventListener('wheel', this._h.wheel, { passive: false });
    el.addEventListener('contextmenu', this._h.ctx);
  };
  Viewer.prototype._pan = function (dx, dy) {
    var c = this.camera, s = this.cam.dist * 0.0016;
    var right = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
    this.cam.target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
  };
  Viewer.prototype.handleKey = function (e) {
    var k = e.key, used = true;
    if (k === 'ArrowLeft') this.cam.theta += 0.12; else if (k === 'ArrowRight') this.cam.theta -= 0.12;
    else if (k === 'ArrowUp') this.cam.phi = clamp(this.cam.phi - 0.1, 0.08, 3.06); else if (k === 'ArrowDown') this.cam.phi = clamp(this.cam.phi + 0.1, 0.08, 3.06);
    else if (k === '+' || k === '=') this.cam.dist = clamp(this.cam.dist * 0.88, 8, 90); else if (k === '-' || k === '_') this.cam.dist = clamp(this.cam.dist * 1.13, 8, 90);
    else if (k === 'r' || k === 'R') this.resetView();
    else if (k === 'e' || k === 'E') this.animateExplode(this.state.explode > 0.5 ? 0 : 1);
    else if (k === 's' || k === 'S') this.setSection(!this.state.section);
    else if (k === 'Escape') this.select(null);
    else used = false;
    if (used) { e.preventDefault(); this.camGoal = null; }
    return used;
  };
  Viewer.prototype._pick = function (x, y, click) {
    if (!this.ready) return null;
    this.raycaster.setFromCamera(new T.Vector2(x, y), this.camera);
    var vis = this.pickables.filter(function (m) { return m.visible && m.userData.node.vis > 0.5; });
    var hits = this.raycaster.intersectObjects(vis, false);
    var cl = this.clipping;
    var hit = null;
    for (var i = 0; i < hits.length; i++) {
      var ok = true; for (var j = 0; j < cl.length; j++) if (cl[j].distanceToPoint(hits[i].point) < 0) { ok = false; break; }
      if (ok) { hit = hits[i]; break; }
    }
    var g = hit ? hit.object.userData.node.g : null;
    if (click) this.select(g === this.state.selected ? null : g);
    return g;
  };

  // ------------------------------------------------------------------ public API
  Viewer.prototype.resize = function () {
    var p = this.canvas.parentElement || this.canvas; var w = p.clientWidth || 300, h = p.clientHeight || 300;
    this.renderer.setSize(w, h, false); this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.overlay) { var d = Math.min(window.devicePixelRatio || 1, 2); this.overlay.width = w * d; this.overlay.height = h * d; this.overlay.style.width = w + 'px'; this.overlay.style.height = h + 'px'; this._od = d; }
    this._w = w; this._h2 = h;
  };
  Viewer.prototype.setExplode = function (t) { this.state.explode = clamp(t, 0, 1); this.state.explodeTarget = null; };
  Viewer.prototype.animateExplode = function (to, dur) {
    var s = this.state; s.explodeFrom = s.explode; s.explodeTarget = clamp(to, 0, 1); s.explodeT0 = performance.now(); s.explodeDur = reduced ? 1 : (dur || 1600);
    if (this.opts.onExplode) this.opts.onExplode(s.explodeTarget);
  };
  Viewer.prototype.setSection = function (on, mode) {
    this.state.section = !!on; if (mode) this.state.sectionMode = mode; this._updateClip();
    if (this.opts.onSection) this.opts.onSection(this.state.section);
  };
  Viewer.prototype._updateClip = function () {
    this.clipping.length = 0;
    if (this.state.section) this.clipping.push(this.state.sectionMode === 'radial' ? this.clipRadial : this.clipAxial);
  };
  var VIEWS = {
    iso:        { theta: 0.72, phi: 1.08, dist: 34, ty: -0.8 },
    output:     { theta: 0.35, phi: 0.36, dist: 30, ty: 0 },
    controller: { theta: 0.5, phi: 2.62, dist: 30, ty: -1.5 },
    side:       { theta: 0.0, phi: 1.5708, dist: 32, ty: -0.8 },
    section:    { theta: 0.02, phi: 1.32, dist: 27, ty: -0.6 },
    exploded:   { theta: 0.78, phi: 1.18, dist: 50, ty: -3.0 },
    gearbox:    { theta: 0.55, phi: 0.62, dist: 21, ty: 0 },
    motor:      { theta: 0.3, phi: 0.02, dist: 21, ty: 0 },
    torque:     { theta: 0.25, phi: 1.12, dist: 30, ty: -1.0 },
    hero:       { theta: 0.6, phi: 1.12, dist: 30, ty: -0.9 }
  };
  Viewer.prototype.setView = function (name, instant) {
    var v = VIEWS[name]; if (!v) return;
    var th = v.theta; var cur = this.cam.theta; while (th - cur > Math.PI) th -= 2 * Math.PI; while (cur - th > Math.PI) th += 2 * Math.PI;
    this.camGoal = { theta: th, phi: v.phi, dist: v.dist, ty: v.ty, t0: performance.now(), from: { theta: this.cam.theta, phi: this.cam.phi, dist: this.cam.dist, ty: this.cam.target.y, tx: this.cam.target.x, tz: this.cam.target.z }, dur: (instant || reduced) ? 1 : 1100 };
  };
  Viewer.prototype.resetView = function () {
    this.select(null); this.state.isolate = null; this.state.hidden = defHidden();
    this.setSection(false); this.animateExplode(0, 900);
    this.setView(this.state.mode === 'explore' ? 'iso' : this.state.mode);
    if (this.opts.onVisibility) this.opts.onVisibility(this.visibility());
  };
  Viewer.prototype.select = function (g) {
    this.state.selected = g; if (this.opts.onSelect) this.opts.onSelect(g);
  };
  Viewer.prototype.focus = function (g) {
    if (!this.ready || !this.gbox[g]) return;
    this.select(g);
    var b = this.gbox[g].clone(); var c = b.getCenter(new T.Vector3()); var off = this._groupOffset(g); c.add(off);
    var sz = b.getSize(new T.Vector3()).length();
    this.camGoal = { theta: this.cam.theta, phi: this.cam.phi, dist: clamp(sz * 2.6, 10, 70), ty: c.y, tx: c.x, tz: c.z, t0: performance.now(), from: { theta: this.cam.theta, phi: this.cam.phi, dist: this.cam.dist, ty: this.cam.target.y, tx: this.cam.target.x, tz: this.cam.target.z }, dur: reduced ? 1 : 900 };
  };
  Viewer.prototype.setVisible = function (g, on) { this.state.hidden[g] = !on; if (this.opts.onVisibility) this.opts.onVisibility(this.visibility()); };
  Viewer.prototype.toggleVisible = function (g) { this.setVisible(g, !!this.state.hidden[g]); };
  Viewer.prototype.isolate = function (g) { this.state.isolate = (this.state.isolate === g) ? null : g; if (g) this.select(g); if (this.opts.onVisibility) this.opts.onVisibility(this.visibility()); };
  Viewer.prototype.showAll = function () { this.state.isolate = null; this.state.hidden = defHidden(); if (this.opts.onVisibility) this.opts.onVisibility(this.visibility()); };
  Viewer.prototype.visibility = function () { var o = {}; for (var g in GROUPS) o[g] = !this.state.hidden[g] && (!this.state.isolate || this.state.isolate === g); o._isolate = this.state.isolate; return o; };
  Viewer.prototype.setPlaying = function (on) { this.state.playing = !!on; };
  Viewer.prototype.setSpeed = function (s) { this.state.speed = s; };
  Viewer.prototype.setOpenTop = function (on) { this.state.openTop = !!on; };
  Viewer.prototype.setLabels = function (on) { this.state.labels = !!on; };
  Viewer.prototype.setStage = function (n) {
    var s = this.state; n = clamp(n, 1, 6); if (n === s.stage && s.stageP >= 1) return;
    s.stagePrev = s.stage; s.stage = n; s.stageP = 0; s.stageT0 = performance.now();
    if (this.opts.onStage) this.opts.onStage(n);
  };
  Viewer.prototype.setTorqueStep = function (n) { this.state.torqueStep = clamp(n, 1, 5); if (this.opts.onTorqueStep) this.opts.onTorqueStep(this.state.torqueStep); };
  Viewer.prototype.setMode = function (m) { this.state.mode = m; this._applyMode(false); if (this.opts.onMode) this.opts.onMode(m); };
  Viewer.prototype._applyMode = function (init) {
    if (!this.ready) return;
    var s = this.state, m = s.mode;
    s.isolate = null; s.hidden = defHidden(); s.openTop = false;
    if (this.kind === 'hero') { this.setView('hero', true); return; }
    if (m === 'explore') { this.setSection(false); this.setView(init ? 'iso' : 'iso', init); }
    else if (m === 'sequence') { this.setSection(false); this.animateExplode(0, 600); s.stage = 1; s.stageP = 0; s.stageT0 = performance.now(); this.setView('exploded'); if (this.opts.onStage) this.opts.onStage(1); }
    else if (m === 'gearbox') { this.setSection(false); this.animateExplode(0, 600); s.openTop = true; this.setView('gearbox'); s.playing = !reduced; }
    else if (m === 'motor') { this.setSection(true, 'radial'); this.animateExplode(0, 600); this.setView('motor'); s.playing = !reduced; }
    else if (m === 'torque') { this.setSection(true, 'axial'); this.animateExplode(0, 600); this.setView('torque'); s.playing = !reduced; this.setTorqueStep(s.torqueStep || 1); }
    if (this.opts.onVisibility) this.opts.onVisibility(this.visibility());
  };
  Viewer.prototype.dispose = function () {
    this.alive = false; cancelAnimationFrame(this._raf);
    var el = this.canvas, h = this._h;
    if (h) { el.removeEventListener('pointerdown', h.down); el.removeEventListener('pointermove', h.move); el.removeEventListener('pointerup', h.up); el.removeEventListener('pointercancel', h.up); el.removeEventListener('pointerleave', h.leave); el.removeEventListener('wheel', h.wheel); el.removeEventListener('contextmenu', h.ctx); }
    if (this.ro) this.ro.disconnect(); if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
    this.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.renderer.dispose();
  };
  Viewer.prototype._emitHover = function () { if (this.opts.onHover) this.opts.onHover(this.state.hover); };

  // ------------------------------------------------------------------ per-frame
  Viewer.prototype._groupOffset = function (g) {
    var ns = this.byGroup[g]; if (!ns) return new T.Vector3();
    // average of node offsets weighted equally
    var y = 0; ns.forEach(function (n) { y += n.pivot.position.y; }); return new T.Vector3(0, y / ns.length, 0);
  };
  Viewer.prototype._frame = function (now) {
    var dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    var s = this.state, self = this;
    // explode tween
    if (s.explodeTarget != null) {
      var p = clamp((now - s.explodeT0) / s.explodeDur, 0, 1); s.explode = lerp(s.explodeFrom, s.explodeTarget, ease(p));
      if (p >= 1) { s.explodeTarget = null; }
      if (this.opts.onExplodeValue) this.opts.onExplodeValue(s.explode);
    }
    if (s.stageP < 1) { s.stageP = clamp((now - s.stageT0) / (reduced ? 1 : 1400), 0, 1); }
    // camera tween
    var c = this.cam;
    if (this.camGoal) {
      var gq = this.camGoal, q = ease(clamp((now - gq.t0) / gq.dur, 0, 1));
      c.theta = lerp(gq.from.theta, gq.theta, q); c.phi = lerp(gq.from.phi, gq.phi, q); c.dist = lerp(gq.from.dist, gq.dist, q);
      c.target.y = lerp(gq.from.ty, gq.ty, q); c.target.x = lerp(gq.from.tx, gq.tx == null ? 0 : gq.tx, q); c.target.z = lerp(gq.from.tz, gq.tz == null ? 0 : gq.tz, q);
      if (q >= 1) this.camGoal = null;
    }
    if (this.kind === 'hero' && !reduced) c.theta += dt * 0.12;
    var sp = Math.sin(c.phi);
    var exf = (s.mode === 'explore') ? s.explode : 0;
    var dEff = c.dist * (1 + 0.62 * exf), tEff = new T.Vector3(c.target.x, c.target.y - 2.3 * exf, c.target.z);
    this.camera.position.set(tEff.x + dEff * sp * Math.sin(c.theta), tEff.y + dEff * Math.cos(c.phi), tEff.z + dEff * sp * Math.cos(c.theta));
    this.camera.lookAt(tEff);
    // lights: subtle orbit in hero
    var lt = (now - this._t0) / 1000;
    if (this.kind === 'hero') {
      var a = lt * (reduced ? 0 : 0.09);
      this.key.position.set(12 * Math.cos(a), 14 + 2 * Math.sin(a * 0.7), 12 * Math.sin(a)); this.key.intensity = 1.5 + 0.25 * Math.sin(a * 1.3);
      this.renderer.toneMappingExposure = 1.02 + 0.06 * Math.sin(a * 0.8);
    } else {
      // key light follows camera a little for readable forms
      this.key.position.set(this.camera.position.x * 0.6 + 6, this.camera.position.y * 0.6 + 12, this.camera.position.z * 0.6 + 4);
    }
    if (!this.ready) { this.renderer.render(this.scene, this.camera); return; }
    var expoGoal = (s.section ? 1.32 : 1.05); if (this.kind !== 'hero') this.renderer.toneMappingExposure += (expoGoal - this.renderer.toneMappingExposure) * Math.min(1, dt * 4);
    // kinematics
    var spinOn = s.playing && (s.mode === 'gearbox' || s.mode === 'motor' || s.mode === 'torque');
    if (spinOn) s.thetaC += dt * 0.32 * s.speed;
    var thC = s.thetaC, thS = 7 * thC, thPrel = -2.4 * thC;
    if (this.opts.onKinematics && spinOn) this.opts.onKinematics(thS, thC);
    if (this.opts.readout && (!this._ro || now - this._ro > 120)) {
      this._ro = now; var ri = thS / (2 * Math.PI), rc = thC / (2 * Math.PI);
      this.opts.readout.textContent = 'INPUT (sun + rotor) ' + ri.toFixed(2) + ' rev   \u2192   OUTPUT (carrier) ' + rc.toFixed(2) + ' rev   \u00b7   ratio ' + (rc > 0.001 ? (ri / rc).toFixed(2) : '7.00') + ' : 1';
    }
    // visibility logic per node
    var mode = s.mode, ex = s.explode, sel = s.selected, hov = s.hover;
    var torqueSets = { 1: ['pcb', 'encplate', 'xt30', 'encoder'], 2: ['coils', 'stator'], 3: ['magMain', 'magHal', 'rotor', 'coils'], 4: ['rotor', 'sun', 'planets', 'ring'], 5: ['carrier', 'frame', 'pins'] };
    var tset = mode === 'torque' ? torqueSets[s.torqueStep || 1] : null;
    var elec = thS * 21; // electrical angle (21 pole pairs)
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i], g = n.g, vis = true;
      if (s.hidden[g]) vis = false;
      if (s.isolate && s.isolate !== g) vis = false;
      if (mode === 'gearbox') { vis = vis && GEARBOX_SET.indexOf(g) >= 0; if (s.openTop && ((g === 'ring' && n.e > 0) || (g === 'carrier' && n.e > 0) || (g === 'pins' && n.e > 1.5))) vis = false; }
      if (mode === 'motor') vis = vis && MOTOR_SET.indexOf(g) >= 0;
      if (mode === 'sequence') vis = vis && n.s <= s.stage;
      // offsets
      var off = 0;
      if (mode === 'sequence') { off = (n.s === s.stage) ? n.e * EXS * (1 - ease(s.stageP)) : 0; }
      else off = n.e * ex * EXS;
      n.pivot.position.y = off;
      // kinematic rotation
      var rot = 0;
      if (n.k === 'input') rot = thS; else if (n.k === 'carrier' || n.k === 'planet') rot = thC;
      n.pivot.rotation.y = rot;
      if (n.k === 'planet') n.holder.rotation.y = thPrel; else n.holder.rotation.y = 0;
      n.mesh.visible = vis; n.vis = vis ? 1 : 0;
      // tint / emphasis
      var tint = n.mat.userData.tint.value; tint.set(0, 0, 0, 0);
      var em = n.mat.emissive; em.setRGB(0, 0, 0);
      if (mode === 'gearbox') {
        if (g === 'sun') tint.set(0.30, 0.62, 0.80, 0.38); else if (g === 'carrier' || g === 'pins') tint.set(0.90, 0.56, 0.30, 0.32);
      }
      if (mode === 'motor' || (mode === 'torque' && (s.torqueStep === 2 || s.torqueStep === 3))) {
        if (g === 'magMain') { if (n.pol === 0) tint.set(0.90, 0.48, 0.25, 0.55); else tint.set(0.28, 0.55, 0.85, 0.55); }
        if (g === 'magHal') { if (n.pol === 0) tint.set(0.95, 0.70, 0.50, 0.42); else tint.set(0.55, 0.75, 0.92, 0.42); }
      }
      if (g === 'coils' && (mode === 'motor' || (mode === 'torque' && s.torqueStep >= 2 && s.torqueStep <= 3))) {
        var ch = WIND.charAt(n.ci % 12), ph = 'ABC'.indexOf(ch.toUpperCase()), sign = (ch === ch.toUpperCase()) ? 1 : -1;
        var cur = sign * Math.cos(elec - ph * 2.0944);
        if (cur > 0) em.setRGB(0.95 * cur, 0.42 * cur, 0.16 * cur); else em.setRGB(0.14 * -cur, 0.42 * -cur, 0.78 * -cur);
        em.multiplyScalar(0.55);
      }
      if (tset) {
        if (tset.indexOf(g) < 0) { tint.set(0.07, 0.08, 0.09, 0.55); }
        else if (s.torqueStep === 5 && (g === 'carrier' || g === 'frame' || g === 'pins')) tint.set(0.92, 0.56, 0.28, 0.35);
        else if (s.torqueStep === 4 && (g === 'sun' || g === 'rotor')) tint.set(0.30, 0.62, 0.82, 0.30);
        else if (s.torqueStep === 1) { var pulse = 0.5 + 0.5 * Math.sin(lt * 4); em.setRGB(0.10 + 0.25 * pulse, 0.30 + 0.25 * pulse, 0.45 + 0.3 * pulse); }
      }
      if (g === sel) { if (tint.w < 0.3) tint.set(0.47, 0.76, 0.88, 0.30); em.r += 0.04; em.g += 0.09; em.b += 0.12; }
      else if (g === hov) { em.r += 0.05; em.g += 0.07; em.b += 0.09; }
      else if (sel && mode === 'explore' && !s.isolate) { if (tint.w === 0) tint.set(0.05, 0.055, 0.06, 0.35); }
    }
    this.shadow.visible = !(s.section && s.sectionMode === 'radial');
    // hover picking (throttled)
    if (this.kind !== 'hero' && this.pointer.inside && this.pointer.moved && !this.pointer.down) {
      this.pointer.moved = false;
      if (!this._pickT || now - this._pickT > 60) {
        this._pickT = now;
        var hg = this._pick(this.pointer.x, this.pointer.y, false);
        if (hg !== s.hover) { s.hover = hg; this._emitHover(); this.canvas.style.cursor = hg ? 'pointer' : 'grab'; }
      }
    }
    this.renderer.render(this.scene, this.camera);
    this._drawOverlay(now);
  };

  // ------------------------------------------------------------------ overlay labels
  Viewer.prototype._project = function (v) {
    var p = v.clone().project(this.camera); return { x: (p.x * 0.5 + 0.5) * this._w, y: (-p.y * 0.5 + 0.5) * this._h2, z: p.z };
  };
  Viewer.prototype._anchor = function (g) {
    var b = this.gbox[g]; if (!b) return null;
    var c = b.getCenter(new T.Vector3()); var size = b.getSize(new T.Vector3());
    // anchor on the camera-facing rim of the part for readability
    var cam = this.camera.position; var dir = new T.Vector3(cam.x, 0, cam.z).normalize();
    var r = Math.max(size.x, size.z) * 0.5;
    var right = new T.Vector3(dir.z, 0, -dir.x);
    var p = new T.Vector3(c.x, c.y, c.z).addScaledVector(right, r * 0.86);
    if (g === 'fasteners' || g === 'pbearings') p = c.clone();
    p.add(this._groupOffset(g));
    return p;
  };
  Viewer.prototype._drawOverlay = function (now) {
    var o = this.overlay; if (!o) return;
    var x = o.getContext('2d'), d = this._od || 1, s = this.state;
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, this._w, this._h2);
    if (!this.ready || this.kind === 'hero' || !s.labels) return;
    var list = [];
    var mode = s.mode;
    var showAll = (mode === 'explore' && s.explode > 0.35) || (mode === 'sequence');
    var self = this;
    var candidates = [];
    if (showAll) {
      for (var g in this.byGroup) {
        if (g === 'fasteners' || g === 'pins' || g === 'pbearings') continue;
        if (mode === 'sequence') { var st = this.byGroup[g][0].s; if (st !== s.stage) continue; }
        if (!this.byGroup[g].some(function (n) { return n.mesh.visible; })) continue;
        candidates.push(g);
      }
    }
    if (mode === 'gearbox') candidates = ['sun', 'planets', 'ring', 'carrier'];
    if (mode === 'motor') candidates = ['stator', 'coils', 'magMain', 'magHal', 'rotor'];
    if (s.hover && candidates.indexOf(s.hover) < 0) candidates.push(s.hover);
    if (s.selected && candidates.indexOf(s.selected) < 0) candidates.push(s.selected);
    candidates.forEach(function (g) {
      if (!self.byGroup[g] || !self.byGroup[g].some(function (n) { return n.mesh.visible; })) return;
      var a = self._anchor(g); if (!a) return; var p = self._project(a); if (p.z > 1) return;
      list.push({ g: g, ax: p.x, ay: p.y, side: p.x > self._w * 0.5 ? 1 : -1 });
    });
    if (list.length > 5) { list.sort(function (a, b) { return a.ay - b.ay; }); list.forEach(function (l, i) { l.side = (i % 2) ? 1 : -1; }); }
    // layout: two columns, relax vertically
    var colX = { '-1': 18, '1': this._w - 18 };
    var narrow = this._w < 620;
    [-1, 1].forEach(function (side) {
      var col = list.filter(function (l) { return l.side === side; }).sort(function (a, b) { return a.ay - b.ay; });
      var gap = narrow ? 30 : 26, y = 26;
      col.forEach(function (l) { l.ly = Math.max(l.ay, y); y = l.ly + gap; });
      var over = y - gap - (self._h2 - 20); if (over > 0) col.forEach(function (l) { l.ly -= over; });
    });
    x.font = '500 11px "IBM Plex Mono", ui-monospace, monospace'; x.textBaseline = 'middle';
    list.forEach(function (l) {
      var name = GROUPS[l.g].name; if (narrow) name = name.split(' \u00b7 ')[0];
      var hot = l.g === s.selected || l.g === s.hover;
      var tw = x.measureText(name).width + 16;
      var lx = l.side > 0 ? self._w - 16 - tw : 16;
      var ex = l.side > 0 ? lx - 6 : lx + tw + 6;
      x.strokeStyle = hot ? 'rgba(124,196,224,0.95)' : 'rgba(205,212,218,0.38)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(l.ax, l.ay); x.lineTo(ex - l.side * 18, l.ly); x.lineTo(ex, l.ly); x.stroke();
      x.fillStyle = hot ? '#7cc4e0' : '#cfd5da'; x.beginPath(); x.arc(l.ax, l.ay, hot ? 3 : 2.2, 0, Math.PI * 2); x.fill();
      x.fillStyle = hot ? 'rgba(18,30,38,0.92)' : 'rgba(13,15,17,0.78)'; roundRect(x, lx, l.ly - 10, tw, 20, 3); x.fill();
      x.strokeStyle = hot ? 'rgba(124,196,224,0.9)' : 'rgba(205,212,218,0.18)'; roundRect(x, lx, l.ly - 10, tw, 20, 3); x.stroke();
      x.fillStyle = hot ? '#e8f4fa' : '#d9dee2'; x.fillText(name, lx + 8, l.ly + 0.5);
    });
    // torque path (schematic)
    if (mode === 'torque') {
      var chain = ['pcb', 'coils', 'magMain', 'rotor', 'sun', 'planets', 'carrier'];
      var pts = chain.map(function (g) { var b = self.gbox[g]; if (!b) return null; var c = b.getCenter(new T.Vector3()); if (g === 'coils' || g === 'magMain') c.set(-4.6, 0, 0); if (g === 'rotor') c.set(-2.6, -1.8, 0); if (g === 'planets') c.set(-1.9, 0.0, 0); if (g === 'carrier') c.set(-0.8, 1.6, 0); if (g === 'pcb') c.set(-1.6, -2.6, 0); if (g === 'sun') c.set(-0.4, -0.4, 0); return self._project(c); });
      var step = s.torqueStep || 1, upto = [1, 2, 3, 5, 6][step - 1];
      x.lineWidth = 2; x.setLineDash([6, 6]); x.lineDashOffset = -((now / 40) % 12);
      for (var i = 0; i < upto && i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1]; if (!a || !b) continue;
        x.strokeStyle = i >= 4 ? 'rgba(229,154,92,0.95)' : 'rgba(124,196,224,0.95)';
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      }
      x.setLineDash([]);
      for (var j = 0; j <= upto && j < pts.length; j++) { var q = pts[j]; if (!q) continue; x.fillStyle = j >= 5 ? '#e59a5c' : '#7cc4e0'; x.beginPath(); x.arc(q.x, q.y, 4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0d0f11'; x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText(String(j + 1), q.x, q.y + 0.5); x.textAlign = 'left'; }
      x.font = '500 10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(205,212,218,0.6)'; x.fillText('SCHEMATIC PATH \u2014 not physical routing', 16, self._h2 - 16);
    }
  };
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath(); }

  window.QDDEngine = { Viewer: Viewer, load: load, GROUPS: GROUPS, STAGES: STAGES, reducedMotion: reduced, version: '1.0' };
})();
