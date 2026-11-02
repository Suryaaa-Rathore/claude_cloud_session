// A Haryana village as a freshly painted model: lanes, havelis with rooftops, fields, pond, peepal tree, temple.
import * as THREE from 'three';
import { GB } from './geo.js';
import { buildingMaterial, U } from './city.js';
import { mulberry } from '/core/lib.js';

export { U };
export const LANE_Z = 0, LANE_W = 7, CROSS_X = 0, CROSS_W = 6;
export const HER = { x0: -36, x1: -22, z0: -19, z1: -4.5, floors: 2 };       // her haveli (north of the main lane)
export const HIS = { x0: 30, x1: 43, z0: 4.5, z1: 17, floors: 2 };           // his house (south of the lane)
export const HER_ROOF = new THREE.Vector3((HER.x0 + HER.x1) / 2, HER.floors * 3.3, (HER.z0 + HER.z1) / 2);
export const HIS_ROOF = new THREE.Vector3((HIS.x0 + HIS.x1) / 2, HIS.floors * 3.3, (HIS.z0 + HIS.z1) / 2);
export const PEEPAL = { x: 16, z: 36 };
export const POND = { x: 78, z: -46, rx: 24, rz: 14 };
export const TEMPLE = { x: -74, z: 40 };
export const FIELD_TITLE = { x: -20, z: 178, w: 150, h: 40 };   // title letters ploughed into the mustard field
export const STOREY = 3.3;

const WALLS = ['#f1ece0', '#e9dcc4', '#e3c79a', '#f0b98a', '#e9a3a6', '#9fd3cb', '#d9e3a0', '#a9c8ea', '#f3e3a3', '#efd0c0', '#f4f1ea', '#dcc7a6'];
const DOORS = ['#2aa198', '#1f6fb2', '#d7263d', '#f49d37', '#3c8d2f', '#7a3e9d'];
const ROOF = '#d6c8b0';

