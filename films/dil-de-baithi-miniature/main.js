// Dil De Baithi — a tilt-shift miniature lyric film. Picture only (lyrics + HUD are composited as a 60 fps overlay).
import * as THREE from 'three';
import { makePost } from './post.js';
import { clamp, seg, lerp, eio, eo, mulberry } from '/core/lib.js';
import { buildVillage, U, HER, HIS, HER_ROOF, HIS_ROOF, PEEPAL, POND, TEMPLE, FIELD_TITLE, LANE_Z } from './village.js';
import { makeSky } from './sky.js';
import { makeHero, pose, makeBike, makeTractor, makeCart, makeBuffaloes, makeVillagers, makeKites } from './people.js';

const QS = new URLSearchParams(location.search);
const W = innerWidth, H = innerHeight;
const LYR = await (await fetch('data/lyrics.json')).json();
const BEATS = (await (await fetch('data/beats.json')).json()).beats;
await document.fonts.load('800 150px Overpass');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = QS.has('soft') ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 12000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: 1, msaa: QS.has('nomsaa') ? 0 : 2, ao: QS.has('ao') });
post.bloom.strength = .25; post.bloom.threshold = 1.05; post.bloom.radius = .5;

const village = buildVillage(scene);
const sky = makeSky(scene, renderer);
const her = makeHero('her'), him = makeHero('him');
scene.add(her.root, him.root);
const bike = makeBike(); scene.add(bike);
const tractor = makeTractor(), cart = makeCart(); scene.add(tractor, cart);
const buffaloes = makeBuffaloes(scene);
const villagers = makeVillagers(scene, 90);
const kites = makeKites(scene);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// —— time helpers ——
const DUR = 241.8, BPM = 130.1, B = 60 / BPM, G0 = BEATS[0];
const SR = 4 / B;                                           // time-lapse step rate: one 16th note (~8.7 Hz)
const qStep = t => G0 + Math.floor((t - G0) * SR) / SR;    // stepped time on the 16th-note grid
const beatsIn = (a, b) => BEATS.filter(x => x >= a && x < b);
const wordT = (word, from = 0, nth = 0) => { const h = []; for (const l of LYR.lines) for (const w of l.words) if (w.t >= from && w.w.toLowerCase().includes(word)) h.push(w.t); return h[nth] ?? from; };

// —— effects ——
// stars on the sky dome (night) + the "counted" stars
const starGeo = new THREE.BufferGeometry(); { const R = mulberry(5), p = []; for (let i = 0; i < 1500; i++) { const a = R() * Math.PI * 2, e = Math.asin(.05 + R() * .95); p.push(Math.cos(a) * Math.cos(e) * 6000, Math.sin(e) * 6000, Math.sin(a) * Math.cos(e) * 6000); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,240,200,.8)'); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const counted = []; for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#fff6c8', transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0); scene.add(s); counted.push(s); }
// rain
const rainGeo = new THREE.BufferGeometry(); const RAIN_N = 2500; { const R = mulberry(8), p = []; for (let i = 0; i < RAIN_N; i++) { const x = (R() - .5) * 220, y = R() * 120, z = (R() - .5) * 220; p.push(x, y, z, x - .3, y - 2.2, z); } rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const rainBase = rainGeo.attributes.position.array.slice();
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#cfdcf0', transparent: true, opacity: .55 })); rain.visible = false; scene.add(rain);
// cloud shadows: a dark, soft noise layer just above the ground
const cloudTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const R = mulberry(31); for (let i = 0; i < 70; i++) { const px = R() * 512, py = R() * 512, r = 30 + R() * 90, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(10,20,40,.55)'); g.addColorStop(1, 'rgba(10,20,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0 });
const cloudShadow = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), cloudMat); cloudShadow.position.y = 22; scene.add(cloudShadow);
// chimney smoke (winter)
const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(240,240,245,.9)'); g.addColorStop(1, 'rgba(240,240,245,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const smoke = []; { const R = mulberry(12); const roofs = village.plots.filter((_, i) => i % 5 === 0).slice(0, 14); for (const p of roofs) for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); smoke.push({ s, x: p.x0 + 2, z: p.z0 + 2, y: p.h + 1.5, k, ph: R() }); } }
// bonfire (winter) and chai cups
const fire = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.2, 8), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff8a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fireGlow.scale.setScalar(7); fire.add(fireGlow); fire.position.set(PEEPAL.x + 9.5, .6, PEEPAL.z - 1); fire.visible = false; scene.add(fire);
const charpai = new THREE.Group(); { const w = new THREE.MeshStandardMaterial({ color: '#7a5230' }); const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, 1.0), new THREE.MeshStandardMaterial({ color: '#d9b77a' })); top.position.y = .45; charpai.add(top); for (const [a, b] of [[-.9, -.45], [.9, -.45], [-.9, .45], [.9, .45]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.08, .45, .08), w); l.position.set(a, .22, b); charpai.add(l); } for (const dx of [-.15, .15]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .12, 12), new THREE.MeshStandardMaterial({ color: '#e8e2d6' })); cup.position.set(dx, .55, .1); charpai.add(cup); const tea = new THREE.Mesh(new THREE.CircleGeometry(.055, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#a8642c' })); tea.position.set(dx, .605, .1); charpai.add(tea); } charpai.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
charpai.scale.setScalar(1.3); charpai.position.set(PEEPAL.x - 4, .9, PEEPAL.z - 4); scene.add(charpai);
// a string of bulbs from her rooftop to his
const bulbs = []; { const a = HER_ROOF.clone().setY(HER_ROOF.y + 2.2), b = HIS_ROOF.clone().setY(HIS_ROOF.y + 2.2); const n = 24; const mat = () => new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6a', emissiveIntensity: 0 }); for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * 4; const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), mat()); m.position.copy(p); m.visible = false; scene.add(m); bulbs.push(m); } }
// light trail behind the bike (long exposure at dusk)
const trailPts = []; for (let x = 115; x >= -40; x -= 1) trailPts.push(V(x, 1.0, 1.6));
const trailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trailPts), 300, .12, 6, false);
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#ff3030', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); trail.visible = false; scene.add(trail);
const trail2 = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); trail2.position.set(0, .2, -1.2); trail2.visible = false; scene.add(trail2);
// a paper letter fluttering down from her roof
const letter = new THREE.Mesh(new THREE.PlaneGeometry(.5, .35), new THREE.MeshStandardMaterial({ color: '#fbfaf5', side: THREE.DoubleSide })); letter.castShadow = true; letter.visible = false; scene.add(letter);

