// Tiny actors: the two heroes (articulated, sheen material, 30 % larger), villagers (model-railway capsules),
// tractor, bullock cart, Bullet motorbike, buffaloes, kites.
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { LANE_Z, POND, PEEPAL } from './village.js';

const sheen = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .62, sheen: 1, sheenRoughness: .55, sheenColor: new THREE.Color(c).offsetHSL(0, 0, .15), ...o });
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
const SKIN = '#c98b62';

function limb(r0, r1, len, mat) {   // pivot at the top
  const g = new THREE.CylinderGeometry(r0, r1, len, 10); g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}

// —— hero figure ——
export function makeHero(kind) {
  const her = kind === 'her';
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const S = 1.3;   // larger than life so they read
  const cloth = sheen(her ? '#e8336b' : '#f7f5ef'), cloth2 = sheen(her ? '#ffd23f' : '#3a4a6b'), skin = sheen(SKIN), hair = std('#1b1410', { roughness: .5 });
  const hip = new THREE.Group(); hip.position.y = .9; body.add(hip);
  // legs
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.11, 0, 0); legR.position.set(.11, 0, 0); hip.add(legL, legR);
  legL.add(limb(.075, .06, .88, cloth2)); legR.add(limb(.075, .06, .88, cloth2));
  // skirt (lehenga) or kurta hem
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(her ? .2 : .2, her ? .42 : .27, her ? .82 : .5, 16, 1, true), her ? cloth2 : cloth);
  hem.position.y = her ? -.38 : -.18; hem.castShadow = true; hem.material.side = THREE.DoubleSide; hip.add(hem);
  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.19, .42, 4, 12), cloth); torso.position.y = .36; torso.castShadow = true; hip.add(torso);
  const neck = new THREE.Group(); neck.position.y = .72; hip.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), skin); head.position.y = .15; head.castShadow = true; neck.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(.158, 16, 12, 0, Math.PI * 2, 0, Math.PI * .55), hair); hairM.position.y = .17; hairM.rotation.x = -.25; neck.add(hairM);
  if (her) {   // plait + dupatta over head and shoulder
    const plait = limb(.045, .03, .55, hair); plait.position.set(0, .12, -.12); plait.rotation.x = .25; neck.add(plait);
    const dup = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), sheen('#ff5a8a', { side: THREE.DoubleSide })); dup.position.y = .19; dup.scale.set(1, 1.05, 1.1); neck.add(dup);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(.06, .6, .3), sheen('#ff5a8a')); sash.position.set(.18, .3, 0); sash.rotation.z = .5; hip.add(sash);
  }
  // arms
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-.25, .62, 0); armR.position.set(.25, .62, 0); hip.add(armL, armR);
  const fore = (arm) => { arm.add(limb(.055, .05, .3, cloth)); const el = new THREE.Group(); el.position.y = -.3; arm.add(el); el.add(limb(.045, .04, .28, skin)); arm.userData.el = el; };
  fore(armL); fore(armR);
  // wrist thread (for the "kaale dore" close-up) — on his right wrist
  const thread = new THREE.Mesh(new THREE.TorusGeometry(.048, .012, 6, 16), std('#0a0a0a')); thread.rotation.x = Math.PI / 2; thread.position.y = -.24; thread.visible = false;
  armR.userData.el.add(thread);
  const charm = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), std('#1f6fd6', { emissive: '#0a2a66', emissiveIntensity: .4 })); charm.position.set(.05, -.24, 0); charm.visible = false; armR.userData.el.add(charm);
  root.scale.setScalar(S);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, hip, legL, legR, armL, armR, neck, thread, charm, her };
}

