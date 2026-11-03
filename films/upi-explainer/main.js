// How a UPI payment works — Isometric Infographic, 1080x1920, render(t) is deterministic.
import { Iso, PAL, tri, pin, inset, ring, cutLine, hatch, iconGrid, person, haloText, FONT, clamp, lerp, seg, ss, eo, eio, back, TAU, C30, S30 } from './engine.js';

const W = 1080, H = 1920;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');
const iso = new Iso(g, W, H);
const TL = await (await fetch('timeline.json')).json();
await document.fonts.load(`600 40px ${FONT}`); await document.fonts.load(`400 40px ${FONT}`);
const L = Object.fromEntries(TL.map(l => [l.id, l]));
const wt = (id, i) => L[id].words[Math.min(i, L[id].words.length - 1)].t;     // time of word i of line id
const DUR = 56;

// —— colour roles ——
const C = {
  pay: tri('#E0634F'), you: tri('#4F8FD0'), shop: tri('#5FA65A'), sw: tri('#E2B347'), app: tri('#8C7CC8'),
  road: PAL.stone, board: PAL.cream, soil: PAL.soil, gold: tri('#E9BE5C'), dark: tri('#3A3340'), white: tri('#F7F2E8'),
};
const OK = '#3E9E57';

// —— world layout (units) ——
const S = {
  you: { x: 6, y: 13 }, app: { x: 15, y: 5 }, sw: { x: 21, y: 19 }, yb: { x: 32, y: 17 }, sb: { x: 15, y: 31 }, shop: { x: 29, y: 33 },
};
const J = { you: [10, 13], app: [17, 12], sw: [21, 19], yb: [29, 19], sb: [19, 29], shop: [28, 29] };
const R1 = [J.you, J.app];
const R2 = [J.app, [21, 12], J.sw];
const R3 = [J.sw, J.yb];
const R4 = [J.sw, [21, 29], J.sb];
const R5 = [J.sb, J.shop];

// beat times from the voice
const T = {
  scan: .9, pinT: 2.6, paid: wt('l1', 12) - .1, ask: wt('l1', 14),
  pull0: 7.4, pull1: 10.2, appPin: wt('l2', 9),
  r1: wt('l3', 0), r2: wt('l3', 4), cut: wt('l3', 6) + .2, swPin: wt('l3', 10),
  r3: wt('l4', 0), lock: wt('l4', 9), pinOk: wt('l4', 13), balOk: wt('l4', 20),
  debit: wt('l5', 2), r4: wt('l6', 2), credit: wt('l6', 8),
  ok1: wt('l7', 2), ok2: wt('l7', 4),
  big0: L.l8.t0 - .6, fill: L.l8.t0 + .4, fillEnd: wt('l8', 7) + .3, day: wt('l8', 10),
  end: L.l9.t0 - .4,
};

