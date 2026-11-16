/* =========================================================
   EVO — Ginoux · interactive 3D layout
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
  // ---------- Plan (metres) : x west→east, z courtyard(0)→street(D) ----------
  const LX = 7.3, D = 6.4, H = 3.0, FT = 0.45;
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
        let len = Math.round((0.7 + rnd() * 1.1) * pxm); if (covered + len > w) len = w - covered;
        const col = `hsl(${28 + rnd() * 7},${50 + rnd() * 14}%,${36 + rnd() * 14}%)`;
        for (const xx of [x, x - w]) {
          g.fillStyle = col; g.fillRect(xx, y, len, ph);
          g.strokeStyle = `rgba(70,38,15,${0.08 + rnd() * 0.1})`; g.lineWidth = 1.2;
          for (let k = 0; k < 7; k++) { const yy = y + 3 + rnd() * (ph - 6); g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + len * .3, yy + (rnd() - .5) * 7, xx + len * .6, yy + (rnd() - .5) * 7, xx + len, yy + (rnd() - .5) * 5); g.stroke(); }
          g.fillStyle = 'rgba(40,22,8,.6)'; g.fillRect(xx, y, 2, ph);
        }
        x = (x + len) % w; covered += len;
      }
      g.fillStyle = 'rgba(40,22,8,.55)'; g.fillRect(0, y, w, 2);
    }
  });
  texParquet.repeat.set(0.5, 0.5);
  const texSubway = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#26393b'; g.fillRect(0, 0, w, h);
    const tw = 256, th = 64;
    for (let r = 0; r < h / th; r++) for (let c = -1; c < w / tw + 1; c++) {
      const x = c * tw + (r % 2 ? tw / 2 : 0), y = r * th;
      g.fillStyle = `hsl(${186 + rnd() * 8},${22 + rnd() * 10}%,${30 + rnd() * 9}%)`; g.fillRect(x + 3, y + 3, tw - 6, th - 6);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x + 8, y + 8, tw * 0.6 * rnd() + 20, 6);
    }
  });
  const texGreyTile = canvasTex(256, 256, (g) => {
    g.fillStyle = '#c6c6c1'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `hsl(48,${4 + rnd() * 3}%,${80 + rnd() * 3}%)`; g.fillRect(i * 128 + 1.5, j * 128 + 1.5, 125, 125); }
  });
  const texMarble = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6f342d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${90 + rnd() * 70},${30 + rnd() * 30},${25 + rnd() * 25},.35)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 34, 0, 7); g.fill(); }
    g.lineWidth = 1.6;
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(236,222,214,${0.35 + rnd() * 0.4})`; g.beginPath();
      let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 90; y += (rnd() - .3) * 70; g.lineTo(x, y); }
      g.stroke();
    }
  });

  // ---------- materials ----------
  const M = {
    wall: std('#f1eee8', { roughness: .95 }), pink: std('#e8cfcc', { roughness: .95 }), pinkNiche: std('#ecd5cf', { roughness: .95 }),
    base: std('#d9d1c3'), floor: std('#ffffff', { map: texParquet, roughness: .45 }),
    white: std('#f7f6f2', { roughness: .3 }), white2: std('#eceae4', { roughness: .55 }), frameWhite: std('#f4f3ef', { roughness: .4 }),
    oak: std('#c9a06a', { roughness: .55 }), walnut: std('#5e321f', { roughness: .45 }), lightWood: std('#c9a27a', { roughness: .6 }),
    black: std('#232427', { roughness: .5 }), blackGlass: std('#121315', { roughness: .15, metalness: .2 }),
    steel: std('#b9bdc2', { metalness: .35, roughness: .3 }), chrome: std('#d6dadd', { metalness: .3, roughness: .18 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe3f0', transparent: true, opacity: .2, roughness: .05, depthWrite: false }),
    showerGlass: new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: .16, roughness: .05, depthWrite: false }),
    mirror: std('#d3dde2', { metalness: .2, roughness: .06, emissive: '#9fb0b8', emissiveIntensity: .25 }),
    gold: std('#c69a32', { metalness: .75, roughness: .3 }), marble: std('#ffffff', { map: texMarble, roughness: .3 }),
    green: std('#3f6a56', { roughness: .8 }), navy: std('#2f3748', { roughness: .5 }),
    grey: std('#9fa19e', { roughness: .95 }), greyLight: std('#c9cbc6', { roughness: .95 }),
    futon: std('#4f6f8f', { roughness: .95 }), olive: std('#666a4c', { roughness: .95 }), bordeaux: std('#5c1f27', { roughness: .45 }),
    radWhite: std('#f4f4f2', { roughness: .4 }),
    led: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.2 }),
  };
  const cushionCols = ['#26344f', '#2f7f86', '#c9a03a', '#a8c4d4', '#7d2333', '#2f7f86'].map((c) => std(c, { roughness: 1 }));
  const bookCols = ['#7a2433', '#2f3b5a', '#d9d1bd', '#3f5a3c', '#c9a24a', '#e8e2d2'].map((c) => std(c, { roughness: .9 }));

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
  function extGroup(kind, coord) {
    const g = new THREE.Group(), att = new THREE.Group(); g.userData.rise = 0; scene.add(g, att);
    const e = { g, att, kind, coord, f: 1 }; EXT.push(e); return e;
  }
  const N = extGroup('N', D), W0 = extGroup('W', 0), Wh = extGroup('W', 1.35), Salc = extGroup('S', 4.1),
    Sland = extGroup('S', 1.6), Sbath = extGroup('S', 0), Sbed = extGroup('S', 1.0), E = extGroup('E', LX);
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
  const T = { floor: 0, walls: 0.55, kit: 2.3, bath: 2.9, fire: 3.5, furn: 4.1, swing: 5.6, win: 6.9, labels: 8.4, end: 8.9 };

  // ---------- floor ----------
  const footprint = [[0, D], [LX, D], [LX, 1.0], [4.4, 1.0], [4.4, 0], [2.5, 0], [2.5, 1.6], [1.5, 1.6], [1.5, 4.1], [0, 4.1]];
  item(gItems, 'grow', T.floor, (g) => B(-0.25, -0.3, -0.3, LX + 0.25, -0.002, D + FT + 0.05, M.base, g), 0.9);
  item(gItems, 'grow', T.floor + 0.15, (g) => {
    const fs = new THREE.Shape(footprint.map(([x, z]) => new THREE.Vector2(x, z - D)));
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(fs), M.floor); fl.rotation.x = -Math.PI / 2; g.add(fl);
  }, 0.9);

  // ---------- walls ----------
  const WIN = [{ a0: 0.2, a1: 1.15 }, { a0: 2.6, a1: 3.7 }, { a0: 5.65, a1: 6.75 }];
  wallX(-0.2, LX + 0.2, D, D + 0.25, 0, H, WIN.map((w) => ({ ...w, b0: 0, b1: 2.78 })), N.g);
  wallX(-0.2, LX + 0.2, D + 0.25, D + FT, 0, H, WIN.map((w) => ({ ...w, b0: 0.45, b1: 2.65 })), N.g);
  wallZ(3.9, D + FT, -0.2, 0, 0, H, [], W0.g);
  wallZ(1.4, 4.1, 1.35, 1.5, 0, H, [], Wh.g);
  wallX(-0.2, 1.35, 3.9, 4.1, 0, H, [], Salc.g);
  wallX(1.35, 2.6, 1.4, 1.6, 0, H, [{ a0: 1.6, a1: 2.45, b0: 0, b1: 2.1 }], Sland.g);
  wallX(2.5, 4.4, -0.25, 0, 0, H, [{ a0: 3.0, a1: 3.8, b0: 1.0, b1: 2.4 }], Sbath.g);
  wallX(4.4, LX + 0.2, 0.8, 1.0, 0, H, [], Sbed.g);
  wallZ(0.8, D + FT, LX, LX + 0.2, 0, H, [], E.g);
  solid(7.0, 0, 4.3, LX, H, 5.5, E.g);                       // chimney breast
  B(LX - 0.01, 0, 5.5, LX, H, D, M.green, E.g);             // green niche back
  // interior partitions + arch
  wallZ(-0.25, 2.9, 2.5, 2.6, 0, H, [{ a0: 2.05, a1: 2.75, b0: 0, b1: 2.05 }], gInt);
  wallX(2.6, 4.25, 2.8, 2.9, 0, H, [], gInt);
  wallZ(-0.25, 2.9, 4.25, 4.4, 0, H, [], gInt);
  wallZ(0.8, 3.5, 4.4, 4.6, 0, H, [], gInt);
  solid(1.35, 0, 4.1, 1.5, H, 4.3, gInt); solid(1.35, 0, 6.2, 1.5, H, D, gInt);
  shapeYZ([[4.3, H], [4.3, 2.15], ...arc(4.3, 6.2, 2.15, 0.55).slice(1, -1), [6.2, 2.15], [6.2, H]], 1.35, 0.15, M.wall, gInt);
  B(2.6, 2.25, 2.9, 4.4, H, 3.25, M.wall, gInt);
  // paint
  B(0, 0, 4.1, 0.005, H, D, M.pink, W0.g); B(0, 0, 4.1, 1.35, H, 4.105, M.pink, Salc.g);
  B(4.6, 0, 1.0, LX, H, 1.005, M.pinkNiche, Sbed.g); B(4.6, 0, 1.0, 4.605, H, 2.9, M.pinkNiche, gInt); B(LX - 0.005, 0, 1.0, LX, H, 3.5, M.pinkNiche, E.g);
  // shower-room tiles (rise with the walls)
  {
    const tm = (w, h) => tiled(texGreyTile, w, h, 1.2, { roughness: .3 });
    B(2.6, 0, 0, 2.61, H, 2.05, tm(2.05, H), gInt); B(2.6, 2.05, 2.05, 2.61, H, 2.75, tm(.7, 1), gInt); B(2.6, 0, 2.75, 2.61, H, 2.8, tm(.05, H), gInt);
    B(4.24, 0, 0, 4.25, H, 2.8, tm(2.8, H), gInt); B(2.6, 0, 2.79, 4.25, H, 2.8, tm(1.65, H), gInt);
    B(2.6, 0, 0, 3.0, H, 0.01, tm(.4, H), Sbath.g); B(3.8, 0, 0, 4.25, H, 0.01, tm(.45, H), Sbath.g);
    B(3.0, 0, 0, 3.8, 1.0, 0.01, tm(.8, 1), Sbath.g); B(3.0, 2.4, 0, 3.8, H, 0.01, tm(.8, .6), Sbath.g);
  }
  [N, W0, Wh, Salc, Sland, Sbath, Sbed, E].forEach((e, i) => reg(e.g, 'rise', T.walls + i * 0.13, 0.95));
  reg(gInt, 'rise', T.walls + 1.0, 1.0);

  // ---------- windows, balconies, door ----------
  WIN.forEach((w, i) => item(N.att, 'drop', T.win + i * 0.15, (g) => {
    placeZ(makeWindow({ u0: w.a0, u1: w.a1, v0: 0.45, v1: 2.65, frame: M.frameWhite }), D + 0.32, g);
    B(w.a0 + 0.08, 0.1, D + 0.12, w.a1 - 0.08, 0.42, D + 0.24, M.radWhite, g);
    const z0 = D + FT + 0.01;
    B(w.a0, 1.0, z0, w.a1, 1.04, z0 + 0.04, M.black, g); B(w.a0, 0.47, z0, w.a1, 0.5, z0 + 0.04, M.black, g);
    for (let x = w.a0 + 0.04; x < w.a1; x += 0.07) B(x - 0.007, 0.5, z0 + 0.01, x + 0.007, 1.0, z0 + 0.03, M.black, g);
    const mid = (w.a0 + w.a1) / 2;
    [mid - 0.25, mid, mid + 0.25].forEach((x) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.007, 6, 24), M.black); t.position.copy(P(x, 0.75, z0 + 0.02)); g.add(t); });
  }, 0.75));
  item(Sbath.att, 'drop', T.win + 0.45, (g) => placeZ(makeWindow({ u0: 3.0, u1: 3.8, v0: 1.0, v1: 2.4, frame: M.frameWhite, rows: 3 }), -0.12, g), 0.75);
  item(Sland.att, 'rise', T.win + 0.55, (g) => {
    B(1.6, 0.01, 1.44, 2.45, 2.08, 1.5, M.bordeaux, g); B(1.6, 0.01, 1.5, 2.45, 2.08, 1.56, M.white, g);
    B(2.33, 0.95, 1.56, 2.4, 1.15, 1.6, M.steel, g); B(2.355, 0.05, 1.56, 2.375, 2.0, 1.58, M.steel, g);
  }, 0.7);

  // ---------- kitchen ----------
  item(gItems, 'rise', T.kit, (g) => {
    B(2.6, 0, 2.9, 3.8, 0.86, 3.47, M.white2, g); B(2.6, 0, 3.42, 3.8, 0.1, 3.46, std('#d9d6cf'), g);
    [[2.62, 3.18], [3.22, 3.78]].forEach(([a, b]) => { B(a, 0.11, 3.47, b, 0.84, 3.49, M.white, g); B(b - 0.06, 0.45, 3.49, b - 0.045, 0.75, 3.52, M.steel, g); });
  }, 0.6);
  item(gItems, 'rise', T.kit + 0.15, (g) => {
    B(3.8, 0, 2.9, 4.4, 2.25, 3.5, M.white, g);
    B(3.84, 0.72, 3.5, 4.36, 1.3, 3.52, M.steel, g); B(3.88, 0.78, 3.52, 4.32, 1.15, 3.525, M.blackGlass, g);
    B(3.84, 1.34, 3.5, 4.36, 1.72, 3.52, M.steel, g); B(3.87, 1.38, 3.52, 4.18, 1.68, 3.525, M.blackGlass, g);
    B(3.82, 1.76, 3.5, 4.38, 2.23, 3.52, M.white, g); B(3.82, 0.1, 3.5, 4.38, 0.68, 3.52, M.white, g);
  }, 0.7);
  item(gItems, 'drop', T.kit + 0.3, (g) => {
    B(2.6, 0.86, 2.9, 3.8, 0.9, 3.5, M.oak, g);
    B(2.66, 0.9, 3.0, 3.14, 0.906, 3.44, M.blackGlass, g); B(3.3, 0.896, 3.02, 3.72, 0.908, 3.42, M.black, g);
    cyl(0.014, 0.014, 0.28, 3.5, 0.9, 2.97, M.black, g);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 10), M.black); s.rotation.x = Math.PI / 2; s.position.copy(P(3.5, 1.17, 3.04)); g.add(s);
  }, 0.6);
  item(gItems, 'rise', T.kit + 0.4, (g) => B(2.6, 0.9, 2.9, 3.8, 1.5, 2.91, tiled(texSubway, 1.2, 0.6, 0.6, { roughness: .15 }), g), 0.5);
  item(gItems, 'drop', T.kit + 0.5, (g) => {
    B(2.6, 1.5, 2.9, 3.8, 2.25, 3.25, M.white, g);
    [[2.62, 3.18], [3.22, 3.78]].forEach(([a, b]) => { B(a, 1.52, 3.25, b, 2.23, 3.27, M.white, g); B(b - 0.06, 1.55, 3.27, b - 0.045, 1.8, 3.3, M.steel, g); });
    B(2.64, 1.46, 3.0, 3.16, 1.5, 3.29, M.steel, g);
  }, 0.6);

  // ---------- shower room ----------
  item(gItems, 'grow', T.bath - 0.1, (g) => {
    const t = texGreyTile.clone(); t.needsUpdate = true; t.repeat.set(1.65 / 1.2, 2.8 / 1.2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.8), std('#ffffff', { map: t, roughness: .35 }));
    fl.rotation.x = -Math.PI / 2; fl.position.copy(P(3.425, 0.004, 1.4)); g.add(fl);
  }, 0.5);
  item(gItems, 'rise', T.bath, (g) => B(2.61, 0, 0.01, 4.24, 0.04, 1.0, M.white, g), 0.4);
  item(gItems, 'rise', T.bath + 0.12, (g) => {
    B(2.61, 0.04, 0.98, 4.24, 2.0, 0.995, M.showerGlass, g); B(2.61, 1.97, 0.97, 4.24, 2.0, 1.0, M.chrome, g);
    cyl(0.013, 0.013, 1.2, 2.66, 0.85, 0.5, M.chrome, g); cyl(0.1, 0.1, 0.012, 2.8, 2.08, 0.5, M.chrome, g);
  }, 0.6);
  item(gItems, 'pop', T.bath + 0.3, (g) => {
    B(4.03, 0.4, 1.25, 4.24, 0.8, 1.65, M.white, g);
    cyl(0.17, 0.13, 0.4, 3.86, 0, 1.45, M.white, g); cyl(0.19, 0.19, 0.03, 3.86, 0.4, 1.45, M.white, g);
  }, 0.55);
  item(gItems, 'drop', T.bath + 0.42, (g) => {
    B(3.76, 0.4, 1.95, 4.24, 0.84, 2.7, M.navy, g); B(3.755, 0.62, 1.98, 3.76, 0.63, 2.67, std('#1f2533'), g);
    B(3.72, 0.84, 1.93, 4.24, 0.88, 2.72, M.white, g); cyl(0.014, 0.014, 0.2, 4.17, 0.88, 2.32, M.black, g);
    B(4.22, 1.15, 2.0, 4.24, 1.95, 2.65, M.mirror, g); B(4.215, 1.83, 2.08, 4.22, 1.86, 2.57, M.led, g);
  }, 0.6);
  item(gItems, 'drop', T.bath + 0.55, (g) => {
    [2.75, 3.2].forEach((x) => B(x, 0.3, 2.72, x + 0.03, 1.5, 2.77, M.radWhite, g));
    for (let y = 0.35; y < 1.5; y += 0.08) B(2.75, y, 2.735, 3.23, y + 0.022, 2.755, M.radWhite, g);
    B(2.8, 0.8, 2.68, 3.16, 1.42, 2.72, std('#62656b', { roughness: 1 }), g);
    B(2.7, 1.6, 2.44, 3.28, 2.42, 2.79, M.white, g);
  }, 0.6);

  // ---------- fireplace, gilt mirror, shelves ----------
  item(E.att, 'rise', T.fire, (g) => {
    B(6.78, 1.0, 4.33, 7.0, 1.06, 5.47, M.marble, g);
    B(6.82, 0, 4.36, 7.0, 1.0, 4.6, M.marble, g); B(6.82, 0, 5.2, 7.0, 1.0, 5.44, M.marble, g);
    B(6.82, 0.74, 4.6, 7.0, 1.0, 5.2, M.marble, g); B(6.9, 0, 4.6, 7.0, 0.74, 5.2, std('#18181a'), g);
    B(6.55, 0, 4.33, 7.0, 0.015, 5.47, M.marble, g);
  }, 0.7);
  item(E.att, 'drop', T.fire + 0.25, (g) => {
    const outer = [[-0.36, 0], [0.36, 0], [0.36, 1.0], ...arc(0.36, -0.36, 1.0, 0.36).slice(1, -1), [-0.36, 1.0]];
    const inner = [[-0.3, 0.06], [0.3, 0.06], [0.3, 1.0], ...arc(0.3, -0.3, 1.0, 0.3).slice(1, -1), [-0.3, 1.0]];
    const mk = (p, x0, d, m) => { const s = new THREE.Shape(p.map((q) => new THREE.Vector2(q[0], q[1]))); const me = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 24 }), m); me.rotation.y = Math.PI / 2; me.position.copy(P(x0, 1.12, 4.9)); g.add(me); };
    mk(outer, 6.965, 0.035, M.gold); mk(inner, 6.95, 0.015, M.mirror);
  }, 0.7);
  item(E.att, 'rise', T.fire + 0.4, (g) => {
    for (let i = 0; i < 6; i++) {
      const y = 0.35 + i * 0.38; B(7.0, y, 5.52, LX - 0.01, y + 0.025, 6.38, M.walnut, g);
      if (i % 2 === 0) B(7.08, y + 0.025, 5.6, 7.26, y + 0.24, 5.85, bookCols[i % bookCols.length], g);
      else B(7.22, y + 0.025, 5.75, 7.24, y + 0.26, 6.0, std('#f3efe6'), g);
      if (i === 1 || i === 4) { cyl(0.05, 0.04, 0.09, 7.15, y + 0.025, 6.2, std('#e9e6df'), g); sph(0.06, 7.15, y + 0.16, 6.2, std('#4f7a43'), g); }
    }
  }, 0.8);

  // ---------- furniture ----------
  const F = T.furn;
  item(gItems, 'drop', F, (g) => {
    B(4.8, 0, 1.08, 6.2, 0.32, 3.05, M.greyLight, g); B(4.78, 0.32, 1.12, 6.22, 0.56, 3.07, M.grey, g);
    B(4.95, 0.56, 1.15, 6.05, 0.64, 1.55, M.grey, g); B(4.8, 0, 1.0, 6.2, 1.02, 1.08, M.greyLight, g);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 16), M.greyLight); r.rotation.z = Math.PI / 2; r.position.copy(P(5.5, 1.02, 1.04)); g.add(r);
  }, 0.75);
  item(E.att, 'rise', F + 0.2, (g) => {
    B(6.7, 0, 1.2, LX - 0.005, 2.25, 2.75, M.white, g);
    [[1.22, 2.0, 6.68], [1.95, 2.73, 6.66]].forEach(([z0, z1, x]) => {
      B(x, 0.02, z0, x + 0.02, 2.23, z1, M.white, g);
      [0.06, 1.05, 2.17].forEach((y) => B(x - 0.012, y, z0 + 0.04, x, y + 0.05, z1 - 0.04, M.white2, g));
      B(x - 0.014, 0.02, z0, x + 0.005, 2.23, z0 + 0.025, M.steel, g); B(x - 0.014, 0.02, z1 - 0.025, x + 0.005, 2.23, z1, M.steel, g);
    });
  }, 0.8);
  item(gItems, 'drop', F + 0.4, (g) => { B(0.02, 0, 4.18, 0.95, 0.2, 6.18, M.lightWood, g); B(0.04, 0.2, 4.2, 0.93, 0.36, 6.16, M.futon, g); }, 0.7);
  { const cw = 0.4, step = (6.1 - 4.26 - cw) / 5;
    for (let i = 0; i < 6; i++) { const z = 4.26 + i * step;
      item(gItems, 'drop', F + 0.7 + i * 0.09, (g) => B(0.06 + (i % 2) * 0.05, 0.36, z, 0.24 + (i % 2) * 0.05, 0.74 - (i % 2) * 0.1, z + cw, cushionCols[i], g), 0.55); } }
  item(gItems, 'drop', F + 1.25, (g) => {
    B(1.75, 0.36, 4.6, 2.23, 0.4, 5.7, M.walnut, g);
    [[1.8, 4.67], [2.13, 4.67], [1.8, 5.58], [2.13, 5.58]].forEach(([x, z]) => B(x, 0, z, x + 0.04, 0.36, z + 0.04, M.walnut, g));
  }, 0.6);
  item(gItems, 'pop', F + 1.4, (g) => cyl(0.21, 0.21, 0.42, 2.85, 0, 5.0, M.olive, g), 0.55);
  item(gItems, 'drop', F + 1.5, (g) => {
    B(4.35, 0.72, 5.15, 4.95, 0.75, 6.35, M.walnut, g);
    [[4.4, 5.2], [4.88, 5.2], [4.4, 6.28], [4.88, 6.28]].forEach(([x, z]) => B(x, 0, z, x + 0.015, 0.72, z + 0.015, M.black, g));
    [[4.4, 5.3], [4.7, 5.3]].forEach(([x, z]) => { B(x, 0.75, z, x + 0.22, 0.756, z + 0.34, std('#9a9da0'), g); cyl(0.1, 0.1, 0.012, x + 0.11, 0.756, z + 0.17, M.white, g); });
    cyl(0.035, 0.03, 0.14, 4.62, 0.75, 5.9, std('#2b49b3', { transparent: true, opacity: .8 }), g);
  }, 0.6);
  function chair(x, z, ry, start) {
    item(gItems, 'drop', start, (g) => {
      const c = new THREE.Group();
      LB(-0.2, 0.44, -0.2, 0.2, 0.47, 0.2, M.walnut, c); LB(-0.2, 0.7, 0.16, 0.2, 0.86, 0.19, M.walnut, c);
      [[-0.18, -0.18], [0.16, -0.18], [-0.18, 0.16], [0.16, 0.16]].forEach(([a, b]) => LB(a, 0, b, a + 0.02, 0.44, b + 0.02, M.black, c));
      [-0.18, 0.16].forEach((a) => LB(a, 0.44, 0.17, a + 0.02, 0.86, 0.19, M.black, c));
      c.rotation.y = ry; c.position.copy(P(x, 0, z)); g.add(c);
    }, 0.55);
  }
  chair(4.05, 5.65, -Math.PI / 2, F + 1.65); chair(5.25, 5.65, Math.PI / 2, F + 1.75);
  item(N.att, 'pop', T.win + 0.75, (g) => B(4.1, 1.35, D - 0.06, 5.2, 1.98, D - 0.01, M.blackGlass, g), 0.55);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x9c8f7e, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0da, 2.2);
  sun.position.copy(P(7, 12, -4)); sun.target.position.copy(P(3.6, 0, 3.2));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xdbe7ff, 0.6); fill.position.copy(P(-5, 6, D + 6)); scene.add(fill);
  scene.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- labels ----------
  const labelsEl = stage.querySelector('.plan3d__labels');
  const labels = [
    ['Living room', 'Séjour', P(3.5, 1.0, 4.85)], ['Reading alcove', 'Alcôve', P(0.7, 1.0, 5.2)],
    ['Kitchen', 'Cuisine', P(3.2, 1.35, 3.25)], ['Sleeping area', 'Coin nuit', P(5.5, 1.1, 2.0)],
    ['Shower room', "Salle d'eau", P(3.4, 1.25, 1.3)], ['Entrance', 'Entrée', P(2.0, 0.6, 2.2), true],
    ['Marble fireplace', 'Cheminée', P(6.8, 1.45, 4.9)],
  ].map(([en, fr, pos, minor]) => {
    const el = document.createElement('span'); el.className = 'plan3d__label' + (minor ? ' is-minor' : '');
    el.setAttribute('data-en', en); el.setAttribute('data-fr', fr); el.textContent = lang() === 'fr' ? fr : en;
    labelsEl.appendChild(el); return { el, pos };
  });

  // ---------- caption ----------
  const capEl = stage.querySelector('.plan3d__caption span');
  const STEPS = [
    [T.floor, 'The parquet', 'Le parquet'], [T.walls, 'The walls', 'Les murs'], [T.kit, 'The kitchen', 'La cuisine'],
    [T.bath, 'The shower room', "La salle d'eau"], [T.fire, 'The marble fireplace', 'La cheminée en marbre'],
    [T.furn, 'Furnishing', "L'ameublement"], [T.win, 'French windows & balconies', 'Portes-fenêtres et balcons'],
    [T.labels, 'Welcome to Ginoux', 'Bienvenue à Ginoux'],
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
  const center = P(3.65, 0.6, 3.25);
  let view = '3d', active = false, building = false, t0 = 0, tween = null, swing = null, swung = false;
  const sph3 = new THREE.Spherical();
  const SWING_THETA = -0.12, SWING_PHI = 0.7;   // end of the build: courtyard side, facade in view
  function framing(kind) {
    const a = camera.aspect, tf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (kind === 'top') {
      const d = a < 1 ? Math.max(4.15 / tf, 4.15 / (tf * a)) : Math.max(4.2 / tf, 4.4 / (tf * a));
      return { pos: center.clone().add(new THREE.Vector3(0, d, 0.01)), tgt: center.clone() };
    }
    const d = a < 1 ? Math.max(4.6 / tf, 4.6 / (tf * a)) : Math.max(4.3 / tf, 6.0 / (tf * a));
    const theta = Math.PI * 1.15, phi = 0.92;
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
      const out = e.kind === 'N' ? cz > e.coord : e.kind === 'S' ? cz < e.coord : e.kind === 'W' ? cx < e.coord : cx > e.coord;
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
  if (/[?&]debug3d/.test(location.search)) {   // test hook: /ginoux/?debug3d
    window.__plan3dSeek = (t, sw) => { building = false; applyTL(t); if (sw) { startSwing(); swing.s -= 2600; } };
  }
  window.__plan3dReady = true;
}