// —— camera helpers ——
const orb = (target, dist, pitch, yaw, fov = 28) => {
  const p = pitch * Math.PI / 180, y = yaw * Math.PI / 180;
  return { pos: V(target.x + Math.sin(y) * Math.cos(p) * dist, target.y + Math.sin(p) * dist, target.z + Math.cos(y) * Math.cos(p) * dist), look: target.clone(), fov };
};
const mixCam = (a, b, u) => ({ pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), fov: lerp(a.fov, b.fov, u) });
const BAND = (w = .06, amp = 30, mix = .6, aper = 6000) => ({ w, amp, mix, aper });
const PAIR_ROOF = V(HER_ROOF.x, HER_ROOF.y, HER_ROOF.z + 1.5);
const DOOR = V((HER.x0 + HER.x1) / 2, 0, HER.z1 + 1.2), HDOOR = V((HIS.x0 + HIS.x1) / 2, 0, HIS.z0 - 1.2);
const CENTER = V(0, 0, 0);
const laneAt = (x, side = 1.6) => V(x, 0, side);

// —— the film: shots keyed to the lyric slides. clock = village hours [h0,h1]; az = sun azimuth cheat ——
const S = LYR.slides.map(s => s.s);
const SH = [];
const shot = (t0, t1, o) => SH.push({ t0, t1, ...o });
const bikeRide = (t, a, b, x0, x1) => lerp(x0, x1, eio(clamp((t - a) / (b - a))));