export function buildVillage(scene) {
  const R = mulberry(20261102);
  const gb = new GB(), gbB = new GB();   // gb: plain (ground, fields), gbB: buildings with facade shader
  const plots = [];
  // —— ground ——
  gb.flat(-1500, 1500, -1500, 1500, -0.05, '#86ad44');
  gb.flat(-125, 125, -95, 95, 0, '#d2b48a');                       // packed earth of the village
  gb.flat(-400, 400, LANE_Z - LANE_W / 2, LANE_Z + LANE_W / 2, .03, '#8f5f4a');    // brick lane (main road through the village)
  gb.flat(CROSS_X - CROSS_W / 2, CROSS_X + CROSS_W / 2, -95, 300, .045, '#9a7560'); // cross lane, continues south as a field track
  for (let x = -400; x < 400; x += 2.2) gb.flat(x, x + .12, -LANE_W / 2, LANE_W / 2, .035, '#74493a'); // brick courses
  // —— fields: a patchwork around the village ——
  const fieldCols = [['#eab51a', '#c7960f'], ['#eab51a', '#c7960f'], ['#5c9a2c', '#4a8424'], ['#7cad36', '#679a2c'], ['#9a7650', '#866443']];
  const F = [];
  for (let gx = -6; gx <= 6; gx++) for (let gz = -5; gz <= 6; gz++) {
    const x0 = gx * 70 - 35, z0 = gz * 60 - 30, x1 = x0 + 66, z1 = z0 + 56;
    if (x1 > -130 && x0 < 130 && z1 > -100 && z0 < 100) continue;   // village core
    let k = Math.floor(R() * fieldCols.length);
    if (FIELD_TITLE.z > z0 - 10 && FIELD_TITLE.z < z1 + 10 && Math.abs(gx) <= 2) k = 0;   // the title field is mustard
    F.push({ x0, z0, x1, z1, k });
    const [c0, c1] = fieldCols[k], alongX = R() > .5;
    gb.flat(x0, x1, z0, z1, .01, c0);
    const step = 2.4;
    if (alongX) for (let z = z0 + 1; z < z1 - 1; z += step) gb.flat(x0 + 1, x1 - 1, z, z + step * .45, .02, c1);
    else for (let x = x0 + 1; x < x1 - 1; x += step) gb.flat(x, x + step * .45, z0 + 1, z1 - 1, .02, c1);
    // raised bunds between fields
    gb.box(x0 - 2, x1 + 2, 0, .35, z0 - 2, z0, '#9b8a5e'); gb.box(x0 - 2, x0, 0, .35, z0, z1, '#9b8a5e');
  }
  // —— houses along the lanes ——
  function house(x0, x1, z0, z1, floors, o = {}) {
    const wall = o.wall || WALLS[Math.floor(R() * WALLS.length)], h = floors * STOREY;
    const seed = 3000 + Math.floor(R() * 900);
    const roofC = ['#d6c8b0', '#c4bcae', '#b9b2a6', '#d8cdb9', '#a9a39a', '#cfc0a2'][Math.floor(R() * 6)];
    gbB.box(x0, x1, 0, h, z0, z1, wall, roofC, { facade: true, wp: [2.6 + R() * .8, STOREY, seed] });
    // parapet around the roof
    const p = .25, ph = .9, pc = o.parapet || wall;
    gb.box(x0, x1, h, h + ph, z0, z0 + p, pc); gb.box(x0, x1, h, h + ph, z1 - p, z1, pc);
    gb.box(x0, x0 + p, h, h + ph, z0, z1, pc); gb.box(x1 - p, x1, h, h + ph, z0, z1, pc);
    // door on the lane side (+z or -z), with a lintel band
    const front = o.front ?? (z1 < 0 ? z1 : z0), dz = front === z1 ? .05 : -.05, dc = o.door || DOORS[Math.floor(R() * DOORS.length)];
    const dx = (x0 + x1) / 2 + (R() - .5) * (x1 - x0) * .3;
    gb.box(dx - .8, dx + .8, 0, 2.3, front - .02 + dz, front + .02 + dz * 3, dc);
    gb.box(x0, x1, 2.9, 3.1, front - .06 + dz, front + .06 + dz, '#b8a58a');
    // rooftop clutter: black water tank, staircase hut (mumty), charpai, clothesline
    const clean = !!o.clean;
    if (!clean && R() > .25) gb.cyl(x0 + 1.4 + R() * (x1 - x0 - 3), z0 + 1.4 + R() * (z1 - z0 - 3), .8, h, h + 1.5, '#1d1d1f', 12);
    if (!clean && R() > .4) { const mx = x1 - 3.2; gb.box(mx, mx + 2.6, h, h + 2.3, z0 + .6, z0 + 3.2, wall, ROOF); }
    if (!clean && R() > .5) { const cx = x0 + 2 + R() * (x1 - x0 - 5), cz = z0 + 2 + R() * (z1 - z0 - 4); gb.box(cx, cx + 1.9, h + .35, h + .45, cz, cz + 1, '#c9a46a'); for (const [a, b] of [[0, 0], [1.8, 0], [0, .9], [1.8, .9]]) gb.box(cx + a, cx + a + .1, h, h + .45, cz + b, cz + b + .1, '#6b4a2a'); }
    if (!clean && R() > .45) {
      const y = h + 1.6, za = z0 + 1.2 + R() * (z1 - z0 - 2.4);
      gb.box(x0 + .6, x1 - .6, y, y + .03, za, za + .03, '#555');
      for (let x = x0 + 1; x < x1 - 1.4; x += 1.2) if (R() > .3) gb.box(x, x + .8, y - 1.1 - R() * .4, y, za - .01, za + .04, ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#fff', '#7b2cbf', '#ff70a6'][Math.floor(R() * 7)]);
    }
    plots.push({ x0, x1, z0, z1, h, wall });
    return { x0, x1, z0, z1, h };
  }
  // both sides of the main lane and the cross lane, leaving gaps (gali) and the hero houses
  const rowN = [], rowS = [];
  for (let x = -120; x < 120;) {
    const w = 9 + R() * 6;
    if (x + w > HER.x0 - .5 && x < HER.x1 + .5) { x = HER.x1 + 1.5; continue; }
    if (Math.abs(x + w / 2 - CROSS_X) < w / 2 + 4) { x += w + 1; continue; }
    rowN.push([x, x + w]); x += w + (R() > .75 ? 3.5 : .3);
  }
  for (let x = -120; x < 120;) {
    const w = 9 + R() * 6;
    if (x + w > HIS.x0 - .5 && x < HIS.x1 + .5) { x = HIS.x1 + 1.5; continue; }
    if (Math.abs(x + w / 2 - CROSS_X) < w / 2 + 4) { x += w + 1; continue; }
    if (x + w > PEEPAL.x - 12 && x < PEEPAL.x + 12) { x = PEEPAL.x + 12; continue; }
    rowS.push([x, x + w]); x += w + (R() > .75 ? 3.5 : .3);
  }
  for (const [a, b] of rowN) house(a, b, -(LANE_W / 2 + 1 + 10 + R() * 4), -(LANE_W / 2 + 1), 1 + (R() > .45 ? 1 : 0));
  for (const [a, b] of rowS) house(a, b, LANE_W / 2 + 1, LANE_W / 2 + 1 + 10 + R() * 4, 1 + (R() > .5 ? 1 : 0));
  // second row behind
  for (let x = -115; x < 115; x += 13 + R() * 4) { if (R() > .2) house(x, x + 11 + R() * 2, -48 - R() * 6, -30 - R() * 3, 1 + (R() > .6 ? 1 : 0), { front: -30 }); }
  for (let x = -115; x < 115; x += 13 + R() * 4) { if (x > -90 && x < -55) continue; if (x > PEEPAL.x - 18 && x < PEEPAL.x + 14) continue; if (R() > .25) house(x, x + 11 + R() * 2, 28 + R() * 4, 44 + R() * 5, 1, { front: 28 }); }
  // the two hero houses
  house(HER.x0, HER.x1, HER.z0, HER.z1, HER.floors, { wall: '#ef9fae', door: '#1fb5a8', parapet: '#f7c6cf', clean: true });
  house(HIS.x0, HIS.x1, HIS.z0, HIS.z1, HIS.floors, { wall: '#f4f1ea', door: '#1f4fb2', parapet: '#e6e0d4', clean: true });
  // —— village clutter between the houses: haystacks, dung-cake stacks (bitora), charpais, low walls, parked tractor ——
  function free(x, z, r) {
    if (Math.abs(z - LANE_Z) < LANE_W / 2 + r + .5 || Math.abs(x - CROSS_X) < CROSS_W / 2 + r + .5) return false;
    for (const p of plots) if (x > p.x0 - r && x < p.x1 + r && z > p.z0 - r && z < p.z1 + r) return false;
    if (Math.hypot(x - PEEPAL.x, z - PEEPAL.z) < 9 + r) return false;
    if (Math.abs(x - TEMPLE.x) < 10 + r && Math.abs(z - TEMPLE.z) < 10 + r) return false;
    if (Math.hypot((x - POND.x) / (POND.rx + 4 + r), (z - POND.z) / (POND.rz + 4 + r)) < 1) return false;
    return true;
  }
  function props() {
    const P = mulberry(99);
    for (let i = 0; i < 900; i++) {
      const x = (P() - .5) * 250, z = (P() - .5) * 190, k = P();
      if (!free(x, z, 2)) continue;
      if (k < .25) {   // haystack: a round straw stack
        gb.cyl(x, z, 1.6, 0, 1.4, '#e3bd55', 10); gb.cyl(x, z, 1.15, 1.4, 2.2, '#d8ad45', 10); gb.cyl(x, z, .5, 2.2, 2.7, '#c99c3a', 8);
      } else if (k < .45) {   // bitora: dung-cake stack with a plastered top
        gb.cyl(x, z, 1.2, 0, 1.6, '#7a5634', 9); gb.cyl(x, z, .7, 1.6, 2.3, '#8a6440', 9);
      } else if (k < .55) {   // charpai
        gb.box(x, x + 1.9, .35, .45, z, z + 1, '#d9b77a'); for (const [a, b] of [[0, 0], [1.8, 0], [0, .9], [1.8, .9]]) gb.box(x + a, x + a + .1, 0, .45, z + b, z + b + .1, '#6b4a2a');
      } else if (k < .72) {   // low courtyard wall segment
        const L = 6 + P() * 10, along = P() > .5;
        if (along) gb.box(x, x + L, 0, 1.2, z, z + .3, '#cdb79a'); else gb.box(x, x + .3, 0, 1.2, z, z + L, '#cdb79a');
      } else if (k < .78) {   // tied buffalo + manger
        gb.box(x, x + 2.2, .5, 1.5, z, z + .9, '#2a2826'); gb.box(x + 2.1, x + 2.6, .8, 1.4, z + .15, z + .75, '#2a2826'); gb.box(x - 1.4, x - .2, 0, .6, z - .2, z + 1.1, '#9c8a72');
      } else if (k < .82) {   // parked tractor (simple)
        gb.box(x, x + 1, .6, 1.5, z, z + 2.4, '#d7262b'); gb.cyl(x - .1, z + .5, .7, 0, 1.4, '#141414', 10, true);
      } else if (k < .9) {   // flower pots / tulsi on a little platform
        gb.box(x, x + 1.2, 0, .8, z, z + 1.2, '#e8dccb'); gb.cyl(x + .6, z + .6, .4, .8, 1.5, '#3f8f2f', 8);
      }
    }
  }
  // —— pond (johad) ——
  gb.disc(POND.x, POND.z, POND.rx + 3, POND.rz + 3, .02, '#9c8a62');
  gb.disc(POND.x, POND.z, POND.rx, POND.rz, .06, '#3b93ad');
  gb.disc(POND.x + 4, POND.z - 2, POND.rx * .55, POND.rz * .5, .065, '#58aec4');
  // —— peepal tree platform (chabutra) ——
  gb.cyl(PEEPAL.x, PEEPAL.z, 7, 0, .9, '#e2d3b4', 28);
  gb.cyl(PEEPAL.x, PEEPAL.z, 1.3, .9, 7, '#6b5038', 12, false);
  // —— temple ——
  const T = TEMPLE;
  gb.box(T.x - 9, T.x + 9, 0, 1.4, T.z - 9, T.z + 9, '#f2eee6');
  gb.box(T.x - 4, T.x + 4, 1.4, 6.5, T.z - 4, T.z + 4, '#fbf8f2');
  gb.box(T.x - 6, T.x + 6, 1.4, 4.2, T.z + 4, T.z + 8, '#fbf8f2');            // mandap
  gb.box(T.x - 6.4, T.x + 6.4, 4.2, 4.6, T.z + 3.6, T.z + 8.4, '#f0a23a');
  gb.box(T.x - 1.2, T.x + 1.2, 1.4, 3.6, T.z + 8.02, T.z + 8.1, '#c0392b');
  // —— tubewell hut and channel ——
  gb.box(128, 134, 0, 2.8, 58, 64, '#d8d0c0', '#b8b0a0'); gb.flat(134, 260, 60, 61.4, .04, '#4aa0c0');
  props();
  const mesh = new THREE.Mesh(gb.build(), buildingMaterial());
  mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh);
  const meshB = new THREE.Mesh(gbB.build(), buildingMaterial());
  meshB.receiveShadow = true; meshB.castShadow = true; scene.add(meshB);

  // —— temple spire (shikhara) + flag ——
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.4, 8, 8), new THREE.MeshStandardMaterial({ color: '#fbf6ec', roughness: .7 }));
  spire.position.set(T.x, 6.5 + 4, T.z); spire.castShadow = true; scene.add(spire);
  const kalash = new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 8), new THREE.MeshStandardMaterial({ color: '#e0a526', metalness: .6, roughness: .3 }));
  kalash.position.set(T.x, 14.9, T.z); scene.add(kalash);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 5, 6), new THREE.MeshStandardMaterial({ color: '#6b4a2a' }));
  pole.position.set(T.x, 17.2, T.z); scene.add(pole);
  const flagGeo = new THREE.PlaneGeometry(3.2, 1.8, 12, 4); flagGeo.translate(1.6, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#ff8a1c', side: THREE.DoubleSide, roughness: .8 }));
  flag.position.set(T.x, 18.8, T.z); scene.add(flag);
  const flagBase = flagGeo.attributes.position.array.slice();
  function waveFlag(t) {
    const p = flagGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = flagBase[i]; p[i + 2] = Math.sin(x * 2.2 - t * 7) * .22 * (x / 3.2); p[i + 1] = flagBase[i + 1] * (1 - .35 * x / 3.2); }
    flagGeo.attributes.position.needsUpdate = true;
  }

  // —— trees: neem/peepal canopies as clustered spheres (instanced) ——
  const treeSpots = [[PEEPAL.x, PEEPAL.z, 1.9]];
  for (let i = 0; i < 70; i++) {
    let x, z;
    for (let k = 0; k < 20; k++) {
      x = (R() - .5) * 560; z = (R() - .5) * 480;
      const inCore = Math.abs(x) < 122 && Math.abs(z) < 92, onLane = Math.abs(z) < 8 || Math.abs(x) < 6;
      const nearPond = Math.hypot((x - POND.x) / (POND.rx + 6), (z - POND.z) / (POND.rz + 6)) < 1;
      if (!onLane && !nearPond && (!inCore || R() > .8)) break;
    }
    treeSpots.push([x, z, .6 + R() * .6]);
  }
  for (const [x, z] of [[POND.x - 28, POND.z + 6], [POND.x + 26, POND.z - 8], [POND.x - 10, POND.z - 18], [T.x + 14, T.z - 10], [T.x - 14, T.z + 12]]) treeSpots.push([x, z, 1]);
  const blobs = [], trunks = [];
  for (const [x, z, s] of treeSpots) {
    const H = 6 * s + 3; trunks.push([x, z, s, H]);
    const n = s > 1.5 ? 16 : 6;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, r = R() * 3.2 * s, y = H + R() * 3 * s;
      blobs.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r, (2.2 + R() * 1.8) * s, R()]);
    }
  }
  const blobMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ roughness: .85 }), blobs.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  blobs.forEach(([x, y, z, r, c], i) => { m4.makeScale(r, r * .82, r).setPosition(x, y, z); blobMesh.setMatrixAt(i, m4); blobMesh.setColorAt(i, col.set(c > .5 ? '#3f9a2f' : '#4fb03a').offsetHSL(0, 0, (c - .5) * .08)); });
  blobMesh.castShadow = blobMesh.receiveShadow = true; scene.add(blobMesh);
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .5, 1, 6), new THREE.MeshStandardMaterial({ color: '#6b5038' }), trunks.length);
  trunks.forEach(([x, z, s, H], i) => { m4.makeScale(s, H, s).setPosition(x, H / 2, z); trunkMesh.setMatrixAt(i, m4); });
  trunkMesh.castShadow = true; scene.add(trunkMesh);

  // —— street lamps with light pools (visible at night) ——
  const lampPos = [];
  for (let x = -110; x <= 110; x += 22) lampPos.push([x, (x / 22) % 2 ? -4.2 : 4.2]);
  for (let z = -80; z <= 80; z += 26) if (Math.abs(z) > 10) lampPos.push([3.6, z]);
  lampPos.push([PEEPAL.x - 8, PEEPAL.z - 6], [TEMPLE.x + 10, TEMPLE.z + 10]);
  const poleM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .1, 5, 5), new THREE.MeshStandardMaterial({ color: '#4a4a4a' }), lampPos.length);
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf7a', emissiveIntensity: 0 });
  const bulbM = new THREE.InstancedMesh(new THREE.SphereGeometry(.28, 8, 6), bulbMat, lampPos.length);
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,120,1)'); g.addColorStop(.5, 'rgba(255,170,90,.35)'); g.addColorStop(1, 'rgba(255,150,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const poolM = new THREE.InstancedMesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), poolMat, lampPos.length);
  lampPos.forEach(([x, z], i) => { m4.makeTranslation(x, 2.5, z); poleM.setMatrixAt(i, m4); m4.makeTranslation(x, 5.1, z); bulbM.setMatrixAt(i, m4); m4.makeTranslation(x, .12, z); poolM.setMatrixAt(i, m4); });
  poleM.castShadow = true; scene.add(poleM, bulbM, poolM);
  function lamps(night) { bulbMat.emissiveIntensity = night * 3; poolMat.opacity = night * .28; }

  // —— title ploughed into the mustard field: a canvas texture revealed letter by letter ——
  const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 560; const tx = tc.getContext('2d');
  const titleTex = new THREE.CanvasTexture(tc); titleTex.anisotropy = 4;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_TITLE.w, FIELD_TITLE.w * 560 / 2048).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: titleTex, transparent: true, depthWrite: false, roughness: 1 }));
  title.position.set(FIELD_TITLE.x, .06, FIELD_TITLE.z); title.receiveShadow = true; scene.add(title);
  let lastTitle = -1;
  function drawTitle(n, sub = 0) {
    const key = n * 10 + Math.round(sub * 9); if (key === lastTitle) return; lastTitle = key;
    tx.clearRect(0, 0, 2048, 560);
    const s = 'DIL DE BAITHI'; tx.font = '800 300px Overpass'; tx.textBaseline = 'middle';
    let x = (2048 - tx.measureText(s).width) / 2;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], w = tx.measureText(ch).width;
      if (i < n) { tx.fillStyle = '#2a1608'; tx.fillText(ch, x + 8, 250 + 10); tx.fillStyle = '#4a2a10'; tx.fillText(ch, x, 250); }
      x += w;
    }
    if (sub > 0) { tx.globalAlpha = sub; tx.font = '700 86px Overpass'; tx.fillStyle = '#3f7d2c'; const a = 'DHANDA NYOLIWALA'; tx.fillText(a, (2048 - tx.measureText(a).width) / 2, 470); tx.globalAlpha = 1; }
    titleTex.needsUpdate = true;
  }
  drawTitle(0);
  return { mesh, meshB, plots, waveFlag, lamps, drawTitle, title, fields: F };
}
