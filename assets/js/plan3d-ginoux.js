/* =========================================================
   EVO — Ginoux · interactive 3D layout
   The studio builds itself piece by piece when the section
   comes into view, then turns slowly. Click to explore it
   (drag to turn, scroll / pinch to zoom, right-click to move).
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

  // ---------- extra helpers ----------
  function RB(x0, y0, z0, x1, y1, z1, r, mat, parent, seg = 3) {          // rounded box (soft furnishings)
    const w = x1 - x0, h = y1 - y0, d = z1 - z0, rr = Math.min(r, w / 2, h / 2, d / 2) * 0.98;
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, rr), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, D - (z0 + z1) / 2); parent.add(m); return m;
  }
  function rod(a, b, ra, rb, mat, parent, seg = 10) {                      // cylinder between two plan points [x, y, z]
    const A = P(...a), Bp = P(...b), dir = Bp.clone().sub(A), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, seg), mat);
    m.position.copy(A).add(Bp).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(m); return m;
  }
  function lrod(a, b, r, mat, parent) {                                     // same, in local coordinates
    const A = new THREE.Vector3(...a), Bp = new THREE.Vector3(...b), dir = Bp.clone().sub(A), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.copy(A).add(Bp).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(m); return m;
  }
  const toShape = (pts) => new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  const toPath = (pts) => new THREE.Path(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  function extrudeXY(pts, z0, depth, mat, parent, holes = []) {            // profile in (x, y), extruded across plan z0 → z0 + depth
    const s = toShape(pts); holes.forEach((h) => s.holes.push(toPath(h)));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 }), mat);
    m.position.set(0, 0, D - z0 - depth); parent.add(m); return m;
  }
  function slabXZ(pts, y0, depth, mat, parent, holes = []) {               // outline in plan (x, z), extruded upwards from y0
    const s = toShape(pts.map(([x, z]) => [x, z - D])); holes.forEach((h) => s.holes.push(toPath(h.map(([x, z]) => [x, z - D]))));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 }), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = y0; parent.add(m); return m;
  }
  function rrPts(u0, v0, u1, v1, r, top = true, bottom = true, n = 6) {   // rounded rectangle outline
    const pts = [], c = (cu, cv, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); } };
    if (bottom) { c(u0 + r, v0 + r, Math.PI); c(u1 - r, v0 + r, -Math.PI / 2); } else pts.push([u0, v0], [u1, v0]);
    if (top) { c(u1 - r, v1 - r, 0); c(u0 + r, v1 - r, Math.PI / 2); } else pts.push([u1, v1], [u0, v1]);
    return pts;
  }
  const circlePts = (cu, cv, r, n = 20) => Array.from({ length: n }, (_, i) => [cu + r * Math.cos(2 * Math.PI * i / n), cv + r * Math.sin(2 * Math.PI * i / n)]);
  // basket-handle arch: flat crown, rounded shoulders
  const arcB = (u0, u1, vs, rise, n = 32) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push([u0 + (u1 - u0) * t, vs + rise * Math.pow(Math.sin(Math.PI * t), 0.55)]); } return p; };

  // ---------- textures ----------
  const texParquet = canvasTex(1024, 1024, (g, w, h) => {          // straight-laid honey oak strips ("parquet parisien")
    const rows = 14, ph = h / rows, pxm = w / 2;
    for (let r = 0; r < rows; r++) {
      const y = r * ph; let x = rnd() * w, covered = 0;
      while (covered < w) {
        let len = Math.round((0.6 + rnd() * 1.0) * pxm); if (covered + len > w) len = w - covered;
        const col = `hsl(${30 + rnd() * 7},${42 + rnd() * 12}%,${52 + rnd() * 13}%)`;
        for (const xx of [x, x - w]) {
          g.fillStyle = col; g.fillRect(xx, y, len, ph);
          g.strokeStyle = `rgba(90,50,18,${0.08 + rnd() * 0.1})`; g.lineWidth = 1.2;
          for (let k = 0; k < 7; k++) { const yy = y + 3 + rnd() * (ph - 6); g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + len * .3, yy + (rnd() - .5) * 7, xx + len * .6, yy + (rnd() - .5) * 7, xx + len, yy + (rnd() - .5) * 5); g.stroke(); }
          g.fillStyle = 'rgba(60,32,10,.5)'; g.fillRect(xx, y, 2, ph);
        }
        x = (x + len) % w; covered += len;
      }
      g.fillStyle = 'rgba(60,32,10,.45)'; g.fillRect(0, y, w, 2);
    }
  });
  texParquet.repeat.set(0.5, 0.5);
  const texZellige = canvasTex(512, 512, (g, w, h) => {           // 0.6 m: glazed blue 30 × 7.5 cm tiles, stack bond
    g.fillStyle = '#dde2e2'; g.fillRect(0, 0, w, h);
    const tw = w / 2, th = h / 8;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) {
      const x = c * tw, y = r * th, L = 40 + rnd() * 16, gr = g.createLinearGradient(x, y, x + tw, y + th);
      gr.addColorStop(0, `hsl(${201 + rnd() * 8},${26 + rnd() * 12}%,${L}%)`); gr.addColorStop(1, `hsl(${204 + rnd() * 8},${28 + rnd() * 10}%,${L - 5 - rnd() * 7}%)`);
      g.fillStyle = gr; g.fillRect(x + 3, y + 3, tw - 6, th - 6);
      for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.22})`; g.fillRect(x + 8 + rnd() * tw * 0.6, y + 7 + rnd() * (th - 18), 10 + rnd() * 50, 3); }
    }
  });
  const texStone = canvasTex(256, 256, (g, w, h) => {             // 1.2 m: two 60 × 120 cm beige stone-look tiles
    g.fillStyle = '#b4ada4'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 2; c++) {
      const x = c * w / 2; g.fillStyle = `hsl(${36 + rnd() * 6},${9 + rnd() * 4}%,${79 + rnd() * 3}%)`; g.fillRect(x + 1.2, 1.2, w / 2 - 2.4, h - 2.4);
      for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(${120 + rnd() * 60},${110 + rnd() * 50},${100 + rnd() * 40},${0.1 + rnd() * 0.15})`; g.fillRect(x + 2 + rnd() * (w / 2 - 4), 2 + rnd() * (h - 4), 1.5, 1.5); }
    }
  });
  const texMarble = canvasTex(512, 512, (g, w, h) => {            // "rouge" Louis-Philippe marble
    g.fillStyle = '#8f5c49'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++) {
      g.fillStyle = rnd() < .55 ? `rgba(${105 + rnd() * 60},${45 + rnd() * 30},${35 + rnd() * 25},.38)` : `rgba(${150 + rnd() * 50},${118 + rnd() * 40},${100 + rnd() * 30},.22)`;
      g.beginPath(); g.arc(rnd() * w, rnd() * h, 4 + rnd() * 30, 0, 7); g.fill();
    }
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(240,228,214,${0.35 + rnd() * 0.45})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 3.5, 0, 7); g.fill(); }
    g.lineWidth = 1.5;
    for (let i = 0; i < 28; i++) {
      g.strokeStyle = `rgba(238,226,214,${0.35 + rnd() * 0.4})`; g.beginPath();
      let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 90; y += (rnd() - .3) * 70; g.lineTo(x, y); }
      g.stroke();
    }
  });
  const texBoucle = canvasTex(256, 256, (g, w, h) => {            // cream bouclé
    g.fillStyle = '#e2dbcd'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 200 + rnd() * 48; g.fillStyle = `rgba(${v},${v - 8},${v - 22},.55)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 1.8, 0, 7); g.fill(); }
  });
  const texFuton = canvasTex(256, 512, (g, w, h) => {             // tufted futon top (0.9 × 1.9 m)
    g.fillStyle = '#7d9cba'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + rnd() * 40},${120 + rnd() * 40},${150 + rnd() * 40},.25)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) {
      const x = (c + 0.5 + (r % 2 ? 0.25 : -0.25)) * w / 4, y = (r + 0.5) * h / 9;
      const gr = g.createRadialGradient(x, y, 1, x, y, 20); gr.addColorStop(0, 'rgba(40,60,85,.5)'); gr.addColorStop(1, 'rgba(40,60,85,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill();
      g.fillStyle = '#4b6584'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    }
  });

  // ---------- materials ----------
  const M = {
    wall: std('#f2efe9', { roughness: .95 }), pinkAlc: std('#e6cdc7', { roughness: .95 }), pinkBed: std('#efcdbd', { roughness: .95 }),
    base: std('#d9d1c3'), floor: std('#ffffff', { map: texParquet, roughness: .45 }),
    white: std('#f7f6f2', { roughness: .3 }), gloss: std('#fbfbf9', { roughness: .12 }), white2: std('#eceae4', { roughness: .55 }),
    frameWhite: std('#f4f3ef', { roughness: .4 }), skirting: std('#f7f6f2', { roughness: .45 }), plinth: std('#d9d6cf'),
    oak: std('#c08a52', { roughness: .55 }), worktop: std('#dcc49c', { roughness: .5 }), walnut: std('#6c3a20', { roughness: .4 }), pine: std('#d9b98d', { roughness: .6 }),
    black: std('#232427', { roughness: .5 }), blackGlass: std('#121315', { roughness: .15, metalness: .2 }), granite: std('#1f2022', { roughness: .35 }),
    steel: std('#b9bdc2', { metalness: .35, roughness: .3 }), chrome: std('#d6dadd', { metalness: .3, roughness: .18 }), silver: std('#c3c5c8', { metalness: .4, roughness: .3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe3f0', transparent: true, opacity: .2, roughness: .05, depthWrite: false }),
    frosted: new THREE.MeshStandardMaterial({ color: '#f2f5f5', transparent: true, opacity: .75, roughness: .4 }),
    showerGlass: new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: .16, roughness: .05, depthWrite: false }),
    mirror: std('#d3dde2', { metalness: .2, roughness: .06, emissive: '#9fb0b8', emissiveIntensity: .25 }),
    gold: std('#d9ab45', { metalness: .55, roughness: .3, emissive: '#3b2a06', emissiveIntensity: .35 }), marble: std('#ffffff', { map: texMarble, roughness: .3 }),
    plaster: std('#ece6dc', { roughness: .9 }), insert: std('#1b1a19', { roughness: .6 }),
    sage: std('#6e8566', { roughness: .85 }), navy: std('#2b3245', { roughness: .45 }), navyIn: std('#232939', { roughness: .5 }),
    boucle: std('#ffffff', { map: texBoucle, roughness: 1 }), duvet: std('#a9aaa8', { roughness: .95 }),
    futonSide: std('#7393b2', { roughness: .95 }), futonTop: std('#ffffff', { map: texFuton, roughness: .95 }),
    pouf: std('#8e9a76', { roughness: .95 }), bordeaux: std('#5c1f27', { roughness: .45 }), radWhite: std('#f4f4f2', { roughness: .4 }),
    towel: std('#6c6e72', { roughness: 1 }), cobalt: new THREE.MeshStandardMaterial({ color: '#2340b8', transparent: true, opacity: .8, roughness: .1 }),
    led: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.2 }),
  };
  const bookCols = ['#7a2433', '#2f3b5a', '#d9d1bd', '#3f5a3c', '#c9a24a', '#e8e2d2'].map((c) => std(c, { roughness: .9 }));
  const stoneTiles = (w, h) => tiled(texStone, w, h, 1.2, { roughness: .3 });

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
    Sland = extGroup('S', 1.6), Sbath = extGroup('S', 0), Sbed = extGroup('S', 1.6), E = extGroup('E', LX);
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
  function makeWindow({ u0, u1, v0, v1, frame, leaves = 2, rows = 1, glass = M.glass }) {
    const g = new THREE.Group(), d = 0.04, fw = 0.055, lw = 0.05, mw = 0.02;
    LB(u0, v0, -d, u0 + fw, v1, d, frame, g); LB(u1 - fw, v0, -d, u1, v1, d, frame, g);
    LB(u0, v1 - fw, -d, u1, v1, d, frame, g); LB(u0, v0, -d, u1, v0 + fw, d, frame, g);
    const iu0 = u0 + fw, iu1 = u1 - fw, iv1 = v1 - fw, gv0 = v0 + fw, lwid = (iu1 - iu0) / leaves;
    for (let i = 0; i < leaves; i++) {
      const a = iu0 + i * lwid, b = a + lwid;
      LB(a, gv0, -.025, a + lw, iv1, .025, frame, g); LB(b - lw, gv0, -.025, b, iv1, .025, frame, g);
      LB(a, iv1 - lw, -.025, b, iv1, .025, frame, g); LB(a, gv0, -.025, b, gv0 + lw * 1.6, .025, frame, g);
      const ga = a + lw, gb = b - lw, gva = gv0 + lw * 1.6, gvb = iv1 - lw;
      LB(ga, gva, -.004, gb, gvb, .004, glass, g);
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
  const footprint = [[0, D], [LX, D], [LX, 1.6], [4.4, 1.6], [4.4, 0], [2.5, 0], [2.5, 1.6], [1.5, 1.6], [1.5, 4.1], [0, 4.1]];
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
  wallX(4.4, LX + 0.2, 1.4, 1.6, 0, H, [], Sbed.g);
  wallZ(1.4, D + FT, LX, LX + 0.2, 0, H, [], E.g);
  // chimney breast, with the green shelving niche between it and the street-side corner
  solid(7.0, 0, 3.9, LX, H, 5.74, E.g); solid(7.0, 0, 6.25, LX, H, D, E.g);
  B(LX - 0.006, 0, 5.74, LX, H, 6.25, M.sage, E.g); B(7.0, 0, 5.74, LX, H, 5.746, M.sage, E.g); B(7.0, 0, 6.244, LX, H, 6.25, M.sage, E.g);
  // interior partitions
  wallZ(-0.25, 2.9, 2.5, 2.6, 0, H, [{ a0: 2.05, a1: 2.75, b0: 0, b1: 2.05 }], gInt);   // shower room, pocket door from the hall
  wallX(2.6, 4.25, 2.8, 2.9, 0, H, [], gInt);
  wallZ(-0.25, 2.9, 4.25, 4.4, 0, H, [], gInt);
  wallZ(1.6, 3.5, 4.4, 4.6, 0, H, [], gInt);                                                 // behind the oven column: side of the bed niche
  B(2.6, 2.25, 2.9, 4.4, H, 3.25, M.wall, gInt);                                              // soffit over the kitchen
  // the alcove arch: basket-handle opening with a moulded surround on the living-room side
  const SPR = 2.05, RISE = 0.45;
  solid(1.35, 0, 4.1, 1.5, H, 4.3, gInt); solid(1.35, 0, 6.2, 1.5, H, D, gInt);
  shapeYZ([[4.3, H], [4.3, SPR], ...arcB(4.3, 6.2, SPR, RISE).slice(1, -1), [6.2, SPR], [6.2, H]], 1.35, 0.15, M.wall, gInt);
  {
    const band = (o, i) => [[4.3 - o, 0], ...arcB(4.3 - o, 6.2 + o, SPR, RISE + o), [6.2 + o, 0], [6.2 + i, 0], ...arcB(6.2 + i, 4.3 - i, SPR, RISE + i), [4.3 - i, 0]];
    shapeYZ(band(0.1, 0), 1.5, 0.018, M.frameWhite, gInt); shapeYZ(band(0.035, 0), 1.518, 0.012, M.frameWhite, gInt);
  }
  // boxed riser + white cupboard high on the wall, between the hall and the arch
  B(1.5, 0, 3.93, 1.67, 1.68, 4.19, M.wall, gInt); B(1.5, 1.68, 3.82, 1.86, 2.96, 4.19, M.frameWhite, gInt);
  // paint: dusty pink alcove, peach-pink wall behind the bed
  B(0, 0, 4.1, 0.005, H, D, M.pinkAlc, W0.g); B(0, 0, 4.1, 1.35, H, 4.105, M.pinkAlc, Salc.g);
  [[0, 0.2], [1.15, 1.35]].forEach(([a, b]) => B(a, 0, D - 0.005, b, H, D, M.pinkAlc, N.g));
  B(4.6, 0, 1.6, LX, H, 1.605, M.pinkBed, Sbed.g);
  // white skirting boards
  const skirt = (x0, z0, x1, z1, g) => B(x0, 0, z0, x1, 0.1, z1, M.skirting, g);
  skirt(1.5, D - 0.015, 2.6, D, N.g); skirt(3.7, D - 0.015, 5.65, D, N.g); skirt(6.75, D - 0.015, 7.0, D, N.g);
  skirt(4.6, 1.605, 6.66, 1.62, Sbed.g); skirt(4.6, 1.6, 4.615, 3.5, gInt); skirt(1.5, 1.6, 1.515, 3.82, Wh.g);
  skirt(6.985, 3.9, 7.0, 4.12, E.g); skirt(6.985, 5.53, 7.0, 5.74, E.g); skirt(7.0, 3.885, LX, 3.9, E.g); skirt(LX - 0.015, 3.6, LX, 3.885, E.g);
  // shower-room tiles: 60 × 120 cm stone look (rise with the walls)
  B(2.6, 0, 0, 2.61, H, 2.05, stoneTiles(2.05, H), gInt); B(2.6, 2.05, 2.05, 2.61, H, 2.75, stoneTiles(.7, 1), gInt); B(2.6, 0, 2.75, 2.61, H, 2.8, stoneTiles(.05, H), gInt);
  B(4.24, 0, 0, 4.25, H, 2.8, stoneTiles(2.8, H), gInt); B(2.6, 0, 2.79, 4.25, H, 2.8, stoneTiles(1.65, H), gInt);
  B(2.6, 0, 0, 3.0, H, 0.01, stoneTiles(.4, H), Sbath.g); B(3.8, 0, 0, 4.25, H, 0.01, stoneTiles(.45, H), Sbath.g);
  B(3.0, 0, 0, 3.8, 1.0, 0.01, stoneTiles(.8, 1), Sbath.g); B(3.0, 2.4, 0, 3.8, H, 0.01, stoneTiles(.8, .6), Sbath.g);
  [N, W0, Wh, Salc, Sland, Sbath, Sbed, E].forEach((e, i) => reg(e.g, 'rise', T.walls + i * 0.13, 0.95));
  reg(gInt, 'rise', T.walls + 1.0, 1.0);

  // ---------- windows, radiators, balconies, doors ----------
  WIN.forEach((w, i) => item(N.att, 'drop', T.win + i * 0.15, (g) => {
    placeZ(makeWindow({ u0: w.a0, u1: w.a1, v0: 0.45, v1: 2.65, frame: M.frameWhite, rows: 3 }), D + 0.32, g);
    B(w.a0 + 0.1, 0.12, D + 0.13, w.a1 - 0.1, 0.52, D + 0.2, M.radWhite, g);                       // flat panel radiator
    B(w.a0 + 0.12, 0.52, D + 0.145, w.a1 - 0.12, 0.525, D + 0.19, std('#cfcfcb'), g);
    const z0 = D + FT + 0.01;                                                                       // wrought-iron balcony rail
    B(w.a0, 1.0, z0, w.a1, 1.04, z0 + 0.04, M.black, g); B(w.a0, 0.47, z0, w.a1, 0.5, z0 + 0.04, M.black, g);
    for (let x = w.a0 + 0.04; x < w.a1; x += 0.07) B(x - 0.007, 0.5, z0 + 0.01, x + 0.007, 1.0, z0 + 0.03, M.black, g);
    const mid = (w.a0 + w.a1) / 2;
    [mid - 0.25, mid, mid + 0.25].forEach((x) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.007, 6, 24), M.black); t.position.copy(P(x, 0.75, z0 + 0.02)); g.add(t); });
  }, 0.75));
  item(Sbath.att, 'drop', T.win + 0.45, (g) => placeZ(makeWindow({ u0: 3.0, u1: 3.8, v0: 1.0, v1: 2.4, frame: M.frameWhite, rows: 3, glass: M.frosted }), -0.12, g), 0.75);
  item(Sland.att, 'rise', T.win + 0.55, (g) => {                                                    // bordeaux front door
    B(1.6, 0.01, 1.44, 2.45, 2.08, 1.5, M.bordeaux, g); B(1.6, 0.01, 1.5, 2.45, 2.08, 1.56, M.white, g);
    B(2.33, 0.95, 1.56, 2.4, 1.15, 1.6, M.steel, g); B(2.355, 0.05, 1.56, 2.375, 2.0, 1.58, M.steel, g);
  }, 0.7);

  // ---------- kitchen (back to the shower room, facing the street) ----------
  item(gItems, 'rise', T.kit, (g) => {
    B(2.6, 0, 2.9, 3.8, 0.86, 3.46, M.white2, g); B(2.62, 0, 3.4, 3.8, 0.1, 3.445, M.plinth, g);
    [[2.61, 3.19], [3.21, 3.79]].forEach(([a, b]) => { B(a, 0.11, 3.46, b, 0.85, 3.48, M.gloss, g); B(a + 0.035, 0.42, 3.48, a + 0.049, 0.78, 3.51, M.steel, g); });
  }, 0.6);
  item(gItems, 'rise', T.kit + 0.15, (g) => {                                                       // oven column
    B(3.8, 0, 2.9, 4.4, 2.25, 3.48, M.white, g);
    B(3.81, 0.1, 3.48, 4.39, 0.7, 3.5, M.gloss, g); B(4.335, 0.33, 3.5, 4.349, 0.65, 3.53, M.steel, g);
    B(3.82, 0.72, 3.48, 4.38, 1.31, 3.505, M.steel, g); B(3.85, 0.75, 3.505, 4.35, 1.16, 3.51, M.blackGlass, g);   // oven
    B(3.87, 1.13, 3.51, 4.33, 1.145, 3.54, M.steel, g); B(4.0, 1.2, 3.505, 4.2, 1.27, 3.508, std('#0d0e10'), g);
    [3.91, 4.29].forEach((x) => sph(0.02, x, 1.235, 3.51, M.chrome, g, 1, 1, 0.6));
    B(3.82, 1.34, 3.48, 4.38, 1.73, 3.505, M.steel, g); B(3.85, 1.37, 3.505, 4.19, 1.7, 3.51, M.blackGlass, g);   // microwave
    B(4.21, 1.38, 3.505, 4.36, 1.69, 3.508, std('#a3a7ab', { metalness: .3, roughness: .35 }), g); sph(0.024, 4.285, 1.46, 3.51, M.chrome, g, 1, 1, 0.6);
    B(3.81, 1.76, 3.48, 4.39, 2.24, 3.5, M.gloss, g); B(3.97, 2.14, 3.5, 4.23, 2.154, 3.53, M.steel, g);
  }, 0.7);
  item(gItems, 'drop', T.kit + 0.3, (g) => {
    B(2.6, 0.86, 2.9, 3.8, 0.9, 3.52, M.worktop, g);
    B(3.2, 0.9, 2.98, 3.74, 0.905, 3.46, M.granite, g); B(3.25, 0.84, 3.03, 3.69, 0.906, 3.41, std('#0c0d0e'), g);   // black granite sink
    cyl(0.022, 0.022, 0.05, 3.47, 0.9, 2.96, M.chrome, g); cyl(0.012, 0.012, 0.31, 3.47, 0.95, 2.96, M.chrome, g);  // gooseneck mixer
    const gn = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 24, Math.PI), M.chrome); gn.rotation.y = Math.PI / 2; gn.position.copy(P(3.47, 1.26, 3.05)); g.add(gn);
    cyl(0.012, 0.012, 0.08, 3.47, 1.18, 3.14, M.chrome, g); rod([3.47, 1.0, 2.96], [3.56, 1.0, 2.96], 0.007, 0.007, M.chrome, g);
    B(2.68, 0.9, 3.0, 3.18, 0.905, 3.45, M.blackGlass, g);                                           // induction hob
    [[2.8, 3.22], [3.05, 3.22]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.003, 4, 32), std('#3a3c40')); r.rotation.x = -Math.PI / 2; r.position.copy(P(x, 0.906, z)); g.add(r); });
  }, 0.6);
  item(gItems, 'rise', T.kit + 0.4, (g) => {                                                        // blue zellige splashback
    B(2.6, 0.9, 2.9, 3.8, 1.5, 2.91, tiled(texZellige, 1.2, 0.6, 0.6, { roughness: .12 }), g);
    B(3.6, 1.06, 2.91, 3.74, 1.13, 2.925, M.white, g);
  }, 0.5);
  item(gItems, 'drop', T.kit + 0.5, (g) => {
    B(2.6, 1.5, 2.9, 3.8, 2.25, 3.24, M.white, g);
    [[2.61, 3.19], [3.21, 3.79]].forEach(([a, b]) => { B(a, 1.51, 3.24, b, 2.24, 3.26, M.gloss, g); B(b - 0.05, 1.55, 3.26, b - 0.036, 1.82, 3.29, M.steel, g); });
    B(2.64, 1.44, 2.92, 3.16, 1.5, 3.24, M.steel, g); B(2.64, 1.43, 3.24, 3.16, 1.5, 3.28, M.chrome, g);    // slim pull-out hood
  }, 0.6);

  // ---------- shower room ----------
  item(gItems, 'grow', T.bath - 0.1, (g) => {
    const t = texStone.clone(); t.needsUpdate = true; t.repeat.set(1.65 / 1.2, 2.8 / 1.2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.8), std('#ffffff', { map: t, roughness: .35 }));
    fl.rotation.x = -Math.PI / 2; fl.position.copy(P(3.425, 0.004, 1.4)); g.add(fl);
  }, 0.5);
  item(gItems, 'rise', T.bath, (g) => { B(2.61, 0, 0.01, 4.24, 0.03, 0.99, stoneTiles(1.6, 1), g); B(3.35, 0.03, 0.42, 3.55, 0.032, 0.46, M.steel, g); }, 0.4);
  item(gItems, 'rise', T.bath + 0.12, (g) => {
    B(2.62, 0.03, 0.985, 3.5, 1.97, 0.993, M.showerGlass, g); B(3.35, 0.03, 0.966, 4.23, 1.97, 0.974, M.showerGlass, g);  // sliding glass doors
    B(2.61, 1.97, 0.955, 4.24, 2.0, 1.0, M.chrome, g); B(3.37, 0.9, 0.95, 3.385, 1.3, 0.962, M.chrome, g);
    B(4.18, 1.04, 0.38, 4.24, 1.1, 0.76, M.chrome, g);                                                // thermostatic bar
    cyl(0.012, 0.012, 1.18, 4.205, 1.1, 0.57, M.chrome, g); rod([4.205, 2.27, 0.57], [3.97, 2.27, 0.5], 0.01, 0.01, M.chrome, g);
    B(3.83, 2.235, 0.37, 4.08, 2.25, 0.63, M.chrome, g);                                              // square rain head
    B(4.16, 1.55, 0.56, 4.2, 1.8, 0.6, M.chrome, g);                                                  // hand shower
  }, 0.6);
  item(gItems, 'pop', T.bath + 0.3, (g) => {
    B(4.06, 0.38, 1.22, 4.24, 0.8, 1.68, M.white, g); B(4.07, 0.8, 1.24, 4.23, 0.82, 1.66, M.white, g); // cistern
    const bowl = cyl(0.17, 0.13, 0.4, 3.88, 0, 1.45, M.white, g); bowl.scale.x = 1.22;
    const seat = cyl(0.19, 0.19, 0.03, 3.88, 0.4, 1.45, M.white, g); seat.scale.x = 1.2;
    cyl(0.05, 0.05, 0.1, 4.2, 0.62, 1.8, M.white, g).rotation.z = Math.PI / 2;                        // toilet roll
  }, 0.55);
  item(gItems, 'drop', T.bath + 0.42, (g) => {                                                      // navy shaker vanity
    B(3.78, 0.3, 1.85, 4.24, 0.82, 2.75, M.navy, g);
    [[0.32, 0.56], [0.58, 0.8]].forEach(([y0, y1]) => {
      B(3.77, y0, 1.87, 3.78, y1, 2.73, M.navy, g); B(3.766, y0 + 0.035, 1.91, 3.771, y1 - 0.035, 2.69, M.navyIn, g);
      sph(0.016, 3.76, (y0 + y1) / 2, 2.3, M.black, g);
    });
    B(3.74, 0.82, 1.83, 4.24, 0.86, 2.77, M.white, g); B(4.15, 0.86, 1.83, 4.24, 0.9, 2.77, M.white, g);   // ceramic top + back lip
    B(3.84, 0.857, 2.0, 4.08, 0.862, 2.44, std('#e8ebeb', { roughness: .2 }), g);
    cyl(0.016, 0.016, 0.16, 4.12, 0.86, 2.22, M.black, g); rod([4.12, 1.0, 2.22], [4.04, 0.98, 2.22], 0.011, 0.011, M.black, g);
    cyl(0.03, 0.028, 0.1, 4.16, 0.86, 2.6, M.black, g);
    B(4.13, 1.06, 1.83, 4.24, 1.1, 2.77, stoneTiles(.9, .2), g);                                      // tiled ledge
    B(4.225, 1.18, 1.92, 4.24, 1.86, 2.5, M.mirror, g); B(4.22, 1.74, 2.0, 4.225, 1.77, 2.42, M.led, g); // LED mirror
  }, 0.6);
  item(gItems, 'drop', T.bath + 0.55, (g) => {
    [2.88, 3.28].forEach((x) => B(x, 0.62, 2.735, x + 0.03, 1.46, 2.775, M.radWhite, g));            // towel radiator
    for (let y = 0.66; y < 1.46; y += 0.07) B(2.88, y, 2.745, 3.31, y + 0.02, 2.765, M.radWhite, g);
    B(2.97, 0.95, 2.7, 3.21, 1.44, 2.735, M.towel, g);
    B(3.66, 1.52, 2.52, 4.2, 2.45, 2.79, M.gloss, g); B(3.655, 1.56, 2.515, 4.205, 1.575, 2.795, std('#55585c'), g);  // water heater
    B(3.82, 1.5, 2.515, 4.05, 1.52, 2.53, std('#2a2b2e'), g);
    B(2.485, 0, 1.98, 2.5, 2.12, 2.05, M.frameWhite, g); B(2.485, 0, 2.75, 2.5, 2.12, 2.82, M.frameWhite, g); B(2.485, 2.05, 1.98, 2.5, 2.12, 2.82, M.frameWhite, g);
    B(2.535, 0.01, 2.05, 2.565, 2.03, 2.38, M.white, g);                                              // pocket door, half open
  }, 0.6);

  // ---------- fireplace, gilt mirror, green niche ----------
  const FZ0 = 4.25, FZ1 = 5.4, FZC = (FZ0 + FZ1) / 2;
  item(E.att, 'rise', T.fire, (g) => {
    B(6.6, 0, 4.12, 7.0, 0.025, 5.53, M.marble, g);                                                  // hearth slab
    B(6.8, 0, FZ0 + 0.04, 7.0, 0.88, FZ0 + 0.22, M.marble, g); B(6.8, 0, FZ1 - 0.22, 7.0, 0.88, FZ1 - 0.04, M.marble, g);
    B(6.8, 0.74, FZ0 + 0.22, 7.0, 0.98, FZ1 - 0.22, M.marble, g);
    B(6.76, 0.98, FZ0, 7.0, 1.04, FZ1, M.marble, g); B(6.752, 0.99, FZ0 + 0.01, 6.76, 1.03, FZ1 - 0.01, M.marble, g);
    [FZ0 + 0.04, FZ1 - 0.22].forEach((za) => extrudeXY([[6.8, 0.5], [6.8, 0.98], [6.75, 0.98], [6.752, 0.93], [6.763, 0.86], [6.778, 0.76], [6.79, 0.64]], za, 0.18, M.marble, g));
    B(6.86, 0, FZ0 + 0.22, 7.0, 0.74, FZ0 + 0.3, M.plaster, g); B(6.86, 0, FZ1 - 0.3, 7.0, 0.74, FZ1 - 0.22, M.plaster, g); B(6.86, 0.66, FZ0 + 0.3, 7.0, 0.74, FZ1 - 0.3, M.plaster, g);
    B(6.94, 0.025, FZ0 + 0.3, 7.0, 0.66, FZ1 - 0.3, M.insert, g);                                     // cast-iron curtain
    for (let y = 0.2; y < 0.64; y += 0.15) B(6.935, y, FZ0 + 0.31, 6.94, y + 0.012, FZ1 - 0.31, std('#2e2c2a'), g);
    sph(0.045, 6.937, 0.2, FZC, std('#070707'), g, 0.15, 1, 1);
    B(6.82, 1.04, FZC - 0.22, 6.96, 1.065, FZC + 0.1, std('#5f6872'), g); B(6.86, 1.04, FZC + 0.28, 6.9, 1.055, FZC + 0.42, M.black, g);  // book + remote
  }, 0.7);
  item(E.att, 'drop', T.fire + 0.25, (g) => {                                                       // gilt arched mirror with crest
    const hw = 0.43, hs = 0.92, fw = 0.06;
    const arc = (u0, u1, vs, r, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI * i / n; return [u0 < u1 ? -Math.cos(a) * r : Math.cos(a) * r, vs + Math.sin(a) * r]; });   // true semicircle
    const outer = [[-hw, 0], [hw, 0], [hw, hs], ...arc(hw, -hw, hs, hw).slice(1, -1), [-hw, hs]];
    const inner = [[-hw + fw, fw], [hw - fw, fw], [hw - fw, hs], ...arc(hw - fw, -hw + fw, hs, hw - fw).slice(1, -1), [-hw + fw, hs]];
    const bead = [[-hw + fw + 0.015, fw + 0.015], [hw - fw - 0.015, fw + 0.015], [hw - fw - 0.015, hs], ...arc(hw - fw - 0.015, -hw + fw + 0.015, hs, hw - fw - 0.015).slice(1, -1), [-hw + fw + 0.015, hs]];
    const crest = [...arc(-0.2, 0.2, hs + hw - 0.07, 0.19)];
    const mk = (pts, x0, d, m, holes = []) => {
      const s = toShape(pts); holes.forEach((h) => s.holes.push(toPath(h)));
      const me = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 24 }), m);
      me.rotation.y = Math.PI / 2; me.position.copy(P(x0, 1.15, FZC)); g.add(me);
    };
    mk(outer, 6.955, 0.045, M.gold, [inner]); mk(inner, 6.985, 0.012, M.gold, [bead]); mk(inner, 6.99, 0.008, M.mirror);
    mk(crest, 6.96, 0.04, M.gold); [-0.25, 0.25].forEach((u) => mk(circlePts(u, hs + hw - 0.12, 0.045), 6.962, 0.035, M.gold));
  }, 0.7);
  item(E.att, 'rise', T.fire + 0.4, (g) => {                                                        // oak shelves in the sage niche
    const z0 = 5.75, z1 = 6.24, zc = (z0 + z1) / 2;
    [0.44, 0.88, 1.33, 1.78, 2.25].forEach((y, i) => {
      const t = y + 0.028; B(7.0, y, z0, LX - 0.006, t, z1, M.oak, g);
      if (i === 4) { B(7.17, t, z0 + 0.08, 7.28, t + 0.32, z1 - 0.1, M.white, g); B(7.165, t + 0.07, z0 + 0.14, 7.17, t + 0.25, z1 - 0.16, std('#86a7bd'), g); }
      if (i === 3) {
        [0, 1, 2, 3].forEach((k) => B(7.08, t, z0 + 0.04 + k * 0.035, 7.27, t + 0.27 - k * 0.02, z0 + 0.07 + k * 0.035, bookCols[k], g));
        B(7.2, t, zc - 0.02, 7.26, t + 0.3, z1 - 0.06, std('#d8d3c6'), g);
      }
      if (i === 2) { cyl(0.055, 0.045, 0.11, 7.15, t, zc, M.white, g); sph(0.06, 7.15, t + 0.15, zc, std('#5f8a4c'), g, 1, 0.7, 1); }
      if (i === 1) { B(7.2, t, z0 + 0.1, 7.245, t + 0.3, z1 - 0.1, M.black, g); B(7.195, t + 0.04, z0 + 0.14, 7.2, t + 0.26, z1 - 0.14, M.white, g); B(7.194, t + 0.09, z0 + 0.19, 7.195, t + 0.21, z1 - 0.19, std('#6f8aa0'), g); }
      if (i === 0) cyl(0.035, 0.035, 0.08, 7.15, t, zc, std('#efe9df'), g);
    });
  }, 0.8);

  // ---------- furniture ----------
  const F = T.furn;
  item(gItems, 'drop', F, (g) => {                                                                  // upholstered bed, bouclé headboard
    extrudeXY(rrPts(4.72, 0, 6.28, 1.06, 0.2, true, false), 1.605, 0.1, M.boucle, g);
    RB(4.78, 0.09, 1.7, 6.22, 0.35, 3.74, 0.03, M.boucle, g);
    [[4.82, 1.76], [6.14, 1.76], [4.82, 3.66], [6.14, 3.66]].forEach(([x, z]) => B(x, 0, z, x + 0.04, 0.09, z + 0.04, M.black, g));
    RB(4.8, 0.35, 1.72, 6.2, 0.53, 3.72, 0.04, M.white2, g);
    RB(4.74, 0.3, 2.02, 6.26, 0.58, 3.8, 0.06, M.duvet, g);                                         // duvet falling over the sides
    RB(4.84, 0.5, 1.72, 6.16, 0.68, 2.16, 0.08, M.duvet, g);                                        // pillows under the duvet
  }, 0.75);
  item(E.att, 'rise', F + 0.2, (g) => {                                                             // wardrobe, two sliding shaker doors
    const z0 = 1.62, z1 = 3.6, x0 = 6.66;
    B(x0, 0, z0, LX - 0.005, 2.36, z1, M.white, g); B(x0 - 0.06, 2.3, z0, x0, 2.36, z1, M.silver, g);
    const door = (x, za, zb) => {
      B(x - 0.02, 0.02, za, x, 2.3, zb, M.white, g);
      B(x - 0.032, 0.02, za, x - 0.02, 2.3, za + 0.09, M.white, g); B(x - 0.032, 0.02, zb - 0.09, x - 0.02, 2.3, zb, M.white, g);
      [[0.02, 0.13], [1.0, 1.12], [2.19, 2.3]].forEach(([y0, y1]) => B(x - 0.032, y0, za + 0.09, x - 0.02, y1, zb - 0.09, M.white, g));
      B(x - 0.036, 0.02, za, x - 0.02, 2.3, za + 0.014, M.silver, g); B(x - 0.036, 0.02, zb - 0.014, x - 0.02, 2.3, zb, M.silver, g);
    };
    door(x0 - 0.04, z0 + 0.01, z0 + 1.01); door(x0, z0 + 0.97, z1 - 0.01);
  }, 0.8);
  item(gItems, 'drop', F + 0.4, (g) => {                                                            // daybed: pine frame, tufted futon
    B(0.06, 0.2, 4.33, 0.98, 0.27, 6.17, M.pine, g);
    [[0.12, 4.42, -1, -1], [0.92, 4.42, 1, -1], [0.12, 6.08, -1, 1], [0.92, 6.08, 1, 1]].forEach(([x, z, sx, sz]) => rod([x + sx * 0.03, 0, z + sz * 0.05], [x, 0.2, z], 0.016, 0.026, M.pine, g));
    RB(0.05, 0.27, 4.32, 0.99, 0.42, 6.18, 0.045, [M.futonSide, M.futonSide, M.futonTop, M.futonSide, M.futonSide, M.futonSide], g);
  }, 0.7);
  [ // velvet cushions: [back row?, z0, z1, height, colour]
    [true, 4.42, 4.87, 0.45, '#2f4462'], [false, 4.72, 5.22, 0.3, '#2c7286'], [true, 5.12, 5.52, 0.4, '#c49b33'],
    [false, 5.32, 5.82, 0.3, '#a9bccb'], [true, 5.72, 6.15, 0.43, '#8a3343'],
  ].forEach(([back, z0, z1, h, col], i) => item(gItems, 'drop', F + 0.7 + i * 0.09, (g) => {
    const x0 = back ? 0.07 : 0.22, m = RB(x0, 0.42, z0, x0 + 0.14, 0.42 + h, z1, 0.05, std(col, { roughness: 1 }), g);
    m.rotation.z = back ? 0.16 : 0.24;
  }, 0.55));
  item(gItems, 'drop', F + 1.25, (g) => {                                                           // walnut tray coffee table
    const out = rrPts(1.18, 4.78, 1.6, 5.82, 0.12), inn = rrPts(1.205, 4.805, 1.575, 5.795, 0.1);
    slabXZ(out, 0.41, 0.02, M.walnut, g); slabXZ(out, 0.43, 0.022, M.walnut, g, [inn]);
    [[1.25, 4.92, -1, -1], [1.53, 4.92, 1, -1], [1.25, 5.68, -1, 1], [1.53, 5.68, 1, 1]].forEach(([x, z, sx, sz]) => rod([x + sx * 0.025, 0, z + sz * 0.06], [x, 0.41, z], 0.011, 0.02, M.walnut, g));
  }, 0.6);
  item(gItems, 'pop', F + 1.4, (g) => { cyl(0.19, 0.19, 0.44, 2.03, 0, 5.3, M.pouf, g); cyl(0.193, 0.193, 0.012, 2.03, 0.36, 5.3, std('#7c8866', { roughness: 1 }), g); }, 0.55);
  item(gItems, 'drop', F + 1.5, (g) => {                                                            // walnut table on hairpin legs
    B(3.95, 0.72, 5.58, 4.75, 0.75, 6.2, M.walnut, g);
    [[4.02, 5.65, 1, 1], [4.68, 5.65, -1, 1], [4.02, 6.13, 1, -1], [4.68, 6.13, -1, -1]].forEach(([x, z, sx, sz]) => {
      rod([x, 0, z], [x + sx * 0.07, 0.72, z], 0.006, 0.006, M.black, g); rod([x, 0, z], [x, 0.72, z + sz * 0.07], 0.006, 0.006, M.black, g);
    });
    [3.99, 4.41].forEach((x) => { B(x, 0.75, 5.7, x + 0.3, 0.753, 6.08, std('#a2a6aa', { roughness: 1 }), g); cyl(0.115, 0.095, 0.022, x + 0.15, 0.753, 5.88, M.white, g); });
    cyl(0.045, 0.04, 0.17, 4.36, 0.75, 6.1, M.cobalt, g);
    [[4.28, 6.13], [4.45, 6.08]].forEach(([x, z]) => cyl(0.03, 0.026, 0.1, x, 0.75, z, M.glass, g));
  }, 0.6);
  function chair(x, z, ry, start) {                                                                 // folding walnut chair
    item(gItems, 'drop', start, (g) => {
      const c = new THREE.Group(), w = M.walnut;
      [-0.12, 0, 0.12].forEach((sz) => LB(-0.19, 0.44, sz - 0.055, 0.19, 0.465, sz + 0.055, w, c));
      LB(-0.2, 0.66, 0.165, 0.2, 0.74, 0.19, w, c); LB(-0.2, 0.8, 0.17, 0.2, 0.88, 0.195, w, c);
      [-0.21, 0.21].forEach((sx) => { lrod([sx, 0, 0.25], [sx, 0.9, 0.17], 0.016, w, c); lrod([sx * 0.9, 0, -0.22], [sx * 0.9, 0.46, 0.14], 0.014, w, c); });
      lrod([-0.19, 0.12, -0.17], [0.19, 0.12, -0.17], 0.01, w, c);
      c.rotation.y = ry; c.position.copy(P(x, 0, z)); g.add(c);
    }, 0.55);
  }
  chair(3.72, 5.89, -Math.PI / 2, F + 1.65); chair(4.98, 5.89, Math.PI / 2, F + 1.75);
  item(N.att, 'pop', T.win + 0.75, (g) => {                                                         // wall-mounted TV
    B(4.45, 1.45, D - 0.06, 4.86, 1.7, D - 0.005, std('#3a3b3e'), g);
    B(4.165, 1.28, D - 0.1, 5.145, 1.855, D - 0.06, M.silver, g); B(4.18, 1.295, D - 0.106, 5.13, 1.84, D - 0.1, M.blackGlass, g);
  }, 0.55);

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
    ['Living room', 'Séjour', P(3.4, 1.0, 4.9)], ['Reading alcove', 'Alcôve', P(0.6, 1.05, 5.2)],
    ['Kitchen', 'Cuisine', P(3.2, 1.35, 3.25)], ['Sleeping area', 'Coin nuit', P(5.5, 1.1, 2.7)],
    ['Shower room', "Salle d'eau", P(3.4, 1.25, 1.3)], ['Entrance', 'Entrée', P(2.0, 0.6, 2.2), true],
    ['Marble fireplace', 'Cheminée', P(6.8, 1.45, 4.83)],
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
    window.__plan3dCam = (p, q) => { swing = null; tween = null; controls.autoRotate = false; controls.minDistance = 0.1; camera.position.copy(P(...p)); controls.target.copy(P(...q)); camera.lookAt(controls.target); controls.update(); };
  }
  window.__plan3dReady = true;
}