shot(0, 12.2, { clock: [9.5, 10.5], az: 170, cam: (u) => { const c = orb(V(FIELD_TITLE.x, 0, FIELD_TITLE.z), 230, 89, 0, 30); c.up = V(Math.sin(u * .4), 0, -Math.cos(u * .4)); return c; }, band: BAND(.08, 22, .5, 6000) });
shot(12.2, 26.8, { clock: [10.5, 11.5], az: 175, cam: (u) => { const k = eio(u); return mixCam(orb(V(FIELD_TITLE.x, 0, FIELD_TITLE.z), 230, 89, 0, 30), orb(V(0, 0, -5), 170, 50, 12, 28), k); }, upFrom: 12.2, band: BAND(.06, 30, .6, 6000) });
// chorus 1: he rides the Bullet west along the lane to her door
shot(S[1] - .2, S[2] - .1, { clock: [12, 12.6], az: 175, cam: (u) => orb(V(lerp(70, -10, eio(u)), 0, 0), 150, 48, 15, 28), band: BAND(.055, 30, .6, 6000), follow: 'bike', density: 1 });
shot(S[2] - .1, S[3] - .1, { clock: [12.6, 13], az: 180, cam: (u) => orb(V(DOOR.x + 4, 0, 1), lerp(62, 48, eio(u)), lerp(42, 34, u), 18, 26), band: BAND(.05, 30, .65, 4000), follow: 'pair', density: 1 });
// night falls over the village
shot(S[3] - .1, S[4] - .15, { clock: [17.2, 21.5], az: 200, cam: (u) => orb(V(-10, 0, -10), lerp(240, 215, u), 46, lerp(-8, 8, u), 28), band: BAND(.07, 28, .55, 7000), density: .5 });
shot(S[4] - .15, S[5] - .1, { clock: [21.5, 21.55], az: 200, rt: true, cam: (u) => orb(HER_ROOF.clone().add(V(0, 1, 0)), lerp(26, 20, eio(u)), 30, 25, 26), band: BAND(.05, 30, .7, 1600), follow: 'her' });
shot(S[5] - .1, S[6] - .2, { clock: [21.55, 21.65], az: 200, rt: true, cam: (u) => orb(HER_ROOF.clone().add(V(0, -1, 5)), lerp(18, 26, eio(u)), lerp(18, 26, u), 10, 24), band: BAND(.05, 30, .7, 1400), follow: 'her' });
// chorus 2: the clock races to the next noon; top-down rotating village
shot(S[6] - .2, S[7] - .1, { clock: [21.7, 36.2], az: 170, cam: (u) => { const c = orb(V(-5, 0, 0), 230, 89, 0, 30); const a = lerp(-.3, .25, u); c.up = V(Math.sin(a), 0, -Math.cos(a)); return c; }, band: BAND(.07, 26, .5, 6000), density: 1 });
shot(S[7] - .1, S[8] - .2, { clock: [36.2, 36.8], az: 175, cam: (u) => orb(V(lerp(-20, 10, u), 0, 0), 120, 44, lerp(-20, -5, u), 27), band: BAND(.055, 30, .6, 5000), follow: 'pair', density: 1 });
// instrumental: rise, the village as a pattern, sun sweeping
shot(S[8] - .2, S[9] - .2, { clock: [37, 41], az: 170, azSweep: 70, cam: (u) => orb(V(0, 0, 0), lerp(180, 420, eo(u)), lerp(55, 86, eo(u)), lerp(10, 40, u), 30), band: BAND(.08, 24, .5, 9000), density: 1 });
// stars: counting them on her rooftop at night; then the days flip by
shot(S[9] - .2, S[10] - .2, { clock: [44.5, 44.7], az: 200, flip: [wordT('gel', S[9]) - .1, S[10] - .4], cam: (u) => orb(HER_ROOF.clone().add(V(0, 4, -6)), lerp(34, 30, u), 10, -15, 40), band: BAND(.07, 26, .55, 3000), follow: 'pairRoof' });
// first meeting under the peepal at night (real time, the band narrows)
shot(S[10] - .2, S[11] - .2, { clock: [45, 45.03], az: 200, rt: true, cam: (u) => orb(V(PEEPAL.x - 2, 1.5, PEEPAL.z - 7), lerp(30, 16, eio(u)), lerp(26, 16, u), -25, 24), band: BAND(lerp(.05, .03, .5), 30, .75, 1200), follow: 'pairTree' });
// chai on the charpai, morning (rack from cups to them)
shot(S[11] - .2, S[12] - .1, { clock: [55, 55.02], az: 160, rt: true, cam: (u) => orb(V(PEEPAL.x - 4, 1.2, PEEPAL.z - 4), 9, 24, -30, 24), band: BAND(.04, 30, .7, 800), follow: 'cups' });
shot(S[12] - .1, S[13] - .2, { clock: [55.02, 55.04], az: 160, rt: true, cam: (u) => orb(V(PEEPAL.x - 4, 1.4, PEEPAL.z - 4), lerp(9, 7, u), 20, -10, 24), band: BAND(.04, 30, .75, 700), follow: 'pairChai' });
// walking through the mustard field
shot(S[13] - .2, S[14] - .2, { clock: [56, 56.4], az: 170, cam: (u) => orb(V(0, 0, lerp(104, 150, u)), 46, 34, 24, 26), band: BAND(.05, 30, .62, 5000), follow: 'pair', density: .8 });
// chorus 3: busy noon, kites, they fly a kite on her roof
shot(S[14] - .2, S[15] - .1, { clock: [60, 60.6], az: 175, cam: (u) => orb(V(lerp(-50, -20, u), 0, -10), 150, 47, lerp(25, 5, u), 28), band: BAND(.055, 30, .6, 6000), follow: 'pairRoof', density: 1, kites: 1 });
shot(S[15] - .1, S[16] - .2, { clock: [60.6, 61.2], az: 175, cam: (u) => { const c = orb(V(-15, 0, -5), 210, 89, 0, 30); const a = lerp(.4, -.1, u); c.up = V(Math.sin(a), 0, -Math.cos(a)); return c; }, band: BAND(.07, 26, .5, 6000), density: 1, kites: 1 });
// rain rolls in; they sit under the tree; it clears to dusk
shot(S[16] - .2, S[17] - .2, { clock: [62, 62.15], az: 190, rain: [S[16], wordT('palle', S[16]) + .4], cam: (u) => orb(V(PEEPAL.x - 2, 1.4, PEEPAL.z - 6.6), lerp(30, 24, u), 10, -20, 26), band: BAND(.05, 30, .65, 2500), follow: 'pairTree' });
shot(S[17] - .2, S[18] - .2, { clock: [65.6, 65.7], az: 220, rt: true, cam: (u) => orb(V(DOOR.x + 1, 1.2, 1), lerp(14, 10, u), 18, 20, 24), band: BAND(.04, 30, .72, 900), follow: 'pairLane' });
// dusk ride with light trails
shot(S[18] - .2, S[19] - .2, { clock: [66.2, 66.6], az: 230, trail: true, cam: (u) => orb(V(lerp(60, 0, u), 0, 0), 130, 44, 10, 28), band: BAND(.055, 30, .6, 6000), follow: 'bike' });
// the string of lights links the two rooftops
shot(S[19] - .2, S[20] - .2, { clock: [66.8, 67.0], az: 230, string: true, cam: (u) => orb(V(0, 4, -2), lerp(120, 105, u), 38, -6, 28), band: BAND(.06, 28, .6, 5000) });
shot(S[20] - .2, S[21] - .1, { clock: [67.0, 67.01], az: 230, rt: true, string: true, cam: (u) => orb(PAIR_ROOF.clone().add(V(0, 1.4, 0)), lerp(12, 9, u), 14, 30, 24), band: BAND(.04, 30, .75, 700), follow: 'pairRoof' });
// she steps away, he comes closer (top-down choreography on the lane)
shot(S[21] - .1, S[22] - .1, { clock: [67.1, 67.15], az: 230, rt: true, string: true, cam: (u) => { const c = orb(V(lerp(-24, -36, u), 0, 0), 60, 89, 0, 30); c.up = V(0, 0, -1); return c; }, band: BAND(.07, 26, .5, 3000), follow: 'pairLane' });
shot(S[22] - .1, S[23] - .1, { clock: [67.2, 67.22], az: 230, rt: true, string: true, cam: (u) => orb(PAIR_ROOF.clone().add(V(0, 1.4, 0)), lerp(11, 9, u), 12, -20, 24), band: BAND(.04, 30, .75, 700), follow: 'pairRoof' });
shot(S[23] - .1, S[24] - .1, { clock: [67.25, 67.27], az: 230, rt: true, string: true, cam: (u) => orb(PAIR_ROOF.clone().add(V(0, 1.2, 0)), lerp(9, 7, u), 10, 50, 24), band: BAND(.035, 30, .78, 600), follow: 'pairRoof' });
// nazar + the black thread: the closest the lens gets
shot(S[24] - .1, S[25] - .1, { clock: [67.3, 67.31], az: 230, rt: true, string: true, cam: (u) => orb(PAIR_ROOF.clone().add(V(-.4, 2.5, 0)), lerp(5, 4, u), 6, 25, 22), band: BAND(.03, 30, .8, 300), follow: 'herFace' });
shot(S[25] - .1, S[26] - .2, { clock: [67.32, 67.34], az: 230, rt: true, string: true, cam: (u) => orb(PAIR_ROOF.clone().add(V(.45, 1.45, .25)), lerp(4, 2.6, eio(u)), 22, 35, 22), band: BAND(.025, 30, .82, 220), follow: 'wrist' });
// chorus 4: festival noon; they ride out to the fields
shot(S[26] - .2, S[27] - .1, { clock: [84, 84.6], az: 175, cam: (u) => orb(V(lerp(30, -20, u), 0, 0), 160, 48, -20, 28), band: BAND(.055, 30, .6, 6000), follow: 'bike', density: 1, kites: 1 });
shot(S[27] - .1, S[28] - .2, { clock: [84.6, 85.2], az: 175, cam: (u) => orb(V(0, 0, lerp(40, 160, eio(u))), 120, 45, 30, 28), band: BAND(.055, 30, .6, 6000), follow: 'bike', density: 1, kites: 1 });
// winter morning: fog, low pale sun, smoke, a small fire
shot(S[28] - .2, S[29] - .2, { clock: [103.2, 103.6], az: 150, winter: 1, cam: (u) => orb(V(PEEPAL.x + 9.5, 1, PEEPAL.z), lerp(26, 20, u), 18, -35, 26), band: BAND(.05, 30, .65, 2500), follow: 'pairFire' });
// rise: the village becomes a pattern
shot(S[29] - .2, S[30] - .2, { clock: [104, 105], az: 165, cam: (u) => { const h = Math.exp(lerp(Math.log(30), Math.log(1100), eio(u))); const c = orb(V(PEEPAL.x + 6, 0, PEEPAL.z), h, lerp(40, 88, eio(u)), -35, 30); return c; }, band: BAND(.06, 26, .5, 8000), follow: 'pairFire' });
// night: one window, one heart
shot(S[30] - .2, S[31] - .2, { clock: [117, 117.3], az: 200, cam: (u) => orb(HER_ROOF.clone(), lerp(320, 90, eio(u)), lerp(70, 40, eio(u)), 10, 28), band: BAND(.05, 30, .62, 4000), follow: 'pairRoof', density: .2, string: true });
// dawn at the temple
shot(S[31] - .2, S[32] - .1, { clock: [126.3, 126.45], az: 110, cam: (u) => orb(V(TEMPLE.x, 6, TEMPLE.z), lerp(70, 55, u), 30, 25, 27), band: BAND(.055, 30, .62, 4000), follow: 'pairTemple', density: .2 });
shot(S[32] - .1, S[33] - .2, { clock: [126.45, 126.47], az: 110, rt: true, cam: (u) => orb(V(TEMPLE.x + 1, 1.5, TEMPLE.z + 11), lerp(12, 9, u), 16, 25, 24), band: BAND(.035, 30, .78, 700), follow: 'pairTemple' });
// instrumental: one whole day from a locked vantage
shot(S[33] - .2, S[34] - .2, { clock: [126.6, 138.5], az: 120, azSweep: 120, cam: (u) => orb(V(0, 0, -5), 250, 50, lerp(-5, 5, u), 28), band: BAND(.065, 28, .55, 8000), density: 1, kites: 1, follow: 'pairRoof' });
// outro: lights go out one by one; the lens un-tilts
shot(S[34] - .2, DUR + 1, { clock: [138.6, 140.2], az: 220, outro: 1, cam: (u) => orb(V(FIELD_TITLE.x * .3, 0, 60), lerp(300, 380, u), lerp(52, 62, u), 0, 30), band: BAND(.07, 26, .55, 9000), density: .1 });

