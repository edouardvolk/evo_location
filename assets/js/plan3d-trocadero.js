/* =========================================================
   EVO — Paul Doumer (Trocadéro) · interactive 3D layout
   The studio builds itself piece by piece when the section
   comes into view, then turns slowly. Click to explore it
   (drag to turn, scroll / pinch to zoom, right-click to move).
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.querySelector('[data-plan3d]');
if (stage) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); safeInit(); }
    }, { rootMargin: '400px 0px' });
    io.observe(stage);
  } else safeInit();
}
function safeInit() {
  try { init(stage); } catch (err) { console.error(err); stage.classList.add('is-error'); }
}

function init(stage) {
  // ---------- Plan (metres) : x west→east (hall to the west), z back(0)→courtyard windows(D) ----------
  const LX = 3.8, D = 5.0, H = 2.75, FT = 0.3;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => (document.documentElement.getAttribute('lang') === 'fr' ? 'fr' : 'en');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enabled = false; controls.autoRotate = !reduce; controls.autoRotateSpeed = -0.55;
  controls.minDistance = 4; controls.maxDistance = 30; controls.maxPolarAngle = 1.45;
  renderer.domElement.style.touchAction = 'pan-y';

  // ---------- helpers ----------
  let seed = 23;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const P = (x, y, z) => new THREE.Vector3(x, y, D - z);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  function B(x0, y0, z0, x1, y1, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, D - (z0 + z1) / 2); parent.add(m); return m;
  }
  function LB(x0, y0, z0, x1, y1, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); parent.add(m); return m;
  }
  function cyl(rt, rb, h, x, y, z, mat, parent, seg = 28) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.copy(P(x, y + h / 2, z)); parent.add(m); return m;
  }
  function sph(r, x, y, z, mat, parent, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), mat);
    m.position.copy(P(x, y, z)); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }
  function tiled(tex, w, h, size, o = {}) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(w, .01) / size, Math.max(h, .01) / size);
    return std('#ffffff', { map: t, roughness: 0.4, ...o });
  }

  // ---------- textures ----------
  const texParquet = canvasTex(1024, 1024, (g, w, h) => {
    const rows = 14, ph = h / rows, pxm = w / 2;
    for (let r = 0; r < rows; r++) {
      const y = r * ph; let x = rnd() * w, covered = 0;
      while (covered < w) {
        let len = Math.round((1.0 + rnd() * 0.9) * pxm); if (covered + len > w) len = w - covered;
        const col = `hsl(${32 + rnd() * 6},${42 + rnd() * 12}%,${60 + rnd() * 9}%)`;
        for (const xx of [x, x - w]) {
          g.fillStyle = col; g.fillRect(xx, y, len, ph);
          g.strokeStyle = `rgba(120,80,40,${0.06 + rnd() * 0.08})`; g.lineWidth = 1.2;
          for (let k = 0; k < 7; k++) { const yy = y + 3 + rnd() * (ph - 6); g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + len * .3, yy + (rnd() - .5) * 7, xx + len * .6, yy + (rnd() - .5) * 7, xx + len, yy + (rnd() - .5) * 5); g.stroke(); }
          g.fillStyle = 'rgba(110,75,40,.35)'; g.fillRect(xx, y, 2, ph);
        }
        x = (x + len) % w; covered += len;
      }
      g.fillStyle = 'rgba(110,75,40,.35)'; g.fillRect(0, y, w, 2);
    }
  });
  texParquet.repeat.set(0.5, 0.5);
  const texGreyTile = canvasTex(256, 256, (g) => {
    g.fillStyle = '#c6c6c1'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `hsl(48,${3 + rnd() * 3}%,${76 + rnd() * 3}%)`; g.fillRect(i * 128 + 1.5, j * 128 + 1.5, 125, 125); }
  });
  const texWhiteTile = canvasTex(256, 256, (g) => {
    g.fillStyle = '#d8d5ce'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `hsl(40,${10 + rnd() * 6}%,${93 + rnd() * 3}%)`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
  });

  // ---------- materials ----------
  const M = {
    wall: std('#f4f3f0', { roughness: .95 }), warm: std('#efe2d4', { roughness: .95 }),
    base: std('#d9d1c3'), floor: std('#ffffff', { map: texParquet, roughness: .5 }),
    white: std('#f7f6f2', { roughness: .3 }), white2: std('#eceae4', { roughness: .55 }), gloss: std('#fbfbfa', { roughness: .12 }),
    plinth: std('#d9d6cf'), frameWhite: std('#f4f3ef', { roughness: .4 }), oak: std('#d8b88c', { roughness: .55 }),
    black: std('#232427', { roughness: .5 }), blackWood: std('#2a2623', { roughness: .45 }),
    blackGlass: std('#121315', { roughness: .15, metalness: .2 }), steel: std('#b9bdc2', { metalness: .35, roughness: .3 }),
    chrome: std('#d6dadd', { metalness: .3, roughness: .18 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe3f0', transparent: true, opacity: .2, roughness: .05, depthWrite: false }),
    showerGlass: new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: .18, roughness: .05, depthWrite: false }),
    frosted: new THREE.MeshStandardMaterial({ color: '#f1f4f3', transparent: true, opacity: .72, roughness: .4 }),
    mirror: std('#d3dde2', { metalness: .2, roughness: .06, emissive: '#9fb0b8', emissiveIntensity: .25 }),
    gold: std('#c69a32', { metalness: .75, roughness: .3 }), grey: std('#a6a9ac', { roughness: .95 }),
    greyLight: std('#c3c5c7', { roughness: .95 }), dark: std('#5b5e62', { roughness: .95 }), velvet: std('#8eaec6', { roughness: .9 }),
    mahogany: std('#6b2a17', { roughness: .4 }), brass: std('#b8923a', { metalness: .6, roughness: .35 }), radWhite: std('#f4f4f2', { roughness: .4 }),
  };

  // ---------- build timeline ----------
  const TL = [];
  const reg = (obj, kind, start, dur = 0.8) => { TL.push({ obj, kind, start, dur }); return obj; };
  function pivotize(tmp) {
    tmp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tmp), c = box.getCenter(new THREE.Vector3());
    const pv = new THREE.Group(); pv.position.set(c.x, box.min.y, c.z);
    [...tmp.children].forEach((ch) => { ch.position.sub(pv.position); pv.add(ch); });
    pv.userData.base = pv.position.clone(); return pv;
  }
  function item(parent, kind, start, build, dur) { const tmp = new THREE.Group(); build(tmp); const pv = pivotize(tmp); parent.add(pv); return reg(pv, kind, start, dur); }

  // Exterior walls: lowered when they stand between the camera and the interior ("dollhouse")
  const EXT = [];
  function extGroup(kind, coord, pred) {
    const g = new THREE.Group(), att = new THREE.Group(); g.userData.rise = 0; scene.add(g, att);
    const e = { g, att, kind, coord, pred, f: 1 }; EXT.push(e); return e;
  }
  const N = extGroup('N', D), W = extGroup('W', 0), S = extGroup('S', 0), E = extGroup('E', LX),
    CN = extGroup('N', 1.5, (cx, cz) => cz > 1.5 || cx < 0.3), CS = extGroup('S', 0.55), CW = extGroup('W', -2.8);   // CN/CS/CW: entrance hall
  const gInt = new THREE.Group(); gInt.userData.rise = 0; scene.add(gInt);
  const gItems = new THREE.Group(); scene.add(gItems);

  const solid = (x0, y0, z0, x1, y1, z1, parent, mat = M.wall) => B(x0, y0, z0, x1, y1, z1, mat, parent);
  function wallX(x0, x1, z0, z1, y0, y1, ops, parent) {
    let cur = x0;
    for (const o of [...ops].sort((a, b) => a.a0 - b.a0)) {
      if (o.a0 > cur) solid(cur, y0, z0, o.a0, y1, z1, parent);
      if (o.b0 > y0) solid(o.a0, y0, z0, o.a1, o.b0, z1, parent);
      if (o.b1 < y1) solid(o.a0, o.b1, z0, o.a1, y1, z1, parent);
      cur = o.a1;
    }
    if (cur < x1) solid(cur, y0, z0, x1, y1, z1, parent);
  }
  function wallZ(z0, z1, x0, x1, y0, y1, ops, parent) {
    let cur = z0;
    for (const o of [...ops].sort((a, b) => a.a0 - b.a0)) {
      if (o.a0 > cur) solid(x0, y0, cur, x1, y1, o.a0, parent);
      if (o.b0 > y0) solid(x0, y0, o.a0, x1, o.b0, o.a1, parent);
      if (o.b1 < y1) solid(x0, o.b1, o.a0, x1, y1, o.a1, parent);
      cur = o.a1;
    }
    if (cur < z1) solid(x0, y0, cur, x1, y1, z1, parent);
  }
  function makeWindow({ u0, u1, v0, v1, frame, leaves = 2, rows = 1 }) {
    const g = new THREE.Group(), d = 0.04, fw = 0.055, lw = 0.05, mw = 0.02;
    LB(u0, v0, -d, u0 + fw, v1, d, frame, g); LB(u1 - fw, v0, -d, u1, v1, d, frame, g);
    LB(u0, v1 - fw, -d, u1, v1, d, frame, g); LB(u0, v0, -d, u1, v0 + fw, d, frame, g);
    const iu0 = u0 + fw, iu1 = u1 - fw, iv1 = v1 - fw, gv0 = v0 + fw, lwid = (iu1 - iu0) / leaves;
    for (let i = 0; i < leaves; i++) {
      const a = iu0 + i * lwid, b = a + lwid;
      LB(a, gv0, -.025, a + lw, iv1, .025, frame, g); LB(b - lw, gv0, -.025, b, iv1, .025, frame, g);
      LB(a, iv1 - lw, -.025, b, iv1, .025, frame, g); LB(a, gv0, -.025, b, gv0 + lw * 1.6, .025, frame, g);
      const ga = a + lw, gb = b - lw, gva = gv0 + lw * 1.6, gvb = iv1 - lw;
      LB(ga, gva, -.004, gb, gvb, .004, M.glass, g);
      for (let r = 1; r < rows; r++) { const v = gva + (gvb - gva) * r / rows; LB(ga, v - mw / 2, -.012, gb, v + mw / 2, .012, frame, g); }
    }
    return g;
  }
  const placeZ = (win, zc, parent) => { win.position.set(0, 0, D - zc); parent.add(win); };
  const arc = (u0, u1, vs, rise, n = 28) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push([u0 + (u1 - u0) * t, vs + rise * Math.sin(Math.PI * t)]); } return p; };
  function shapeYZ(points, x0, depth, mat, parent) {
    const s = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], p[1])));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 }), mat);
    m.rotation.y = Math.PI / 2; m.position.set(x0, 0, D); parent.add(m); return m;
  }

  // timings (s)
  const T = { floor: 0, walls: 0.55, win: 2.2, kit: 2.8, bath: 3.4, store: 4.0, furn: 4.7, swing: 6.2, labels: 7.4, end: 7.9 };

  // ---------- floor ----------
  const footprint = [[0, 0], [LX, 0], [LX, D], [0, D], [0, 1.5], [-2.8, 1.5], [-2.8, 0.55], [0, 0.55]];
  item(gItems, 'grow', T.floor, (g) => { B(-0.2, -0.3, -0.2, LX + 0.2, -0.002, D + FT, M.base, g); B(-3.0, -0.3, 0.35, -0.2, -0.002, 1.7, M.base, g); }, 0.9);
  item(gItems, 'grow', T.floor + 0.15, (g) => {
    const fs = new THREE.Shape(footprint.map(([x, z]) => new THREE.Vector2(x, z - D)));
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(fs), M.floor); fl.rotation.x = -Math.PI / 2; g.add(fl);
  }, 0.9);

  // ---------- walls ----------
  const WIN = [{ a0: 0.75, a1: 1.65 }, { a0: 2.35, a1: 3.15 }];
  wallX(-0.2, LX + 0.2, D, D + FT, 0, H, WIN.map((w) => ({ ...w, b0: 0.55, b1: 2.45 })), N.g);        // facade (courtyard)
  wallZ(-0.2, D + FT, -0.2, 0, 0, H, [{ a0: 0.55, a1: 1.5, b0: 0, b1: 2.2 }], W.g);                    // west wall, opening to the hall
  wallX(-0.2, LX + 0.2, -0.2, 0, 0, H, [], S.g);
  wallZ(-0.2, D + FT, LX, LX + 0.2, 0, H, [], E.g);
  wallX(-3.0, -0.2, 1.5, 1.7, 0, H, [], CN.g);                                                         // entrance hall
  wallX(-3.0, -0.2, 0.35, 0.55, 0, H, [], CS.g);
  wallZ(0.35, 1.7, -3.0, -2.8, 0, H, [{ a0: 0.6, a1: 1.45, b0: 0, b1: 2.05 }], CW.g);
  B(-2.8, 0, 1.49, -0.2, H, 1.5, M.warm, CN.g); B(-2.8, 0, 0.55, -0.2, H, 0.56, M.warm, CS.g);
  // shower-room box with frosted transoms, and the ceiling beam
  wallZ(0, 2.1, 2.3, 2.4, 0, H, [{ a0: 0.4, a1: 1.7, b0: 2.12, b1: 2.55 }], gInt);
  wallX(2.4, LX, 2.0, 2.1, 0, H, [{ a0: 2.45, a1: 3.1, b0: 0, b1: 2.55 }], gInt);
  B(2.45, 2.05, 2.0, 3.1, 2.12, 2.1, M.wall, gInt);
  B(2.05, H - 0.25, 2.1, 2.3, H, D, M.wall, gInt);
  {
    const tm = (w, h) => tiled(texWhiteTile, w, h, 0.4, { roughness: .25 });
    B(2.4, 0, 0, 2.41, 2.12, 2.0, tm(2.0, 2.12), gInt);
    B(2.4, 0, 1.99, 2.45, 2.12, 2.0, tm(.05, 2.12), gInt); B(3.1, 0, 1.99, LX, 2.12, 2.0, tm(.7, 2.12), gInt);
    B(2.4, 0, 0, LX, 2.12, 0.01, tm(1.4, 2.12), S.g); B(LX - 0.01, 0, 0, LX, 2.12, 2.0, tm(2.0, 2.12), E.g);
  }
  [N, W, S, E, CN, CS, CW].forEach((e, i) => reg(e.g, 'rise', T.walls + i * 0.12, 0.95));
  reg(gInt, 'rise', T.walls + 0.95, 1.0);

  // ---------- windows, radiator, front door, transoms ----------
  WIN.forEach((w, i) => item(N.att, 'drop', T.win + i * 0.15, (g) => {
    placeZ(makeWindow({ u0: w.a0, u1: w.a1, v0: 0.55, v1: 2.45, frame: M.frameWhite }), D + 0.12, g);
    const z0 = D + FT + 0.01;
    B(w.a0, 0.92, z0, w.a1, 0.96, z0 + 0.03, M.black, g);
    for (let x = w.a0 + 0.05; x < w.a1; x += 0.11) B(x - 0.008, 0.55, z0 + 0.005, x + 0.008, 0.92, z0 + 0.025, M.black, g);
  }, 0.75));
  item(N.att, 'rise', T.win + 0.3, (g) => {
    for (let x = 1.74; x < 2.3; x += 0.045) B(x, 0.12, D - 0.12, x + 0.035, 0.62, D - 0.03, M.radWhite, g);
  }, 0.6);
  item(CW.att, 'rise', T.win + 0.4, (g) => {
    B(-2.8, 0.01, 0.6, -2.76, 2.04, 1.45, M.mahogany, g);
    [1.0, 1.72].forEach((y) => B(-2.76, y, 1.27, -2.72, y + 0.09, 1.38, M.brass, g));
  }, 0.7);
  item(gInt, 'pop', T.win + 0.5, (g) => { B(2.45, 2.12, 2.04, 3.1, 2.55, 2.06, M.frosted, g); B(2.34, 2.12, 0.4, 2.36, 2.55, 1.7, M.frosted, g); }, 0.5);

  // ---------- kitchen ----------
  item(gItems, 'rise', T.kit, (g) => {
    B(3.2, 0, 2.7, LX, 0.86, 4.95, M.white2, g); B(3.22, 0, 2.7, 3.26, 0.1, 4.95, M.plinth, g);
    [[2.72, 3.3], [3.32, 3.75], [3.77, 4.2], [4.22, 4.93]].forEach(([a, b]) => { B(3.18, 0.11, a, 3.2, 0.84, b, M.gloss, g); B(3.16, 0.55, b - 0.08, 3.175, 0.8, b - 0.065, M.steel, g); });
  }, 0.6);
  item(gItems, 'rise', T.kit + 0.15, (g) => {
    B(3.2, 0, 2.1, LX, 2.2, 2.7, M.gloss, g);
    B(3.18, 0.7, 2.14, 3.2, 1.28, 2.66, M.steel, g); B(3.175, 0.76, 2.18, 3.18, 1.16, 2.62, M.blackGlass, g);
    B(3.18, 1.32, 2.14, 3.2, 1.7, 2.66, M.steel, g); B(3.175, 1.38, 2.2, 3.18, 1.64, 2.52, M.blackGlass, g);
  }, 0.7);
  item(gItems, 'drop', T.kit + 0.3, (g) => {
    B(3.18, 0.86, 2.7, LX, 0.9, 4.97, M.oak, g);
    B(3.3, 0.9, 2.82, 3.75, 0.906, 3.38, M.blackGlass, g);
    B(3.3, 0.895, 4.0, 3.72, 0.905, 4.6, M.steel, g);
    cyl(0.014, 0.014, 0.3, 3.72, 0.9, 4.3, M.steel, g);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.18, 10), M.steel); s.rotation.z = Math.PI / 2; s.position.copy(P(3.63, 1.19, 4.3)); g.add(s);
    B(3.52, 0.9, 3.5, 3.74, 1.18, 3.66, M.black, g);
    cyl(0.07, 0.07, 0.2, 3.62, 0.9, 3.82, M.steel, g);
  }, 0.6);
  item(gItems, 'drop', T.kit + 0.5, (g) => {
    B(3.45, 1.45, 2.7, LX, 2.15, 4.85, M.gloss, g);
    [[2.72, 3.25], [3.27, 3.8], [3.82, 4.33], [4.35, 4.83]].forEach(([a, b]) => B(3.43, 1.47, a, 3.45, 2.13, b, M.gloss, g));
    B(3.4, 1.42, 2.8, LX, 1.45, 3.4, M.steel, g);
  }, 0.6);

  // ---------- shower room ----------
  item(gItems, 'grow', T.bath - 0.1, (g) => {
    const t = texGreyTile.clone(); t.needsUpdate = true; t.repeat.set(1.4 / 1.2, 2.0 / 1.2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), std('#ffffff', { map: t, roughness: .35 }));
    fl.rotation.x = -Math.PI / 2; fl.position.copy(P(3.1, 0.004, 1.0)); g.add(fl);
  }, 0.5);
  item(gItems, 'rise', T.bath, (g) => B(3.0, 0, 0.01, LX - 0.01, 0.05, 0.8, M.white, g), 0.4);
  item(gItems, 'rise', T.bath + 0.12, (g) => {
    B(3.0, 0.05, 0.78, LX - 0.01, 2.0, 0.8, M.showerGlass, g); B(3.0, 0.05, 0.01, 3.02, 2.0, 0.8, M.showerGlass, g);
    B(3.0, 1.97, 0.78, LX - 0.01, 2.0, 0.8, M.chrome, g); B(3.0, 1.97, 0.01, 3.02, 2.0, 0.8, M.chrome, g); B(3.0, 0.05, 0.78, 3.02, 2.0, 0.8, M.chrome, g);
    cyl(0.012, 0.012, 1.1, 3.7, 0.95, 0.06, M.chrome, g); cyl(0.11, 0.11, 0.012, 3.55, 2.05, 0.25, M.chrome, g);
  }, 0.6);
  item(gItems, 'pop', T.bath + 0.3, (g) => {
    B(3.62, 0.38, 1.0, LX - 0.01, 0.78, 1.42, M.white, g);
    cyl(0.17, 0.13, 0.4, 3.45, 0, 1.21, M.white, g); cyl(0.19, 0.19, 0.03, 3.45, 0.4, 1.21, M.white, g);
  }, 0.55);
  item(gItems, 'drop', T.bath + 0.42, (g) => {
    B(2.42, 0.42, 0.01, 2.98, 0.85, 0.45, M.gloss, g); B(2.42, 0.63, 0.45, 2.98, 0.64, 0.455, M.white2, g);
    B(2.41, 0.85, 0.01, 2.99, 0.89, 0.47, M.white, g); cyl(0.013, 0.013, 0.16, 2.7, 0.89, 0.06, M.chrome, g);
    B(2.45, 1.12, 0.01, 2.95, 1.85, 0.02, M.mirror, g);
  }, 0.6);
  item(gItems, 'drop', T.bath + 0.55, (g) => {
    [1.0, 1.47].forEach((z) => B(2.41, 0.3, z, 2.46, 1.55, z + 0.03, M.radWhite, g));
    for (let y = 0.35; y < 1.55; y += 0.08) B(2.42, y, 1.0, 2.45, y + 0.022, 1.5, M.radWhite, g);
  }, 0.6);

  // ---------- wall bed & storage (west wall) ----------
  item(gItems, 'rise', T.store, (g) => {
    B(0, 0, 1.55, 0.6, 2.2, 2.4, M.gloss, g); B(0.6, 0.02, 1.57, 0.61, 2.18, 1.97, M.gloss, g); B(0.6, 0.02, 1.98, 0.61, 2.18, 2.38, M.gloss, g);
    [1.93, 2.02].forEach((z) => sph(0.018, 0.625, 1.1, z, M.black, g));
  }, 0.7);
  item(gItems, 'rise', T.store + 0.2, (g) => {
    B(0, 0, 2.4, 0.48, 2.25, 2.48, M.gloss, g); B(0, 0, 3.88, 0.48, 2.25, 3.96, M.gloss, g);
    B(0, 2.1, 2.48, 0.48, 2.25, 3.88, M.gloss, g); B(0, 0, 2.48, 0.05, 2.1, 3.88, M.white, g);
  }, 0.7);
  item(gItems, 'rise', T.store + 0.35, (g) => {
    B(0, 0.12, 3.97, 0.33, 2.15, 4.0, M.white, g); B(0, 0.12, 4.32, 0.33, 2.15, 4.35, M.white, g);
    [0.15, 0.55, 0.95, 1.35, 1.75, 2.12].forEach((y) => B(0, y, 4.0, 0.33, y + 0.02, 4.32, M.white, g));
    [0.57, 0.97, 1.37].forEach((y, i) => B(0.03, y + 0.02, 4.02, 0.3, y + 0.26, i % 2 ? 4.3 : 4.12, M.black, g));
    [[0.3, 3.98], [0.3, 4.33]].forEach(([x, z]) => B(x, 0, z, x + 0.02, 0.12, z + 0.02, M.black, g));
  }, 0.7);
  item(gItems, 'drop', T.store + 0.5, (g) => {
    B(0, 0.72, 4.38, 0.55, 0.75, 4.95, M.white, g); B(0.5, 0, 4.4, 0.53, 0.72, 4.93, M.white, g);
    [1.35, 1.7].forEach((y) => B(0, y, 4.4, 0.24, y + 0.025, 4.93, M.white, g));
    B(0.02, 1.375, 4.6, 0.04, 1.62, 4.8, M.black, g); B(0.05, 1.375, 4.45, 0.07, 1.58, 4.55, std('#e8613c'), g);
    B(0.12, 0.75, 4.55, 0.32, 0.92, 4.58, M.black, g);
    cyl(0.075, 0.065, 0.13, 0.2, 0.75, 4.82, std('#5c7d5a', { roughness: .4 }), g);
  }, 0.6);

  // ---------- furniture ----------
  const F = T.furn;
  item(gItems, 'drop', F, (g) => {
    B(0.48, 0, 2.5, 2.48, 0.28, 3.86, M.white, g); B(0.5, 0.28, 2.52, 2.46, 0.5, 3.84, M.grey, g);
    B(0.48, 0.28, 2.52, 0.7, 0.74, 3.84, M.dark, g);
    [[2.6, 3.12], [3.24, 3.76]].forEach(([a, b]) => B(0.72, 0.5, a, 1.05, 0.62, b, M.greyLight, g));
  }, 0.75);
  item(gItems, 'drop', F + 0.35, (g) => {
    B(1.5, 0.4, 4.05, 2.55, 0.45, 4.6, M.blackWood, g);
    [[1.53, 4.08], [2.47, 4.08], [1.53, 4.52], [2.47, 4.52]].forEach(([x, z]) => B(x, 0, z, x + 0.05, 0.4, z + 0.05, M.blackWood, g));
  }, 0.6);
  item(gItems, 'pop', F + 0.5, (g) => { cyl(0.18, 0.18, 0.2, 0.85, 0, 4.5, M.velvet, g); cyl(0.185, 0.185, 0.04, 0.85, 0.2, 4.5, M.gold, g); cyl(0.18, 0.18, 0.2, 0.85, 0.24, 4.5, M.velvet, g); }, 0.55);
  item(gItems, 'drop', F + 0.65, (g) => {
    [[1.9, 0.78], [2.25, 0.78], [1.9, 1.29], [2.25, 1.29]].forEach(([x, z]) => B(x, 0, z, x + 0.025, 0.8, z + 0.025, M.black, g));
    [0.05, 0.42, 0.78].forEach((y) => B(1.9, y, 0.78, 2.28, y + 0.025, 1.32, M.oak, g));
    sph(0.12, 2.12, 0.93, 1.15, std('#f7f6f2', { emissive: '#fff6e0', emissiveIntensity: .3 }), g);
  }, 0.55);
  item(gItems, 'pop', F + 0.8, (g) => B(2.255, 1.28, 0.68, 2.3, 1.72, 1.42, M.blackGlass, g), 0.5);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x9c8f7e, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0da, 2.2);
  sun.position.copy(P(7, 12, -4)); sun.target.position.copy(P(1.2, 0, 2.5));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xdbe7ff, 0.6); fill.position.copy(P(-5, 6, D + 6)); scene.add(fill);
  scene.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- labels ----------
  const labelsEl = stage.querySelector('.plan3d__labels');
  const labels = [
    ['Living area', 'Séjour', P(1.9, 1.0, 4.4)], ['Wall bed', 'Lit escamotable', P(1.5, 0.95, 3.2)],
    ['Kitchen', 'Cuisine', P(3.5, 1.35, 3.8)], ['Shower room', "Salle d'eau", P(3.1, 1.25, 1.1)],
    ['Entrance', 'Entrée', P(-1.4, 0.6, 1.02), true], ['Desk', 'Bureau', P(0.3, 1.15, 4.65), true],
  ].map(([en, fr, pos, minor]) => {
    const el = document.createElement('span'); el.className = 'plan3d__label' + (minor ? ' is-minor' : '');
    el.setAttribute('data-en', en); el.setAttribute('data-fr', fr); el.textContent = lang() === 'fr' ? fr : en;
    labelsEl.appendChild(el); return { el, pos };
  });

  // ---------- caption ----------
  const capEl = stage.querySelector('.plan3d__caption span');
  const STEPS = [
    [T.floor, 'The oak floor', 'Le parquet'], [T.walls, 'The walls', 'Les murs'], [T.win, 'The windows', 'Les fenêtres'],
    [T.kit, 'The kitchen', 'La cuisine'], [T.bath, 'The shower room', "La salle d'eau"],
    [T.store, 'Wall bed & storage', 'Lit escamotable et rangements'], [T.furn, 'Furnishing', "L'ameublement"],
    [T.labels, 'Welcome to Avenue Paul Doumer', 'Bienvenue avenue Paul Doumer'],
  ];
  let capIdx = -1, capTimer = null;
  function setCaption(i) {
    if (i === capIdx) return; capIdx = i;
    clearTimeout(capTimer); capEl.classList.add('out');
    capTimer = setTimeout(() => {
      if (i < 0) return;
      const s = STEPS[i]; capEl.textContent = lang() === 'fr' ? s[2] : s[1]; capEl.classList.remove('out');
    }, 260);
  }
  new MutationObserver(() => { if (capIdx >= 0 && !capEl.classList.contains('out')) { const s = STEPS[capIdx]; capEl.textContent = lang() === 'fr' ? s[2] : s[1]; } updateViewBtn(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // ---------- timeline playback ----------
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  function applyTL(t) {
    for (const e of TL) {
      const p = Math.min(1, Math.max(0, (t - e.start) / e.dur)), o = e.obj;
      if (e.kind === 'rise' && o.userData.base === undefined) { o.userData.rise = easeOut(p); continue; } // wall groups
      o.visible = p > 0;
      if (!o.visible) continue;
      if (e.kind === 'rise') o.scale.set(1, Math.max(easeOut(p), 1e-3), 1);
      else if (e.kind === 'grow') { const s = Math.max(easeOut(p), 1e-3); o.scale.set(s, 1, s); }
      else if (e.kind === 'pop') o.scale.setScalar(Math.max(easeBack(p), 1e-3));
      else if (e.kind === 'drop') { const k = easeOut(p); o.position.y = o.userData.base.y + (1 - k) * 1.1; o.scale.setScalar(0.88 + 0.12 * k); }
    }
    let si = -1; STEPS.forEach((s, i) => { if (t >= s[0]) si = i; });
    if (t > T.labels + 3.2) si = -1;
    setCaption(si);
    stage.classList.toggle('is-built', t >= T.labels);
  }

  // ---------- camera framing ----------
  const center = P(0.9, 0.6, 2.5);
  let view = '3d', active = false, building = false, t0 = 0, tween = null, swing = null, swung = false;
  const sph3 = new THREE.Spherical();
  const SWING_THETA = 0.1, SWING_PHI = 0.7;     // end of the build: from the back, windows in view
  function framing(kind) {
    const a = camera.aspect, tf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (kind === 'top') {
      const d = a < 1 ? Math.max(3.8 / tf, 3.8 / (tf * a)) : Math.max(3.3 / tf, 3.9 / (tf * a));
      return { pos: center.clone().add(new THREE.Vector3(0, d, 0.01)), tgt: center.clone() };
    }
    const d = a < 1 ? Math.max(4.2 / tf, 4.2 / (tf * a)) : Math.max(3.9 / tf, 5.3 / (tf * a));
    const theta = -0.85, phi = 0.9;
    const off = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)).multiplyScalar(d);
    return { pos: center.clone().add(off), tgt: center.clone() };
  }
  function goTo(kind, instant) {
    const f = framing(kind);
    if (instant) { camera.position.copy(f.pos); controls.target.copy(f.tgt); controls.update(); return; }
    tween = { s: performance.now(), p0: camera.position.clone(), q0: controls.target.clone(), p1: f.pos, q1: f.tgt };
  }

  // ---------- UI ----------
  if (matchMedia('(pointer: coarse)').matches) {          // touch wording
    const sw = (sel, en, fr) => { const el = stage.querySelector(sel); if (!el) return; el.setAttribute('data-en', en); el.setAttribute('data-fr', fr); el.textContent = lang() === 'fr' ? fr : en; };
    sw('.plan3d__explore', 'Tap to explore', 'Touchez pour explorer');
    sw('.plan3d__hint', 'Drag to turn · Pinch to zoom · Two fingers to move', 'Glisser pour tourner · Pincer pour zoomer · Deux doigts pour déplacer');
  }
  const viewBtn = stage.querySelector('[data-act="view"]');
  function updateViewBtn() {
    if (!viewBtn) return;
    const en = view === 'top' ? '3D view' : 'Top view', fr = view === 'top' ? 'Vue 3D' : 'Vue du dessus';
    viewBtn.setAttribute('data-en', en); viewBtn.setAttribute('data-fr', fr); viewBtn.textContent = lang() === 'fr' ? fr : en;
  }
  function setActive(on) {
    active = on; controls.enabled = on; controls.autoRotate = !on && view === '3d' && !reduce;
    renderer.domElement.style.touchAction = on ? 'none' : 'pan-y';
    stage.classList.toggle('is-active', on);
  }
  stage.querySelector('.plan3d__explore')?.addEventListener('click', (e) => { e.stopPropagation(); setActive(true); });
  renderer.domElement.addEventListener('click', () => { if (!active) setActive(true); });
  document.addEventListener('click', (e) => { if (active && !stage.contains(e.target)) setActive(false); });
  viewBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); view = view === 'top' ? '3d' : 'top';
    controls.autoRotate = !active && view === '3d' && !reduce; updateViewBtn(); goTo(view);
  });
  stage.querySelector('[data-act="replay"]')?.addEventListener('click', (e) => {
    e.stopPropagation(); view = '3d'; updateViewBtn(); controls.autoRotate = !active && !reduce; goTo('3d'); startBuild();
  });
  updateViewBtn();

  function startBuild() { building = true; swung = reduce; swing = null; t0 = performance.now(); if (reduce) t0 -= T.end * 1000; applyTL(reduce ? T.end : 0); }
  function startSwing() {
    swung = true; sph3.setFromVector3(camera.position.clone().sub(controls.target));
    let d = SWING_THETA - sph3.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); if (d < 0) d += Math.PI * 2; if (d > 1.9 * Math.PI) d = 0;
    swing = { s: performance.now(), th0: sph3.theta, d, ph0: sph3.phi, ph1: SWING_PHI, r: sph3.radius };
  }

  // ---------- sizing, visibility, loop ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();
  goTo('3d', true);
  applyTL(-1);

  let visible = false, raf = 0, last = performance.now(), started = false;
  new IntersectionObserver((es) => {
    const e = es[0]; visible = e.isIntersecting;
    if (visible && !started && e.intersectionRatio >= 0.3) { started = true; startBuild(); }
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { threshold: [0, 0.3, 0.6] }).observe(stage);

  const v = new THREE.Vector3();
  function loop(now) {
    raf = 0; if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (building) {
      const t = (now - t0) / 1000; applyTL(t);
      if (!swung && t >= T.swing && !active && view === '3d' && !tween) startSwing();
      if (t > T.labels + 3.4) building = false;
    }
    if (swing && (active || view !== '3d')) swing = null;
    if (swing) {
      const k = Math.min(1, (now - swing.s) / 2600), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      sph3.set(swing.r, swing.ph0 + (swing.ph1 - swing.ph0) * e, swing.th0 + swing.d * e);
      camera.position.setFromSpherical(sph3).add(controls.target); camera.lookAt(controls.target);
      if (k >= 1) { swing = null; controls.update(); }
    } else
    if (tween) {
      const k = Math.min(1, (now - tween.s) / 1100), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e); camera.lookAt(controls.target);
      if (k >= 1) { tween = null; controls.update(); }
    } else controls.update(dt);

    // dollhouse: lower the walls that stand between the camera and the rooms
    const cx = camera.position.x, cz = D - camera.position.z, k = Math.min(1, dt * 6);
    for (const e of EXT) {
      const out = e.pred ? e.pred(cx, cz) : e.kind === 'N' ? cz > e.coord : e.kind === 'S' ? cz < e.coord : e.kind === 'W' ? cx < e.coord : cx > e.coord;
      e.f += ((out ? 0.1 : 1) - e.f) * k;
      const r = e.g.userData.rise; e.g.visible = r > 0.002; e.g.scale.y = Math.max(r * e.f, 1e-3);
      e.att.visible = e.f > 0.55;
    }
    gInt.visible = gInt.userData.rise > 0.002; gInt.scale.y = Math.max(gInt.userData.rise, 1e-3);

    renderer.render(scene, camera);

    if (stage.classList.contains('is-built')) {
      const w = stage.clientWidth, h = stage.clientHeight;
      for (const l of labels) {
        v.copy(l.pos).project(camera);
        if (v.z > 1) { l.el.style.visibility = 'hidden'; continue; }
        l.el.style.visibility = '';
        l.el.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px) translate(-50%,-50%)`;
      }
    }
    raf = requestAnimationFrame(loop);
  }
  if (/[?&]debug3d/.test(location.search)) {   // test hook: ?debug3d
    window.__plan3dSeek = (t, sw) => { building = false; applyTL(t); if (sw) { startSwing(); swing.s -= 2600; } };
  }
  window.__plan3dReady = true;
}