// —— helpers ——
const P = (p, z = 0) => iso.P(p[0], p[1], z);
function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function along(pts, u) {
  let rem = polyLen(pts) * clamp(u);
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (rem <= l) { const f = l ? rem / l : 0; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; } rem -= l; }
  return pts[pts.length - 1];
}
function sub(pts, u) { const out = [pts[0]]; let rem = polyLen(pts) * clamp(u); for (let i = 1; i < pts.length && rem > 0; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (rem >= l) out.push(pts[i]); else out.push([lerp(pts[i - 1][0], pts[i][0], rem / l), lerp(pts[i - 1][1], pts[i][1], rem / l)]); rem -= l; } return out; }
// route: ink dashed line drawn slightly ahead of the packet, coral when travelled
function route(pts, t0, dur, lead = .35) {
  const a = seg(t, t0 - lead, t0 + dur - lead), b = seg(t, t0, t0 + dur);
  if (a <= 0) return null;
  const scr = sub(pts, a).map(p => P(p, .25));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(251,244,230,.9)'; g.lineWidth = 10; g.beginPath(); scr.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.stroke();
  g.strokeStyle = PAL.ink; g.lineWidth = 2.5; g.setLineDash([9, 7]); g.beginPath(); scr.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.stroke(); g.setLineDash([]);
  if (b > 0) { const s2 = sub(pts, b).map(p => P(p, .25)); g.strokeStyle = C.pay[1]; g.lineWidth = 5; g.beginPath(); s2.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.stroke(); }
  g.restore();
  return b > 0 && b < 1 ? along(pts, eio(b)) : null;
}
function chip(gx, x, y, s, t3) { // tiny iso cube legend chip
  const c = s * .5; gx.save(); gx.translate(x, y);
  const f = (pts, col) => { gx.beginPath(); pts.forEach((p, i) => i ? gx.lineTo(...p) : gx.moveTo(...p)); gx.closePath(); gx.fillStyle = col; gx.fill(); };
  f([[0, -c], [c * C30 * 2, -c * .5], [0, 0], [-c * C30 * 2, -c * .5]], t3[0]);
  f([[-c * C30 * 2, -c * .5], [0, 0], [0, c], [-c * C30 * 2, c * .5]], t3[1]);
  f([[0, 0], [c * C30 * 2, -c * .5], [c * C30 * 2, c * .5], [0, c]], t3[2]); gx.restore();
}
function check(gx, x, y, s, a, col = OK) { // round tick badge (pops with back ease)
  if (a <= 0) return; const r = s * back(a, 2.6); gx.save(); gx.translate(x, y);
  gx.beginPath(); gx.arc(3, 5, r, 0, TAU); gx.fillStyle = 'rgba(46,37,34,.18)'; gx.fill();
  gx.beginPath(); gx.arc(0, 0, r, 0, TAU); gx.fillStyle = col; gx.fill(); gx.lineWidth = 3; gx.strokeStyle = PAL.ink; gx.stroke();
  gx.strokeStyle = '#fff'; gx.lineWidth = r * .22; gx.lineCap = 'round'; gx.lineJoin = 'round';
  gx.beginPath(); gx.moveTo(-r * .42, 0); gx.lineTo(-r * .1, r * .3); gx.lineTo(r * .45, -r * .32); gx.stroke(); gx.restore();
}
function envelope(gx, x, y, s, lockOpen = 0) { // the payment packet: coral envelope with a padlock
  gx.save(); gx.translate(x, y);
  gx.fillStyle = 'rgba(46,37,34,.2)'; gx.beginPath(); gx.ellipse(4, s * .55, s * .55, s * .16, 0, 0, TAU); gx.fill();
  gx.fillStyle = C.pay[1]; gx.fillRect(-s * .6, -s * .4, s * 1.2, s * .8);
  gx.fillStyle = C.pay[0]; gx.beginPath(); gx.moveTo(-s * .6, -s * .4); gx.lineTo(0, s * .08); gx.lineTo(s * .6, -s * .4); gx.closePath(); gx.fill();
  gx.strokeStyle = PAL.ink; gx.lineWidth = 2.5; gx.strokeRect(-s * .6, -s * .4, s * 1.2, s * .8);
  // padlock
  const ly = -s * .62; gx.fillStyle = PAL.mustard[1]; gx.fillRect(-s * .17, ly - s * .02, s * .34, s * .26); gx.strokeRect(-s * .17, ly - s * .02, s * .34, s * .26);
  gx.beginPath(); gx.arc(0, ly - s * .02 - lockOpen * s * .1, s * .11, Math.PI, TAU); gx.lineWidth = 3.5; gx.stroke();
  gx.restore();
}
function phoneIcon(gx, x, y, s, lit) {
  gx.save(); gx.translate(x, y); const c = lit ? C.you : ['#E6DCC8', '#DCD0BA', '#CFC2AA'];
  gx.fillStyle = c[2]; gx.beginPath(); gx.roundRect(-s * .26 + s * .06, -s * .44 + s * .05, s * .52, s * .88, s * .08); gx.fill();
  gx.fillStyle = c[1]; gx.beginPath(); gx.roundRect(-s * .26, -s * .44, s * .52, s * .88, s * .08); gx.fill();
  gx.fillStyle = lit ? '#EAF3FB' : '#EFE7D6'; gx.fillRect(-s * .19, -s * .34, s * .38, s * .6);
  if (lit) { gx.strokeStyle = OK; gx.lineWidth = s * .07; gx.lineCap = 'round'; gx.beginPath(); gx.moveTo(-s * .09, -s * .04); gx.lineTo(-s * .02, s * .04); gx.lineTo(s * .1, -s * .1); gx.stroke(); }
  gx.restore();
}
function coinStack(x, y, n, t3) { for (let i = 0; i < n; i++) iso.cyl(x, y, i * .32, .9, .28, t3, { n: 18 }); }
function bank(x, y, t3, label) {
  iso.box(x - 3.2, y - 3.2, 0, 6.4, 6.4, .6, PAL.stone);
  iso.box(x - 2.6, y - 2.6, .6, 5.2, 5.2, 4.2, C.white);
  for (let i = 0; i < 4; i++) { iso.cyl(x + 2.75, y - 2 + i * 1.33, .6, .28, 3.9, C.white, { n: 10 }); iso.cyl(x - 2 + i * 1.33, y + 2.75, .6, .28, 3.9, C.white, { n: 10 }); }
  iso.box(x - 3, y - 3, 4.8, 6, 6, .7, t3);
  iso.roof(x - 3, y - 3, 5.5, 6, 6, 1.6, t3);
  iso.text3(label, x + 3.05, y + 1.6, 4.25, { plane: 'yz', size: .62, tri: t3, face: PAL.paper, weight: 700 });
}