window.SHOTS = SH.map(s => ({ t0: s.t0, t1: s.t1, clock: s.clock, rt: !!s.rt, flip: s.flip || null }));
const shotAt = t => SH.find(s => t >= s.t0 && t < s.t1) || SH[SH.length - 1];

// —— the heroes' blocking ——
function heroes(t, s, tw) {
  const hp = (h, x, z, yaw, k = 'stand', ph = 0, y = 0) => { h.root.position.set(x, y, z); h.root.rotation.set(0, yaw, 0); pose(h, k, ph); h.root.visible = true; };
  const roofY = HER_ROOF.y;
  bike.visible = false; her.thread.visible = her.charm.visible = false; him.thread.visible = him.charm.visible = false;
  letter.visible = false;
  const i = SH.indexOf(s);
  const ph = t * 9;
  if (i <= 1) { her.root.visible = him.root.visible = false; return null; }
  if (s.t0 >= S[1] - .3 && s.t0 < S[2]) {   // he rides in
    const x = bikeRide(t, S[1], S[2] - .5, 110, DOOR.x + 6);
    bike.visible = true; bike.position.set(x, 0, 1.6); bike.rotation.y = -Math.PI / 2;
    hp(him, x - .1, 1.6, -Math.PI / 2, 'sit'); him.root.position.y = .45;
    hp(her, DOOR.x, HER.z1 + .6, 0, 'stand');
    return { bike: bike.position, pair: V(x, 1, 1) };
  }
  if (s.t0 >= S[2] - .3 && s.t0 < S[3]) {   // she steps out, he stands by the bike
    bike.visible = true; bike.position.set(DOOR.x + 6, 0, 1.6); bike.rotation.y = -Math.PI / 2;
    const u = eio(clamp((t - S[2]) / 2.5));
    hp(her, DOOR.x + u * 1.5, HER.z1 + .6 + u * 2.4, .4, u < 1 ? 'walk' : 'stand', ph);
    hp(him, DOOR.x + 4.6, 1.2, -1.9, t > wordT('baithi', S[2]) ? 'wave' : 'stand', ph);
    return { pair: V(DOOR.x + 2.5, 1, 1.5) };
  }
  if (i === 4) { hp(her, HER_ROOF.x + 2, HER_ROOF.z, 0, 'stand', 0, roofY); him.root.visible = false; return { her: V(HER_ROOF.x, roofY + 1, HER_ROOF.z) }; }
  if (s.t0 >= S[4] - .3 && s.t0 < S[5] - .2) {   // she runs to the parapet
    const u = clamp((t - S[4] - .3) / 2.4);
    hp(her, lerp(HER_ROOF.x - 4, HER_ROOF.x, u), lerp(HER_ROOF.z - 3, HER.z1 - 1.2, u), 0, u < 1 ? 'run' : 'wave', t * 11, roofY);
    hp(him, DOOR.x + 1, 2.2, Math.PI, 'stand');
    return { her: V(her.root.position.x, roofY + 1, her.root.position.z) };
  }
  if (s.t0 >= S[5] - .3 && s.t0 < S[6] - .3) {   // she laughs; a blank letter flutters down to him
    hp(her, HER_ROOF.x, HER.z1 - 1.2, 0, t > wordT('haase', S[5]) - .2 ? 'laugh' : 'stand', t * 4, roofY);
    hp(him, DOOR.x + 1, 2.2, Math.PI, 'arms');
    const tl = wordT('kaagaj', S[5]) - .6, u = clamp((t - tl) / 3);
    if (t > tl) { letter.visible = true; letter.position.set(lerp(HER_ROOF.x, DOOR.x + 1, u) + Math.sin(t * 5) * .5 * (1 - u), lerp(roofY + 1.3, 1.9, u), lerp(HER.z1 - .8, 2.0, u)); letter.rotation.set(Math.sin(t * 6) * .8 * (1 - u), t * 2, Math.cos(t * 5) * .6 * (1 - u)); }
    return { her: V(HER_ROOF.x, roofY + 1, HER.z1 - 1.2) };
  }
  if (i === 7) { her.root.visible = him.root.visible = false; return null; }
  if (s.t0 >= S[7] - .3 && s.t0 < S[8] - .3) {   // walking the bike together down the lane (time-lapse steps)
    const x = lerp(DOOR.x + 2, 30, clamp((tw - s.tw0) / (s.tw1 - s.tw0)));
    bike.visible = true; bike.position.set(x + 1.2, 0, 2.6); bike.rotation.y = Math.PI / 2;
    hp(her, x, 1.0, Math.PI / 2, 'walk', tw * 4); hp(him, x + .2, 2.2, Math.PI / 2, 'walk', tw * 4 + 1);
    return { pair: V(x, 1, 1.6) };
  }
  if (i === 9) { her.root.visible = him.root.visible = false; return null; }
  if (s.t0 >= S[9] - .3 && s.t0 < S[10] - .3) {   // sitting on her roof counting stars
    hp(her, HER_ROOF.x - .8, HER_ROOF.z + 2, Math.PI, 'sit', 0, roofY); hp(him, HER_ROOF.x + .8, HER_ROOF.z + 2, Math.PI, 'sit', 0, roofY);
    if (t > wordT('taare', S[9]) - .2 && t < wordT('gel', S[9])) pose(her, 'wave', t * 3);
    return { pairRoof: V(HER_ROOF.x, roofY + 1, HER_ROOF.z + 2) };
  }
  const tree = (ox) => [PEEPAL.x - 2 + ox, PEEPAL.z - 6.6];
  if (s.t0 >= S[10] - .3 && s.t0 < S[11] - .3) {   // first meeting: she arrives, they sit
    const tm = wordT('mulaqaat', S[10]), u = clamp((t - (S[10] + .2)) / Math.max(.5, tm - S[10] - .2));
    hp(him, tree(.75)[0], tree(.75)[1], 0, 'sit', 0, .9 - .5);
    if (u < 1) hp(her, lerp(PEEPAL.x - 12, tree(-.75)[0], u), lerp(PEEPAL.z - 14, tree(-.75)[1], u), .8, 'walk', t * 7);
    else hp(her, tree(-.75)[0], tree(-.75)[1], 0, 'sit', 0, .9 - .5);
    return { pairTree: V(PEEPAL.x - 2, 1.5, PEEPAL.z - 6.6) };
  }
  if (s.t0 >= S[11] - .3 && s.t0 < S[13] - .3) {   // chai on the charpai
    hp(her, charpai.position.x - .8, charpai.position.z + 1.1, Math.PI, 'sit', 0, .2); hp(him, charpai.position.x + .8, charpai.position.z + 1.1, Math.PI, 'sit', 0, .2);
    if (i === SH.findIndex(x => x.t0 === S[12] - .1)) { her.root.rotation.z = -.12; her.root.position.x += .2; }
    return { cups: V(charpai.position.x, 1.6, charpai.position.z), pairChai: V(charpai.position.x, 2.0, charpai.position.z + 1.1) };
  }
  if (s.t0 >= S[13] - .3 && s.t0 < S[14] - .3) {   // through the mustard field
    const z = lerp(100, 152, clamp((t - S[13]) / (S[14] - S[13])));
    hp(her, .8, z, 0, 'walk', t * 7); hp(him, -.9, z - 2.5, 0, 'walk', t * 7 + 1.5);
    if (t > wordT('mholi', S[13]) - .3) pose(her, 'wave', t * 3);
    return { pair: V(0, 1, z - 1) };
  }
  const roofPair = (k1 = 'stand', k2 = 'stand') => { hp(her, HER_ROOF.x - .6, HER_ROOF.z + 1.5, Math.PI * .1, k1, t * 3, roofY); hp(him, HER_ROOF.x + .6, HER_ROOF.z + 1.5, -Math.PI * .1, k2, t * 3, roofY); return { pairRoof: V(HER_ROOF.x, roofY + 1.2, HER_ROOF.z + 1.5) }; };
  if (s.t0 >= S[14] - .3 && s.t0 < S[16] - .3) return roofPair('wave', 'arms');
  if (s.t0 >= S[16] - .3 && s.t0 < S[17] - .3) { hp(her, tree(-.75)[0], tree(-.75)[1], 0, 'sit', 0, .4); hp(him, tree(.75)[0], tree(.75)[1], 0, 'sit', 0, .4); return { pairTree: V(PEEPAL.x - 2, 1.5, PEEPAL.z - 6.6) }; }
  if (s.t0 >= S[17] - .3 && s.t0 < S[18] - .3) { hp(her, DOOR.x, 1.6, Math.PI / 2, 'hold'); hp(him, DOOR.x + .9, 1.6, -Math.PI / 2, 'hold'); pose(him, 'holdL'); return { pairLane: V(DOOR.x + .45, 1.6, 1.6) }; }
  if (s.t0 >= S[18] - .3 && s.t0 < S[19] - .3) {
    const x = bikeRide(t, S[18], S[19] - .2, 115, -30);
    bike.visible = true; bike.position.set(x, 0, 1.6); bike.rotation.y = -Math.PI / 2;
    hp(him, x - .1, 1.6, -Math.PI / 2, 'sit'); him.root.position.y = .45; hp(her, x + .8, 1.6, -Math.PI / 2, 'sit'); her.root.position.y = .5;
    return { bike: V(x, 1, 1.6) };
  }
  if (s.t0 >= S[19] - .3 && s.t0 < S[21] - .3) return roofPair('stand', 'stand');
  if (s.t0 >= S[21] - .3 && s.t0 < S[22] - .3) {   // she steps away, he follows closer (on the beat)
    const bs = beatsIn(S[21], S[22]), k = bs.filter(b => b <= t).length, x = DOOR.x - k * 1.2;
    hp(her, x, .5, -Math.PI / 2, 'walk', t * 6); hp(him, x + 3.2 - k * .25, .9, -Math.PI / 2, 'walk', t * 6 + 1);
    return { pairLane: V(x + 1, 1, .7) };
  }
  if (s.t0 >= S[22] - .3 && s.t0 < S[23] - .3) { const r = roofPair('sulk', 'arms'); her.root.rotation.y = Math.PI * .8; if (t > wordT('manaave', S[22]) - .2) { pose(her, 'stand'); her.root.rotation.y = .4; } return r; }
  if (s.t0 >= S[23] - .3 && s.t0 < S[24] - .3) { const r = roofPair('hold', 'holdL'); her.root.rotation.y = Math.PI / 2; him.root.rotation.y = -Math.PI / 2; her.root.position.x = HER_ROOF.x - .45; him.root.position.x = HER_ROOF.x + .45; return r; }
  if (s.t0 >= S[24] - .3 && s.t0 < S[26] - .3) {
    const r = roofPair('stand', 'holdL'); her.root.rotation.y = Math.PI / 2 - .3; him.root.rotation.y = -Math.PI / 2;
    her.root.position.x = HER_ROOF.x - .45; him.root.position.x = HER_ROOF.x + .45;
    const tt = wordT('baandh', S[25] - .5); him.thread.visible = t > tt; him.charm.visible = t > wordT('kaale', S[25] - .5) - .2;
    if (t > S[25] - .2) pose(her, 'hold');
    him.root.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); him.armR.userData.el.getWorldPosition(wp); wp.y -= .3;
    return { herFace: V(her.root.position.x, roofY + 2.0, her.root.position.z), wrist: wp };
  }
  if (s.t0 >= S[26] - .3 && s.t0 < S[28] - .3) {   // ride out to the fields
    let x, z;
    if (s.t0 < S[27] - .3) { x = bikeRide(t, S[26], S[27], 40, 1.6); z = 1.6; bike.rotation.y = -Math.PI / 2; }
    else { x = 1.6; z = bikeRide(t, S[27], S[28], 3, 165); bike.rotation.y = 0; }
    bike.visible = true; bike.position.set(x, 0, z);
    hp(him, x, z, bike.rotation.y, 'sit'); him.root.position.y = .45; hp(her, x - Math.sin(bike.rotation.y) * .8, z - Math.cos(bike.rotation.y) * .8, bike.rotation.y, 'sit'); her.root.position.y = .5;
    return { bike: V(x, 1, z) };
  }
  if (s.t0 >= S[28] - .3 && s.t0 < S[30] - .3) {   // by the winter fire
    hp(her, fire.position.x - 1.4, fire.position.z + 1.2, 2.3, 'sit', 0, 0); hp(him, fire.position.x + 1.4, fire.position.z + 1.2, -2.3, 'sit', 0, 0);
    return { pairFire: V(fire.position.x, 1, fire.position.z + 1) };
  }
  if (s.t0 >= S[30] - .3 && s.t0 < S[31] - .3) return roofPair('hold', 'holdL');
  if (s.t0 >= S[31] - .3 && s.t0 < S[33] - .3) {   // dawn prayer at the temple
    hp(her, TEMPLE.x - .7, TEMPLE.z + 10.5, Math.PI, 'pray', 0, 0); hp(him, TEMPLE.x + .7, TEMPLE.z + 10.5, Math.PI, 'pray', 0, 0);
    return { pairTemple: V(TEMPLE.x, 1.5, TEMPLE.z + 10.5) };
  }
  if (s.t0 >= S[33] - .3 && s.t0 < S[34] - .3) return roofPair('sit', 'sit');
  her.root.visible = him.root.visible = false; return null;
}