// pose: walk phase p (radians), 'stand' | 'walk' | 'run' | 'sit' | 'wave' | 'hold' | 'laugh' | 'arms'
export function pose(h, kind, p = 0, amt = 1) {
  const sw = kind === 'run' ? .9 : kind === 'walk' ? .5 : 0;
  h.hip.position.y = .9 + (sw ? Math.abs(Math.sin(p)) * .05 * (kind === 'run' ? 2 : 1) : 0);
  h.hip.rotation.set(0, 0, 0); h.body.position.y = 0;
  h.legL.rotation.set(Math.sin(p) * sw, 0, 0); h.legR.rotation.set(-Math.sin(p) * sw, 0, 0);
  h.armL.rotation.set(-Math.sin(p) * sw * .8, 0, .08); h.armR.rotation.set(Math.sin(p) * sw * .8, 0, -.08);
  h.armL.userData.el.rotation.set(sw ? -.4 : -.1, 0, 0); h.armR.userData.el.rotation.set(sw ? -.4 : -.1, 0, 0);
  h.neck.rotation.set(0, 0, 0);
  if (kind === 'sit') { h.hip.position.y = .5; h.legL.rotation.x = h.legR.rotation.x = -1.45; h.legL.rotation.z = .08; h.legR.rotation.z = -.08; h.armL.rotation.x = h.armR.rotation.x = -.5; }
  if (kind === 'wave') { h.armR.rotation.set(0, 0, -2.6 + Math.sin(p * 2) * .35); h.armR.userData.el.rotation.x = -.3; }
  if (kind === 'laugh') { h.hip.rotation.x = -.18 + Math.sin(p * 3) * .08; h.neck.rotation.x = -.35; h.armL.rotation.set(-.6, 0, .3); h.armR.rotation.set(-.6, 0, -.3); h.armL.userData.el.rotation.x = -1.6; h.armR.userData.el.rotation.x = -1.6; }
  if (kind === 'hold') { h.armR.rotation.set(-.35, 0, -.35 * amt); h.armR.userData.el.rotation.x = -.2; }
  if (kind === 'holdL') { h.armL.rotation.set(-.35, 0, .35 * amt); h.armL.userData.el.rotation.x = -.2; }
  if (kind === 'arms') { h.armL.rotation.set(-1.3, 0, .2); h.armR.rotation.set(-1.3, 0, -.2); h.armL.userData.el.rotation.x = h.armR.userData.el.rotation.x = -.6; }
  if (kind === 'pray') { h.armL.rotation.set(-1.0, 0, .55); h.armR.rotation.set(-1.0, 0, -.55); h.armL.userData.el.rotation.x = h.armR.userData.el.rotation.x = -1.7; h.neck.rotation.x = .25; }
  if (kind === 'sulk') { h.armL.rotation.set(-1.2, 0, -.6); h.armR.rotation.set(-1.2, 0, .6); h.armL.userData.el.rotation.x = h.armR.userData.el.rotation.x = -1.8; h.neck.rotation.set(-.15, .5, 0); }
}

// —— Bullet motorbike ——
export function makeBike() {
  const g = new THREE.Group();
  const black = std('#151515', { metalness: .5, roughness: .35 }), chrome = std('#cfd3d6', { metalness: .9, roughness: .2 }), tyre = std('#0d0d0d', { roughness: .9 });
  for (const z of [-.7, .7]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.3, .09, 8, 18), tyre); w.position.set(0, .38, z); w.rotation.y = Math.PI / 2; g.add(w); }
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .4, 4, 10), black); tank.rotation.x = Math.PI / 2; tank.position.set(0, .82, .18); g.add(tank);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.18, .32, 1.1), black); frame.position.set(0, .62, 0); g.add(frame);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.24, .1, .55), std('#3b2416')); seat.position.set(0, .86, -.32); g.add(seat);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .12, 14), chrome); head.rotation.x = Math.PI / 2; head.position.set(0, .95, .72); g.add(head);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(.09, 14), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0 })); lamp.position.set(0, .95, .79); g.add(lamp);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.75, .04, .04), chrome); bar.position.set(0, 1.08, .6); g.add(bar);
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .9, 8), chrome); ex.rotation.x = Math.PI / 2; ex.position.set(.2, .38, -.2); g.add(ex);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.12, .06, .02), new THREE.MeshStandardMaterial({ color: '#600', emissive: '#ff2020', emissiveIntensity: .6 })); tail.position.set(0, .8, -.62); g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.3);
  g.userData.lamp = lamp;
  return g;
}