let t = 0;
function draw(tt) {
  t = tt;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
  // faint iso dot lattice
  g.fillStyle = 'rgba(46,37,34,.07)'; for (let yy = 0; yy < H; yy += 28) for (let xx = (yy / 28 % 2) * 24; xx < W; xx += 48) g.fillRect(xx, yy, 2.4, 2.4);

  // —— camera: log zoom between keyframes ——
  const K = [
    [0, 28.5, 33, 1.5, 78], [T.pull0, 28, 32.5, 1.5, 80], [T.pull1, 20, 19, 0, 25], [T.r1, 19, 17, 0, 32], [T.r3, 24, 19, 0, 34],
    [T.debit + .5, 23, 22, 0, 32], [T.ok1, 20, 19, 0, 25], [T.big0 + .8, 20, 19, 0, 25], [T.big0 + 2.6, 20, 20, 8, 15], [DUR, 20, 20, 8, 15],
  ];
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const k0 = K[i], k1 = K[i + 1], u = eio(seg(t, k0[0], k1[0]));
  iso.cam = { x: lerp(k0[1], k1[1], u), y: lerp(k0[2], k1[2], u), z: lerp(k0[3], k1[3], u), k: Math.exp(lerp(Math.log(k0[4]), Math.log(k1[4]), u)) };
  // shift the board up during the scale reveal so the Isotype grid has room below
  const lift = eio(seg(t, T.big0 + .8, T.big0 + 2.6)) * 520;
  g.save(); g.translate(0, -lift);
  // focus + context: grey out everything but the active part
  const focusApp = seg(t, T.appPin - .3, T.appPin + .2) * (1 - seg(t, T.r1 - .2, T.r1 + .3));
  iso.desat = .75 * focusApp;

  // —— board with strata ——
  const B0 = -2, B1 = 42;
  g.save(); const sh = [P([B0, B1], -2.6), P([B1, B1], -2.6), P([B1, B0], -2.6)]; g.restore();
  iso.box(B0, B0, -2.4, B1 - B0, B1 - B0, .9, C.soil);
  iso.box(B0, B0, -1.5, B1 - B0, B1 - B0, .9, tri('#B88B5E'));
  iso.box(B0, B0, -.6, B1 - B0, B1 - B0, .6, PAL.green);
  // roads
  const road = (a, b, w = 1.6) => { const x0 = Math.min(a[0], b[0]) - w / 2, x1 = Math.max(a[0], b[0]) + w / 2, y0 = Math.min(a[1], b[1]) - w / 2, y1 = Math.max(a[1], b[1]) + w / 2; iso.flat([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => [...p, .02]), 0, PAL.stone[0]); };
  for (const r of [R1, R2, R3, R4, R5]) for (let j = 1; j < r.length; j++) road(r[j - 1], r[j]);
  // trees
  for (const [x, y] of [[3, 3], [3, 30], [9, 37], [37, 4], [38, 30], [26, 6], [35, 38], [5, 22], [12, 22], [37, 11]]) { iso.cyl(x, y, 0, .25, 1.2, PAL.soil, { n: 6 }); iso.sphere(x, y, 2.2, 1.3, PAL.green); }

  // —— YOU: café table + person with phone ——
  iso.cyl(S.you.x, S.you.y, 0, 1.6, .2, PAL.stone, { n: 20 }); iso.cyl(S.you.x, S.you.y, 0, .25, 1.6, PAL.stone); iso.cyl(S.you.x, S.you.y, 1.6, 1.4, .2, C.white, { n: 20 });
  iso.bill(S.you.x + 1.8, S.you.y + .8, 0, (gx) => person(gx, { body: C.you[1], h: 3.4, hair: '#2a2020', arm: -1.2 }));
  // —— APP partner bank (lavender tower) ——
  iso.keep = focusApp > 0;
  iso.box(S.app.x - 2.4, S.app.y - 2.4, 0, 4.8, 4.8, 7.5, C.app);
  iso.box(S.app.x - 2.6, S.app.y - 2.6, 7.5, 5.2, 5.2, .5, C.app);
  iso.text3('APP', S.app.x + 2.45, S.app.y + 1.6, 5.2, { plane: 'yz', size: 1.3, tri: C.app, face: PAL.paper });
  iso.keep = false;
  // —— NPCI switch: hollow block, near walls slide away (cutaway) ——
  const sw = S.sw, cut = seg(t, T.cut + .3, T.cut + .7), cs = eo(cut);
  iso.box(sw.x - 4, sw.y - 4, 0, 8, 8, .4, C.sw);                       // floor
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {           // routers inside
    const bx = sw.x - 3 + c * 2.2, by = sw.y - 3 + r * 2.2, on = cut > .5 && ((Math.floor(t * 6) + r * 3 + c) % 4 === 0);
    iso.box(bx, by, .4, 1.4, 1.4, 1.4, on ? tri('#F0D27A') : C.dark);
  }
  iso.box(sw.x - 4, sw.y - 4, .4, .5, 8, 3.6, C.sw); iso.box(sw.x - 4, sw.y - 4, .4, 8, .5, 3.6, C.sw);   // back walls
  if (cs < 1) {
    iso.box(sw.x + 3.5 + cs * 5, sw.y - 4, .4, .5, 8, 3.6, C.sw);   // +x skin slides out along +x
    iso.box(sw.x - 4, sw.y + 3.5 + cs * 5, .4, 8, .5, 3.6, C.sw);   // +y skin slides out along +y
    iso.box(sw.x - 4, sw.y - 4, 4, 8, 8, .5, C.sw, { bias: .1 });   // lid
  }
  if (cs >= 1) iso.text3('NPCI', sw.x - 3.6, sw.y - 3.7, 4.0, { plane: 'xz', size: 1.4, tri: C.sw, face: PAL.paper, extrude: .25 });
  // —— banks + coin stacks ——
  const youCoins = 5 - (t > T.debit + .3 ? 1 : 0), shopCoins = 3 + (t > T.credit + .3 ? 1 : 0);
  bank(S.yb.x, S.yb.y, C.you, 'YOUR BANK'); coinStack(S.yb.x - 1, S.yb.y + 5.3, youCoins, C.gold);
  bank(S.sb.x, S.sb.y, C.shop, "SHOP'S BANK"); coinStack(S.sb.x + 4.8, S.sb.y + .3, shopCoins, C.gold);
  // —— chai stall (the payee) ——
  const sp = S.shop;
  iso.box(sp.x - 2, sp.y - 1.2, 0, 4, 2.4, 1.6, C.shop);
  iso.box(sp.x - 2.4, sp.y - 1.6, 3.6, 4.8, 3.2, .25, tri('#E86F56'));
  for (const [dx, dy] of [[-2.2, -1.4], [2.0, -1.4], [-2.2, 1.2], [2.0, 1.2]]) iso.box(sp.x + dx, sp.y + dy, 1.6, .2, .2, 2, PAL.soil);
  iso.cyl(sp.x - .8, sp.y, 1.6, .45, .7, C.dark, { n: 12 });                   // kettle
  iso.box(sp.x + 1, sp.y + 1.25, 1.6, .9, .08, 1.1, C.white);                     // QR stand
  iso.bill(sp.x + .2, sp.y - 2.2, 0, (gx) => person(gx, { body: C.shop[1], h: 3.2, hat: 'cap', hatColor: '#D8A33A', arm: .4 }));
  iso.bill(sp.x + 2.8, sp.y + 2.6, 0, (gx) => person(gx, { body: C.you[1], h: 3.4, hair: '#2a2020', arm: -1.4, face: -1 }));
  iso.flush();
  iso.desat = 0;

  // —— QR + phone hero moment (opening close-up) ——
  if (t < T.pull0 + .6) {
    const a = 1 - seg(t, T.pull0, T.pull0 + .6), [qx, qy] = iso.P(sp.x + 1.45, sp.y + 1.3, 2.2);
    g.save(); g.globalAlpha = a;
    // QR pattern on the stand
    g.fillStyle = '#fff'; g.fillRect(qx - 26, qy - 30, 52, 52); g.fillStyle = PAL.ink;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if ((r * 7 + c) * 37 % 5 < 2 || (r < 2 && c < 2) || (r > 4 && c < 2) || (r < 2 && c > 4)) g.fillRect(qx - 23 + c * 7, qy - 27 + r * 7, 6, 6);
    g.restore();
    // the phone in the customer's hand (screen-space hero, three-tone)
    const ph = iso.P(sp.x + 2.8, sp.y + 2.6, 2.9), s = 170 * back(seg(t, .2, .9), 1.6) * a;
    if (s > 2) {
      g.save(); g.translate(ph[0] - 60, ph[1] - 130);
      g.fillStyle = C.dark[2]; g.beginPath(); g.roundRect(-s * .3 + 10, -s * .55 + 10, s * .6, s * 1.1, 18); g.fill();
      g.fillStyle = C.dark[1]; g.beginPath(); g.roundRect(-s * .3, -s * .55, s * .6, s * 1.1, 18); g.fill();
      g.fillStyle = '#F4F8FC'; g.fillRect(-s * .25, -s * .46, s * .5, s * .9);
      const st = t < T.pinT ? 0 : t < T.paid ? 1 : 2;
      g.textAlign = 'center'; g.fillStyle = PAL.ink;
      if (st === 0) { const sc = seg(t, T.scan, T.pinT); g.strokeStyle = C.pay[1]; g.lineWidth = 4; g.strokeRect(-s * .17, -s * .25, s * .34, s * .34); g.fillStyle = C.pay[1]; g.fillRect(-s * .17, -s * .25 + s * .34 * sc, s * .34, 3); g.fillStyle = PAL.ink; g.font = `600 ${s * .07}px ${FONT}`; g.fillText('SCAN', 0, s * .25); }
      else if (st === 1) { g.font = `600 ${s * .075}px ${FONT}`; g.fillText('UPI PIN', 0, -s * .2); const n = Math.min(6, Math.floor(seg(t, T.pinT, T.paid - .25) * 6.99)); for (let d = 0; d < 6; d++) { g.beginPath(); g.arc(-s * .15 + d * s * .06, -s * .05, s * .022, 0, TAU); g.fillStyle = d < n ? PAL.ink : '#C9C2B6'; g.fill(); } }
      else { check(g, 0, -s * .08, s * .13, seg(t, T.paid, T.paid + .4)); g.fillStyle = OK; g.font = `600 ${s * .08}px ${FONT}`; g.fillText('PAID ₹20', 0, s * .2); }
      g.restore();
    }
    // "where did the money go?" question title
    const qa = seg(t, T.ask, T.ask + .4) * (1 - seg(t, T.pull0 - .1, T.pull0 + .3));
    if (qa > 0) { haloText(g, 'WHERE DID', W / 2, 330, { font: `600 70px ${FONT}`, align: 'center', track: 8 }); haloText(g, 'THE MONEY GO?', W / 2, 410, { font: `600 70px ${FONT}`, align: 'center', track: 8, color: C.pay[1] }); }
  }

  // —— routes + packet ——
  const ride = (pts, t0, d) => route(pts, t0, d);
  let pk = null;
  pk = ride(R1, T.r1 + .2, 1.6) || pk;
  pk = ride(R2, T.r2, 2.2) || pk;
  pk = ride(R3, T.r3 + .3, 1.6) || pk;
  if (t > T.r4 - .8) { const p = route([...R3].reverse(), T.r4 - .6, .9); pk = p || pk; }
  pk = ride(R4, T.r4 + .3, 1.6) || pk;
  if (t > T.ok1 - .6) { route(R5, T.ok1 - .5, .8); route([...R2].reverse().concat([...R1].reverse().slice(1)), T.ok1 - .5, 1.0); }
  // packet waiting inside the switch while it's cut open, then at banks
  let atSw = t > T.r2 + 2.2 && t < T.r3 + .3, atYb = t > T.r3 + 1.9 && t < T.r4 - .6;
  const lockOpen = seg(t, T.lock, T.lock + .4);
  if (pk) { const [x, y] = P(pk, 1.2); envelope(g, x, y - 20, 34, 0); ring(g, x, y - 20, 46, 1, t, null); }
  else if (atSw) { const [x, y] = P(J.sw, 2.4); envelope(g, x, y - 20, 34, 0); ring(g, x, y - 20, 46, 1, t, 'YOUR REQUEST', { ang: -1.1 }); }
  else if (atYb) { const [x, y] = P(J.yb, 1.2); envelope(g, x, y - 20, 34, lockOpen); ring(g, x, y - 20, 46, 1, t, null); }

  // —— pins ——
  const pa = (t0) => seg(t, t0, t0 + 1.1) * (1 - seg(t, T.big0 + .4, T.big0 + 1));
  pin(iso, S.app.x + 2, S.app.y - 2.4, 8, { title: 'YOUR APP', num: '+ PARTNER BANK', ns: 30, dir: -1, up: 110, len: 40, a: pa(T.appPin - .4) });
  pin(iso, sw.x + 3, sw.y - 4, 4.3, { title: 'NPCI · UPI SWITCH', num: '100s of banks', ns: 30, dir: -1, up: 190, len: 40, a: pa(T.swPin - .5) });
  if (cut > 0 && cut < 1) { const c3 = [iso.P(sw.x + 4, sw.y - 4, 4.5), iso.P(sw.x + 4, sw.y + 4, 4.5), iso.P(sw.x - 4, sw.y + 4, 4.5)]; cutLine(g, c3, seg(t, T.cut - .1, T.cut + .3)); }
  if (cs >= 1) { const h1 = [iso.P(sw.x + 3.5, sw.y - 4, .4), iso.P(sw.x + 4, sw.y - 4, .4), iso.P(sw.x + 4, sw.y + 4, .4), iso.P(sw.x + 3.5, sw.y + 3.5, .4)]; g.save(); g.globalAlpha = seg(t, T.cut + .55, T.cut + .9); hatch(g, h1); g.restore(); }
  // PIN / balance checklist inset at your bank
  const ia = seg(t, T.lock - .5, T.lock + .3) * (1 - seg(t, T.debit + 1.2, T.debit + 1.7));
  if (ia > 0) {
    const [ax, ay] = iso.P(S.yb.x - 1, S.yb.y - 2, 5);
    inset(iso, ax, ay, ax - 250, ay - 260, 150, ia, (gx, cx, cy, r) => {
      envelope(gx, cx - 70, cy - 40, 60, lockOpen);
      gx.font = `600 34px ${FONT}`; gx.textAlign = 'left'; gx.fillStyle = PAL.ink;
      gx.fillText('PIN', cx - 10, cy - 40); check(gx, cx + 95, cy - 52, 22, seg(t, T.pinOk, T.pinOk + .35));
      gx.fillText('BALANCE', cx - 105, cy + 50); check(gx, cx + 95, cy + 38, 22, seg(t, T.balOk, T.balOk + .35));
    });
  }
  // debit / credit tags
  const tag = (x, y, z, txt, col, t0) => { const a = seg(t, t0, t0 + .35) * (1 - seg(t, T.ok1 + .5, T.ok1 + 1)); if (a <= 0) return; const [sx, sy] = iso.P(x, y, z); g.save(); g.globalAlpha = a; haloText(g, txt, sx, sy - 30 * eo(a), { font: `600 48px ${FONT}`, align: 'center', color: col, track: 1 }); g.restore(); };
  tag(S.yb.x - 1, S.yb.y + 5.3, 2.6, '−₹20', C.pay[1], T.debit);
  tag(S.sb.x + 4.8, S.sb.y + .3, 2.3, '+₹20', OK, T.credit);
  // confirmations
  const okA = (t0) => seg(t, t0, t0 + .4) * (1 - seg(t, T.big0 + .3, T.big0 + .8));
  { const [x, y] = iso.P(S.you.x + 1.8, S.you.y + .8, 4.6); check(g, x, y - 20, 30, okA(T.ok1)); }
  { const [x, y] = iso.P(sp.x + .2, sp.y - 2.2, 4.4); check(g, x, y - 20, 30, okA(T.ok2)); }
  g.restore();   // end board lift

  // —— scale reveal: Isotype grid (1 phone = 100 million payments) ——
  const ga = seg(t, T.big0 + 1.6, T.big0 + 2.2) * (1 - seg(t, T.end - .2, T.end + .4));
  if (ga > 0) {
    g.save(); g.globalAlpha = ga;
    const n = 241, cols = 22, gap = 42, gx0 = (W - cols * gap) / 2, gy0 = 1050;
    const fill = n * eio(seg(t, T.fill, T.fillEnd));
    const dayK = seg(t, T.day - .1, T.day + .5);
    iconGrid(g, gx0, gy0, n, fill, cols, gap, (gx, x, y, s, lit, i) => phoneIcon(gx, x, y, s, lit && (dayK < .5 || i < 8)));
    const shown = Math.round(24.07 * clamp(fill / 241) * 100) / 100;
    haloText(g, dayK < .5 ? `${shown.toFixed(2)} BILLION` : '≈ 800 MILLION', W / 2, 935, { font: `400 92px ${FONT}`, align: 'center' });
    haloText(g, dayK < .5 ? 'UPI PAYMENTS · SEPTEMBER 2026' : 'UPI PAYMENTS · EVERY DAY', W / 2, 990, { font: `600 30px ${FONT}`, align: 'center', track: 4 });
    phoneIcon(g, gx0 + 20, gy0 + 11 * gap + 26, 40, 1); haloText(g, '= 100 MILLION PAYMENTS', gx0 + 50, gy0 + 11 * gap + 38, { font: `600 26px ${FONT}`, track: 3 });
    g.restore();
  }
  // —— end frame: the legend ——
  const ea = seg(t, T.end, T.end + .6);
  if (ea > 0) {
    g.save(); g.globalAlpha = ea;
    haloText(g, 'HOW A UPI', W / 2, 1080, { font: `600 84px ${FONT}`, align: 'center', track: 10 });
    haloText(g, 'PAYMENT WORKS', W / 2, 1175, { font: `600 84px ${FONT}`, align: 'center', track: 10, color: C.pay[1] });
    const items = [[C.pay, 'YOUR PAYMENT REQUEST'], [C.app, 'YOUR APP + PARTNER BANK'], [C.sw, 'NPCI UPI SWITCH'], [C.you, 'YOUR BANK: PIN, BALANCE, DEBIT'], [C.shop, "SHOP'S BANK: CREDIT"]];
    items.forEach(([c, s], k) => { const y = 1270 + k * 62, a = seg(t, T.end + .3 + k * .18, T.end + .7 + k * .18); if (a <= 0) return; g.save(); g.globalAlpha = ea * a; chip(g, 190, y - 10, 34, c); haloText(g, s, 230, y, { font: `600 32px ${FONT}`, track: 3 }); g.restore(); });
    haloText(g, 'LAUNCHED APRIL 2016 · OPERATED BY NPCI', W / 2, 1640, { font: `500 26px ${FONT}`, align: 'center', track: 3 });
    haloText(g, 'DATA: NPCI, SEPT 2026 · NOT TO SCALE', W / 2, 1680, { font: `500 26px ${FONT}`, align: 'center', track: 3, color: '#7A6E66' });
    g.restore();
  }
  // —— subtitle: map-label card, words light as they are spoken ——
  subtitle();
  // fade
  const f = clamp(t / .4) * clamp((DUR - t) / .8);
  if (f < 1) { g.fillStyle = `rgba(242,230,208,${1 - f})`; g.fillRect(0, 0, W, H); }
}