// —— clock → sun ——
const sunElevAt = h => { const d = ((h % 24) + 24) % 24; return d > 6 && d < 18.8 ? 66 * Math.sin(Math.PI * (d - 6) / 12.8) - 3.5 : -9; };

function render(t) {
  const s = shotAt(t), u = clamp((t - s.t0) / (s.t1 - s.t0));
  // world time: stepped on the 16th-note grid in time-lapse, smooth in real time
  const speed = (s.clock[1] - s.clock[0]) * 3600 / (s.t1 - s.t0);
  const step = !s.rt && speed > 2;
  const tq = step ? qStep(t) : t, uq = clamp((tq - s.t0) / (s.t1 - s.t0));
  let hours = lerp(s.clock[0], s.clock[1], uq);
  if (s.flip && tq > s.flip[0] && tq < s.flip[1]) hours += 48 * clamp((tq - s.flip[0]) / (s.flip[1] - s.flip[0]));   // days flip by
  const tw = hours * 3600;
  s.tw0 = s.clock[0] * 3600; s.tw1 = s.clock[1] * 3600;
  // camera (smooth every frame)
  const C = s.cam(u);
  camera.position.copy(C.pos); camera.up.copy(C.up || V(0, 1, 0)); camera.fov = C.fov;
  const nearCam = C.pos.y < 30; camera.near = nearCam ? .05 : Math.max(.5, C.pos.y * .2); camera.far = 9000;
  camera.updateProjectionMatrix(); camera.lookAt(C.look); camera.updateMatrixWorld();
  // actors
  const F = heroes(t, s, tw) || {};
  villagers.update(tw, s.density ?? (s.rt ? 0 : .3));
  kites.update(tw * .02 + t, s.kites ?? 0);
  // tractor + cart loop along the lane (time-lapse)
  { const L = 300, xt = ((tw * 2.2) % L + L) % L - 150; tractor.position.set(xt, 0, -1.7); tractor.rotation.y = Math.PI / 2; tractor.visible = !s.rt;
    const xc = ((-tw * .9) % L + L) % L - 150; cart.position.set(xc, 0, 1.9); cart.rotation.y = -Math.PI / 2; cart.visible = !s.rt || Math.abs(xc - DOOR.x) > 30; }
  for (const b of buffaloes) { b.g.rotation.y += 0; b.g.position.y = b.inWater ? -.55 + Math.sin(tw * .002 + b.phase) * .05 : 0; }
  village.waveFlag(t);
  // sky
  const elev = sunElevAt(hours);
  const az = (s.az ?? 180) + (s.azSweep ? lerp(-s.azSweep / 2, s.azSweep / 2, uq) : 0);
  const focusPt = C.look;
  const span = clamp(C.pos.distanceTo(C.look) * .9, 30, 320);
  let fogD = .0009 * clamp(200 / Math.max(C.pos.y, 10), .3, 3) * .3;
  if (s.winter) fogD = lerp(fogD, .012, s.winter);
  const SS = sky.apply(0, focusPt, span, { az, elev, fog: fogD, glow: elev < 8 ? 1 : 0 });
  const night = SS.night;
  village.lamps(clamp((night - .4) * 2));
  starMat.opacity = clamp((night - .6) * 2.5);
  // outro: lights going out one by one
  if (s.outro) { const k = seg(t, S[34] + 1, DUR - 2); U.lit.value = lerp(1, 0, k); village.lamps(clamp((night - .4) * 2) * (1 - k)); }
  // title in the field
  { const n = clamp(Math.floor((t - 3.0) / B) + 1, 0, 13); village.drawTitle(t < 3 ? 0 : n, clamp((t - 8.6) / 1.5)); }
  // counted stars
  counted.forEach((c, k) => { const tk = wordT('taare', S[9]) + k * B; const on = SH.indexOf(s) === SH.findIndex(x => x.flip) && t > tk && t < s.flip[0]; c.visible = on; if (on) { const a = .2 + k * .32; c.position.set(HER_ROOF.x - 52 + k * 14, 27 + Math.sin(a * 3) * 5, HER_ROOF.z - 110); c.scale.setScalar(lerp(34, 18, clamp((t - tk) / .4))); } });
  // rain + cloud shadows
  const rainOn = s.rain && t > s.rain[0] - .5 && t < s.rain[1];
  rain.visible = !!rainOn;
  if (rainOn) { const p = rainGeo.attributes.position.array; const off = (t * 38) % 120; for (let i = 0; i < p.length; i += 3) { let y = rainBase[i + 1] - off; if (y < 0) y += 120; p[i] = rainBase[i] + C.look.x; p[i + 1] = y; p[i + 2] = rainBase[i + 2] + C.look.z; } rainGeo.attributes.position.needsUpdate = true; }
  cloudMat.opacity = s.rain ? (t < s.rain[1] ? .9 : clamp(1 - (t - s.rain[1]) / 1.5) * .9) : (s.azSweep ? .35 : 0);
  cloudTex.offset.set(tw * .00004, tw * .00002);
  // winter smoke + fire
  fire.visible = !!s.winter && !!F.pairFire; fire.scale.set(1, 1 + Math.sin(t * 13) * .15, 1);
  for (const sm of smoke) { const a = ((t * .25 + sm.k / 6 + sm.ph) % 1); sm.s.position.set(sm.x + a * 4, sm.y + a * 9, sm.z - a * 2); sm.s.scale.setScalar(1.5 + a * 5); sm.s.material.opacity = s.winter ? .45 * (1 - a) * s.winter : 0; }
  // string of lights: one bulb per beat
  const lightsOn = s.string ? clamp(Math.floor((t - S[19]) / (B / 2)) + 1, 0, bulbs.length) : 0;
  bulbs.forEach((b, k) => { b.visible = !!s.string; b.material.emissiveIntensity = k < lightsOn ? 3.2 : 0; });
  // light trails
  trail.visible = trail2.visible = !!s.trail;
  if (s.trail && F.bike) { const k = clamp((115 - F.bike.x) / 155); const n = Math.floor(k * trailGeo.index.count / 6) * 6; trailGeo.setDrawRange(0, n); }
  bike.userData.lamp.material.emissiveIntensity = night > .3 ? 4 : 0;
  // lens: band follows the subject
  const follow = s.follow && F[s.follow];
  let focus = C.pos.distanceTo(C.look), bandY = .5;
  if (follow) { const p = follow.clone().project(camera); bandY = clamp((p.y + 1) / 2, .22, .78); focus = C.pos.distanceTo(follow); }
  const d = post.dof; d.focus = focus; d.aper = s.band.aper; d.maxCoc = QS.has('nodof') ? 0 : 26;
  let bw = s.band.w; if (s.outro) bw = lerp(bw, .6, seg(t, DUR - 4, DUR - .5));
  Object.assign(d.band, { y: bandY, w: bw, amp: s.band.amp, mix: s.band.mix, tilt: 0, pow: 1.2 });
  // grade
  const G = post.grade.uniforms;
  G.expo.value = SS.expo * .9 * (s.rain && t < s.rain[1] ? .82 : 1);
  G.sat.value = (1.55 - .3 * night) * (s.winter ? lerp(1, .7, s.winter) : 1) * (s.rain && t < s.rain[1] ? .8 : 1);
  G.contrast.value = .42; G.warm.value = .38 * (1 - night); G.amt.value = .32;
  // fade in/out of the film
  G.fade.value = clamp(t / .8) * clamp((DUR - t) / 1.2);
  post.composer.render();
  window.STATE = { speed: step ? speed : 1, hours, shot: SH.indexOf(s) };
}

const OFF = +(QS.get('off') || 0);
window.render = t => render(t + OFF); window.DUR = +(QS.get('dur') || DUR);
render(0);
window.READY = true;