// —— tractor ——
export function makeTractor(color = '#d7262b') {
  const g = new THREE.Group(), body = std(color, { roughness: .45 }), tyre = std('#141414', { roughness: .95 }), rim = std('#f0c040');
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, .9, 1.8), body); hood.position.set(0, 1.0, .8); g.add(hood);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, .25, 1.0), body); cab.position.set(0, 1.25, -.5); g.add(cab);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .4), std('#222')); seat.position.set(0, 1.55, -.6); g.add(seat);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, 1.5), std('#f5f0e6')); canopy.position.set(0, 2.6, -.5); g.add(canopy);
  for (const x of [-.65, .65]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 5), std('#555')); p.position.set(x, 1.95, -.5); g.add(p); }
  for (const s of [-1, 1]) {
    const rw = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .45, 18), tyre); rw.rotation.z = Math.PI / 2; rw.position.set(s * .85, .75, -.6); g.add(rw);
    const rr = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .47, 14), rim); rr.rotation.z = Math.PI / 2; rr.position.set(s * .85, .75, -.6); g.add(rr);
    const fw = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .25, 14), tyre); fw.rotation.z = Math.PI / 2; fw.position.set(s * .6, .38, 1.4); g.add(fw);
  }
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.9, .9, 3.2), std('#3f7fc0', { roughness: .6 })); trolley.position.set(0, 1.05, -3.2); g.add(trolley);
  const hay = new THREE.Mesh(new THREE.BoxGeometry(1.8, .6, 3.0), std('#e8c35a', { roughness: 1 })); hay.position.set(0, 1.7, -3.2); g.add(hay);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .3, 14), tyre); w.rotation.z = Math.PI / 2; w.position.set(s * 1.0, .45, -3.2); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// —— bullock cart ——
export function makeCart() {
  const g = new THREE.Group(), wood = std('#8a5a32'), ox = sheen('#efe9dd'), horn = std('#3a2a1a');
  for (const s of [-1, 1]) {
    const b = new THREE.Group(); b.position.set(s * .55, 0, 2.2); g.add(b);
    const bd = new THREE.Mesh(new THREE.CapsuleGeometry(.35, .9, 4, 10), ox); bd.rotation.x = Math.PI / 2; bd.position.y = 1.0; b.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), ox); hd.position.set(0, 1.25, .75); b.add(hd);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), ox); hump.position.set(0, 1.35, .45); b.add(hump);
    for (const h of [-1, 1]) { const hn = new THREE.Mesh(new THREE.ConeGeometry(.04, .3, 6), horn); hn.position.set(h * .12, 1.48, .78); hn.rotation.z = -h * .4; b.add(hn); }
    for (const [lx, lz] of [[-.15, .4], [.15, .4], [-.15, -.4], [.15, -.4]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .75, 6), ox); l.position.set(lx, .38, lz); b.add(l); }
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, .15, 2.4), wood); bed.position.set(0, 1.1, -.4); g.add(bed);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 2.6), wood); pole.position.set(0, 1.15, 1.6); g.add(pole);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 16), wood); w.rotation.y = Math.PI / 2; w.position.set(s * .9, .65, -.4); g.add(w); }
  const load = new THREE.Mesh(new THREE.BoxGeometry(1.4, .5, 2.0), std('#7fae4a', { roughness: 1 })); load.position.set(0, 1.45, -.4); g.add(load);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// —— buffaloes at the pond ——
export function makeBuffaloes(scene) {
  const mat = sheen('#2a2826'), out = [];
  const R = mulberry(77);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.6, 1.3, 4, 10), mat); b.rotation.x = Math.PI / 2; b.position.y = .9; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), mat); h.position.set(0, 1.0, 1.25); g.add(h);
    for (const s of [-1, 1]) { const hn = new THREE.Mesh(new THREE.TorusGeometry(.22, .05, 5, 10, Math.PI), std('#4a443c')); hn.position.set(s * .2, 1.3, 1.2); hn.rotation.set(0, s * .5, s * 1.2); g.add(hn); }
    const inWater = i < 3;
    const a = R() * Math.PI * 2, r = inWater ? .45 : 1.12;
    g.position.set(POND.x + Math.cos(a) * POND.rx * r, inWater ? -.55 : 0, POND.z + Math.sin(a) * POND.rz * r);
    g.rotation.y = R() * Math.PI * 2;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g); out.push({ g, phase: R() * 10, inWater });
  }
  return out;
}