function subtitle() {
  const ln = TL.find(l => t >= l.t0 - .25 && t < l.t0 + l.dur + .5);
  if (!ln) return;
  const a = seg(t, ln.t0 - .25, ln.t0) * (1 - seg(t, ln.t0 + ln.dur + .25, ln.t0 + ln.dur + .5));
  g.save(); g.font = `500 40px ${FONT}`;
  // wrap into lines within 860 px
  const words = ln.words, lines = [[]]; let w = 0; const sp = g.measureText(' ').width;
  for (const wd of words) { const ww = g.measureText(wd.w).width; if (w + ww > 860 && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(wd); w += ww + sp; }
  const lh = 54, bh = lines.length * lh + 44, bw = 960, x0 = (W - bw) / 2, y0 = H - 120 - bh;
  g.globalAlpha = a;
  g.fillStyle = 'rgba(46,37,34,.14)'; g.beginPath(); g.roundRect(x0 + 6, y0 + 8, bw, bh, 14); g.fill();
  g.fillStyle = PAL.paper; g.beginPath(); g.roundRect(x0, y0, bw, bh, 14); g.fill();
  // border draws first
  const ba = seg(t, ln.t0 - .25, ln.t0 + .1); g.strokeStyle = PAL.ink; g.lineWidth = 2.5; g.setLineDash([ (2 * (bw + bh)) * ba, 9999 ]); g.beginPath(); g.roundRect(x0, y0, bw, bh, 14); g.stroke(); g.setLineDash([]);
  chip(g, x0 + 36, y0 + 34, 26, C.pay);
  g.textBaseline = 'alphabetic';
  lines.forEach((row, r) => {
    let x = x0 + 70; const y = y0 + 22 + (r + 1) * lh - 12;
    for (const wd of row) {
      const said = t >= wd.t - .03;
      g.fillStyle = said ? PAL.ink : 'rgba(46,37,34,.32)';
      g.fillText(wd.w, x, y); x += g.measureText(wd.w).width + sp;
    }
  });
  g.restore();
}

window.DUR = DUR;
window.render = draw;
draw(0);
window.READY = true;