// —— villagers: model-railway capsules on simple paths ——
export function makeVillagers(scene, n = 80) {
  const R = mulberry(4242), cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#fafafa', '#7b2cbf', '#ff70a6', '#1d3557', '#f15bb5', '#00bbf9', '#fee440', '#8ac926'];
  const geo = new THREE.CapsuleGeometry(.24, .9, 3, 8); geo.translate(0, .7, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .6 }), n);
  const headGeo = new THREE.SphereGeometry(.16, 8, 6); headGeo.translate(0, 1.55, 0);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#b97a52', roughness: .6 }), n);
  const paths = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Color(cols[Math.floor(R() * cols.length)]); mesh.setColorAt(i, c);
    const k = R();
    if (k < .5) paths.push({ type: 'x', z: (R() > .5 ? 1 : -1) * (1.4 + R() * 1.8), x0: -120 + R() * 240, v: (R() > .5 ? 1 : -1) * (.9 + R() * .6), L: 240 });
    else if (k < .7) paths.push({ type: 'z', x: (R() - .5) * 4, z0: -90 + R() * 180, v: (R() > .5 ? 1 : -1) * (.8 + R() * .5), L: 180 });
    else if (k < .85) paths.push({ type: 'pond', a0: R() * 6.28, v: .02 + R() * .02 });
    else paths.push({ type: 'tree', a0: R() * 6.28, r: 7.5 + R() * 2 });
  }
  mesh.castShadow = heads.castShadow = true; scene.add(mesh, heads);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  function update(tw, density = 1) {   // tw: village time in seconds
    const vis = Math.round(n * density);
    for (let i = 0; i < n; i++) {
      const P = paths[i]; let yaw = 0, hop = 0;
      if (P.type === 'x') { let x = ((P.x0 + P.v * tw) % P.L + P.L) % P.L - 120; p.set(x, 0, P.z); yaw = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; hop = Math.abs(Math.sin(tw * 6 + i)) * .06; }
      else if (P.type === 'z') { let z = ((P.z0 + P.v * tw) % P.L + P.L) % P.L - 90; p.set(P.x, 0, z); yaw = P.v > 0 ? 0 : Math.PI; hop = Math.abs(Math.sin(tw * 6 + i)) * .06; }
      else if (P.type === 'pond') { const a = P.a0 + P.v * tw; p.set(POND.x + Math.cos(a) * (POND.rx + 4), 0, POND.z + Math.sin(a) * (POND.rz + 4)); yaw = -a; }
      else { const a = P.a0 + Math.sin(tw * .01 + i) * .4; p.set(PEEPAL.x + Math.cos(a) * P.r, .9, PEEPAL.z + Math.sin(a) * P.r); yaw = a + Math.PI / 2; }
      p.y += hop;
      const s = i < vis ? 1 : 0;
      m4.compose(p, q.setFromEuler(e.set(0, yaw, 0)), one.set(s, s, s)); mesh.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }
  return { update, mesh };
}

// —— kites over the rooftops ——
export function makeKites(scene) {
  const R = mulberry(9), out = [];
  const cols = ['#ff3b6b', '#ffd23f', '#3bceac', '#7b2cbf', '#ff8c42', '#2d7dd2'];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Shape(); s.moveTo(0, .9); s.lineTo(.6, 0); s.lineTo(0, -.9); s.lineTo(-.6, 0); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: .6 }));
    m.castShadow = true; scene.add(m);
    out.push({ m, x: -90 + R() * 180, z: -40 + R() * 70, y: 22 + R() * 14, ph: R() * 10 });
  }
  function update(tw, vis) {
    for (const k of out) {
      k.m.visible = vis > 0;
      k.m.position.set(k.x + Math.sin(tw * .4 + k.ph) * 3, k.y + Math.sin(tw * .7 + k.ph) * 1.5, k.z + Math.cos(tw * .3 + k.ph) * 2);
      k.m.rotation.set(-.6, Math.sin(tw * .5 + k.ph) * .4, Math.sin(tw * 1.1 + k.ph) * .25);
    }
  }
  return { update };
}
