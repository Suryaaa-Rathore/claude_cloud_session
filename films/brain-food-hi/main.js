// What should your brain eat? Data Storytelling, 1080x1920, deterministic render(t).
import * as E from './engine.js';
const { P } = E;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const TL = await (await fetch('timeline.json')).json();
for (const f of ['400 40px Kalam', '700 40px Kalam', '400 40px NotoSerifDeva', '400 20px NotoSansDeva', '400 20px "IBM Plex Mono"']) await document.fonts.load(f, 'अआ abc 123');
const LN = Object.fromEntries(TL.map(l => [l.id, l]));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u;
const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
const nrm = s => s.toLowerCase().replace(/[.,?:!।—]+$/, '');
const wt = (id, w, nth = 0) => { let k = 0; for (const x of LN[id].words) if (nrm(x.w).startsWith(w)) { if (k === nth) return x.t; k++; } throw new Error('word ' + w + ' in ' + id); };
const DUR = 91;


// —— food pictures: Fluent 3D (MIT) for spinach / egg / blueberries; walnut & salmon drawn here in the same soft 3D look ——
const loadImg = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
const IMG = { spinach: await loadImg('img/leafy_green.png'), egg: await loadImg('img/egg.png'), blueberries: await loadImg('img/blueberries.png') };
function paintCanvas(fn) { const c = new OffscreenCanvas(256, 256), q = c.getContext('2d'); fn(q); return c; }
IMG.walnut = paintCanvas(q => {
  const shell = (cx, cy, rx, ry, rot) => {
    q.save(); q.translate(cx, cy); q.rotate(rot);
    q.fillStyle = 'rgba(60,35,15,.25)'; q.beginPath(); q.ellipse(6, 10, rx, ry, 0, 0, 7); q.fill();
    let gr = q.createRadialGradient(-rx * .35, -ry * .4, 4, 0, 0, rx * 1.1); gr.addColorStop(0, '#d9a36a'); gr.addColorStop(.6, '#a8693a'); gr.addColorStop(1, '#6e4020');
    q.fillStyle = gr; q.beginPath(); q.ellipse(0, 0, rx, ry, 0, 0, 7); q.fill();
    // inner kernel: two brain-like lobes
    gr = q.createRadialGradient(-rx * .2, -ry * .3, 2, 0, 0, rx * .8); gr.addColorStop(0, '#f4dcb2'); gr.addColorStop(1, '#c9955c');
    q.fillStyle = gr; q.beginPath(); q.ellipse(0, 0, rx * .8, ry * .78, 0, 0, 7); q.fill();
    q.strokeStyle = '#8a5a30'; q.lineWidth = 3; q.lineCap = 'round';
    q.beginPath(); q.moveTo(0, -ry * .78); q.lineTo(0, ry * .78); q.stroke();
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { q.beginPath(); const y = -ry * .55 + k * ry * .36; q.moveTo(s * rx * .08, y); q.bezierCurveTo(s * rx * .35, y - 10, s * rx * .45, y + 14, s * rx * .7, y + 4); q.stroke(); }
    q.restore();
  };
  shell(120, 130, 92, 78, -.2);
});
IMG.salmon = paintCanvas(q => {
  q.save(); q.translate(128, 132); q.rotate(-.12);
  q.fillStyle = 'rgba(80,30,20,.22)'; q.beginPath(); q.roundRect(-96, -48, 200, 116, 34); q.fill();
  q.fillStyle = '#b8c0c8'; q.beginPath(); q.roundRect(-104, -52, 208, 108, 34); q.fill();          // silver skin edge
  const gr = q.createLinearGradient(0, -60, 0, 60); gr.addColorStop(0, '#ffb08a'); gr.addColorStop(.55, '#f47b4f'); gr.addColorStop(1, '#d9573a');
  q.fillStyle = gr; q.beginPath(); q.roundRect(-104, -60, 208, 104, 32); q.fill();
  q.strokeStyle = 'rgba(255,240,228,.85)'; q.lineWidth = 6; q.lineCap = 'round';
  for (let k = -3; k <= 3; k++) { q.beginPath(); q.moveTo(-60 + k * 28, -52); q.quadraticCurveTo(-30 + k * 28, -6, -64 + k * 28, 38); q.stroke(); }
  q.fillStyle = 'rgba(255,255,255,.35)'; q.beginPath(); q.ellipse(-30, -38, 50, 10, -.1, 0, 7); q.fill();
  q.restore();
});
// a photo card taped onto the paper (world space); pops in with a little settle
function card(im, x, y, s, rot, t0, o = {}) {
  const k = seg(t, t0, t0 + .45); if (k <= 0) return;
  const pop = 1 + .12 * Math.sin(k * Math.PI) * (1 - k);
  g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(rot * (2 - k)); g.scale(pop, pop); g.globalAlpha *= Math.min(1, k * 2);
  g.fillStyle = 'rgba(60,45,30,.18)'; g.fillRect(-s / 2 + 8, -s / 2 + 12, s, s);
  g.fillStyle = '#fffdf8'; g.fillRect(-s / 2, -s / 2, s, s);
  g.drawImage(im, -s / 2 + s * .08, -s / 2 + s * .08, s * .84, s * .84);
  g.strokeStyle = 'rgba(43,39,35,.25)'; g.lineWidth = 1; g.strokeRect(-s / 2, -s / 2, s, s);
  if (o.tape !== false) { g.rotate(-.18); g.fillStyle = 'rgba(232,220,180,.75)'; g.fillRect(-s * .22, -s / 2 - 16, s * .44, 30); }
  g.restore();
}

// —— sheet layout (world = px at zoom 1): one long vertical sheet, a section per food ——
const SEC = [0, 1100, 2200, 3300, 4400];
const X0 = 90, X1 = 990;                       // plot x-range
const T = {
  q: .3,
  s1: LN.v2.t0, sp145: wt('v2', '145'), sp121: wt('v2', '121%'), spStudy: wt('v2', 'स्टडी'), sp11: wt('v2', '11'),
  s2: LN.v3.t0, eg147: wt('v3', '147'), egQuarter: wt('v3', 'चौथाई'), egAch: wt('v3', 'एसिटाइलकोलीन'),
  s3: LN.v4.t0, w257: wt('v4', '2.57'), s18: wt('v4', '1.8'), ala: wt('v4', 'ala'), less: wt('v4', 'कम'), dha: wt('v4', 'dha'), cortex: wt('v4', '15'), salmon: wt('v4', 'सैल्मन', 1), s124: wt('v4', '1.24'),
  s4: LN.v5.t0, bb120: wt('v5', '120'), bbStudied: wt('v5', 'उम्मीद'),
  s5: LN.v6.t0, cure: wt('v6', 'इलाज'),
};

// —— camera: glide down the sheet, pull back at the end ——
function camAt(t) {
  const K = [[0, 540, 760, 1], [T.s1 - .9, 540, 760, 1], [T.s1 - .1, 540, SEC[1] + 650, 1], [T.s2 - .9, 540, SEC[1] + 650, 1], [T.s2 - .1, 540, SEC[2] + 650, 1],
    [T.s3 - .9, 540, SEC[2] + 650, 1], [T.s3 - .1, 540, SEC[3] + 650, 1], [T.s4 - .9, 540, SEC[3] + 650, 1], [T.s4 - .1, 540, SEC[4] + 650, 1],
    [T.s5 - .6, 540, SEC[4] + 650, 1], [T.s5 + 1.8, 540, 3000, .345], [DUR, 540, 3000, .345]];
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], u = eio(seg(t, a[0], b[0]));
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), zoom: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)), roll: 0 };
}

// —— building blocks ——
const PEN = [];   // pencil waypoints registered while drawing: [t0, t1, [x,y] start, [x,y] end, lead]
let t = 0;
function hand(text, x, y, t0, dur, o = {}) {
  const p = seg(t, t0, t0 + dur); PEN.push([t0, t0 + dur, [x, y - 10], [x + E.measureHand(g, text, o.size || 30, 400, 'Kalam'), y - 10], o.color === P.red ? 1 : 0]);
  if (p > 0) E.handText(g, text, x, y, { progress: p, zoom: cam.zoom, font: 'Kalam', weight: 400, ...o });
}
function head(title, sub, y0, t0) {
  E.setType(g, title, X0, y0 + 120, { size: 64, font: 'NotoSerifDeva', color: P.ink, progress: seg(t, t0, t0 + .7) });
  E.setType(g, sub, X0, y0 + 172, { size: 24, font: 'NotoSansDeva', color: P.inkSoft, progress: seg(t, t0 + .3, t0 + 1) });
}
function axis(y, max, ticks, unit, t0, maxFrom = null, ratchet = null) {
  const p = seg(t, t0, t0 + .6); if (p <= 0) return v => X0;
  let M = max;
  if (maxFrom !== null && ratchet) { const k = seg(t, ratchet, ratchet + .5); M = lerp(maxFrom, max, Math.floor(k * 5) / 5 * .6 + eo(k) * .4); if (t < ratchet) M = maxFrom; }
  const sx = v => X0 + (X1 - X0) * v / M;
  E.pencilStroke(g, [[X0, y], [X1, y]], { color: P.ink, width: 2, progress: p, seed: y });
  PEN.push([t0, t0 + .6, [X0, y], [X1, y], 0]);
  for (const v of ticks) { if (v > M + 1e-6) continue; const x = sx(v); E.inkLine(g, [[x, y], [x, y + 10]], { width: 1.5, alpha: p }); E.setType(g, `${v}${unit}`, x, y + 40, { size: 20, align: 'center', alpha: p }); }
  return sx;
}
function bar(y, h, v0, v1, sx, t0, dur, value, o = {}) {
  const k = eo(seg(t, t0, t0 + dur)); if (k <= 0) return null;
  const x1 = sx(lerp(v0, v1, k)), path = [[X0, y - h / 2], [x1, y - h / 2], [x1, y + h / 2], [X0, y + h / 2]];
  E.inkShape(g, path, { value, fill: o.fill, hatch: .45, progress: 1, seed: y | 0 });
  PEN.push([t0, t0 + dur, [X0, y], [sx(v1), y], 0]);
  return x1;
}
function note(text, x, y, t0, o = {}) { const sz = (o.size || 38) * 1.3; hand(text, x, y, t0, Math.max(.6, text.length * .045), { color: o.color || P.blue, ...o, size: sz }); }
function ring(x, y, r, t0, color = P.blue) { const p = seg(t, t0, t0 + .5); if (p > 0) E.pencilStroke(g, E.ringPath(x, y, r, x), { color, width: 1.8, progress: p, passes: 1 }); PEN.push([t0, t0 + .5, [x - r, y], [x - r * .8, y - r * .5], color === P.red ? 1 : 0]); }

let cam;
function draw(tt) {
  t = tt; PEN.length = 0; cam = camAt(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  E.drawPaper(g, cam, { dots: .8 });
  E.applyCam(g, cam);

  // —— the question ——
  {
    const y0 = SEC[0];
    hand('दिमाग को', X0, y0 + 370, .5, 1.3, { size: 120, color: P.ink });
    hand('क्या खिलाएँ?', X0, y0 + 515, 1.7, 1.5, { size: 120, color: P.ink });
    E.setType(g, '5 चीज़ें · हर एक की 1 सर्विंग · असली आँकड़े', X0, y0 + 625, { size: 28, font: 'NotoSansDeva', color: P.inkSoft, progress: seg(t, 3.6, 4.6) });
    E.dashedCell(g, X0 - 20, y0 + 665, X1 + 20, y0 + 870, { progress: seg(t, 4.2, 5.6), color: P.inkSoft });
    ['spinach', 'egg', 'walnut', 'salmon', 'blueberries'].forEach((k, i) => card(IMG[k], X0 + 10 + i * 178, y0 + 685, 165, (i % 2 ? 1 : -1) * .05, 5.2 + i * .35, { tape: false }));
  }
  // —— 1. spinach: vitamin K, % of daily value; the bar breaks the 100 % frame ——
  {
    const y0 = SEC[1], yb = y0 + 330;
    head('पालक', '1 कप, कच्ची · विटामिन K · दैनिक ज़रूरत का % (120 mcg)', y0, T.s1 - .2); card(IMG.spinach, X1 - 250, y0 - 210, 250, .06, T.s1 - .4);
    const sx = axis(yb + 90, 150, [0, 50, 100, 150], '%', T.s1 + .6, 100, T.sp121 - .2);
    if (t > T.s1 + .8) { const x = sx(100); E.pencilStroke(g, [[x, yb - 110], [x, yb + 80]], { color: P.red, width: 1.6, progress: seg(t, T.s1 + .8, T.s1 + 1.3), wobble: .3, passes: 1 }); E.setType(g, 'दिन की ज़रूरत', x - 8, yb - 120, { size: 24, font: 'NotoSansDeva', color: P.red, align: 'right', progress: seg(t, T.s1 + 1, T.s1 + 1.6) }); }
    const x1 = bar(yb, 130, 0, 121, sx, T.sp145 - .1, 1.6, 1.1);
    if (x1 && t > T.sp145 + .4) E.setType(g, '145 mcg', X0 + 14, yb + 12, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.sp145 + .4, T.sp145 + .9) });
    if (x1 && t > T.sp121) { note('121%', Math.min(x1 + 14, 860), yb - 60, T.sp121, { color: P.red, size: 52 }); }
    note('960 बुज़ुर्ग, रोज़ ~1 सर्विंग:', X0, yb + 250, T.spStudy, { size: 36 });
    note('याददाश्त ऐसे घटी, जैसे', X0, yb + 320, T.spStudy + 2.0, { size: 36 });
    note('11 साल छोटे हों', X0, yb + 400, T.sp11 - .1, { size: 54, color: P.red });
    E.setType(g, 'मॉरिस व अन्य, Neurology 2018 · संबंध, सबूत नहीं', X0, yb + 470, { size: 22, font: 'NotoSansDeva', progress: seg(t, T.sp11 + .5, T.sp11 + 1.4) });
  }
  // —— 2. egg: choline ——
  {
    const y0 = SEC[2], yb = y0 + 330;
    head('अंडा', '1 बड़ा · कोलीन · दैनिक ज़रूरत का % (550 mg)', y0, T.s2 - .2); card(IMG.egg, X1 - 250, y0 - 210, 250, -.05, T.s2 - .4);
    const sx = axis(yb + 90, 100, [0, 25, 50, 75, 100], '%', T.s2 + .5);
    const x1 = bar(yb, 130, 0, 27, sx, T.eg147 - .1, 1.0, .5);
    if (x1 && t > T.eg147 + .3) { E.setType(g, '147 mg', x1 + 16, yb + 12, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.eg147 + .3, T.eg147 + .8) }); }
    if (t > T.egQuarter) note('27%, लगभग एक चौथाई', X0 + 330, yb - 60, T.egQuarter, { size: 40 });
    note('कोलीन  →  एसिटाइलकोलीन', X0, yb + 260, T.egAch - .3, { size: 46 });
    note('याददाश्त का एक संदेशवाहक', X0, yb + 340, T.egAch + .8, { size: 38 });
  }
  // —— 3. omega-3: walnuts win by weight… then the headline is revised to DHA ——
  {
    const y0 = SEC[3], ya = y0 + 300, ys = y0 + 470;
    const rev = T.dha - .1, struck = seg(t, rev, rev + .5);
    E.setType(g, 'ओमेगा-3', X0, y0 + 120, { size: 64, font: 'NotoSerifDeva', color: struck > 0 ? P.inkSoft : P.ink, progress: seg(t, T.s3 - .2, T.s3 + .5) }); card(IMG.walnut, X1 - 430, y0 - 200, 210, -.06, T.s3 - .4); card(IMG.salmon, X1 - 220, y0 - 220, 230, .05, T.s3 - .1);
    if (struck > 0) { E.pencilStroke(g, [[X0 - 6, y0 + 100], [X0 + 236, y0 + 96]], { color: P.red, width: 4, progress: struck, passes: 2 }); PEN.push([rev, rev + .5, [X0, y0 + 100], [X0 + 236, y0 + 96], 1]); hand('DHA', X0 + 270, y0 + 124, rev + .5, .6, { size: 72, color: P.red }); }
    E.setType(g, struck > 0 ? 'प्रति सर्विंग DHA (ग्राम)' : 'प्रति सर्विंग ओमेगा-3 (ग्राम)', X0, y0 + 172, { size: 24, font: 'NotoSansDeva', progress: seg(t, T.s3 + .2, T.s3 + 1) });
    const sx = axis(ys + 110, 3, [0, 1, 2, 3], ' g', T.s3 + .6);
    // walnuts: 2.57 g ALA → < 0.026 g DHA
    const mw = seg(t, T.less + .4, T.less + 1.4);
    const wv = lerp(2.57, .026, eo(mw));
    let xw = null; if (t > T.w257 - .1) { g.save(); g.globalAlpha *= 1 - .8 * eo(mw); xw = bar(ya, 110, 0, 2.57, sx, T.w257 - .1, 1.0, .9); g.restore(); if (mw > 0) { const x1 = sx(wv); E.inkShape(g, [[X0, ya - 55], [x1, ya - 55], [x1, ya + 55], [X0, ya + 55]], { value: .9, hatch: .45 }); } }
    E.setType(g, 'अखरोट · 28 ग्राम (1 oz)', X0, ya - 64, { size: 24, font: 'NotoSansDeva', progress: seg(t, T.w257 - .2, T.w257 + .3) });
    if (t > T.w257 + .3) E.setType(g, mw > .5 ? '< 0.03 g' : '2.57 g', mw > .5 ? X0 + 30 : sx(2.57) + 14, ya + 12, { size: 30, font: 'Newsreader', color: mw > .5 ? P.red : P.ink });
    // salmon: 1.83 g EPA+DHA → 1.24 g DHA
    const ms = seg(t, T.s124 - .2, T.s124 + .6), sv = lerp(1.83, 1.24, eo(ms));
    if (t > T.s18 - .1) { bar(ys, 110, 0, 1.83, sx, T.s18 - .1, 1.0, .75); if (ms > 0) { const x1 = sx(sv); g.save(); if (t > T.s124 + .8) E.setType(g, 'EPA', sx(1.83) - 60, ys - 62, { size: 18 }); E.inkShape(g, [[X0, ys - 55], [x1, ys - 55], [x1, ys + 55], [X0, ys + 55]], { value: 1.25, hatch: .45 }); g.restore(); } }
    E.setType(g, 'सैल्मन · 85 ग्राम (3 oz)', X0, ys - 64, { size: 24, font: 'NotoSansDeva', progress: seg(t, T.s18 - .2, T.s18 + .3) });
    if (t > T.s18 + .3) E.setType(g, ms > .5 ? '1.24 g DHA' : '1.83 g', sx(1.83) + 14, ys + 12, { size: 30, font: 'Newsreader', color: ms > .5 ? P.red : P.ink });
    if (t > T.s18 + .8 && t < rev) note('वज़न में अखरोट आगे', X0 + 420, ya + 100, T.s18 + .8, { size: 36 });
    note('ALA का < 1% ही DHA बनता है', X0, ys + 230, T.less, { size: 40, color: P.red });
    note('फ्रंटल कॉर्टेक्स की चर्बी में', X0, ys + 305, T.cortex, { size: 38 });
    note('≈ 15–20% DHA', X0, ys + 370, T.cortex + 1.1, { size: 38 });
    if (ms > .6) ring(sx(1.83) + 110, ys + 2, 105, T.s124 + .3, P.red);
  }
  // —— 4. blueberries: a range, not a point ——
  {
    const y0 = SEC[4], yb = y0 + 330;
    head('ब्लूबेरी', 'एंथोसायनिन · mg प्रति 100 ग्राम', y0, T.s4 - .2); card(IMG.blueberries, X1 - 250, y0 - 210, 250, .05, T.s4 - .4);
    const sx = axis(yb + 90, 600, [0, 100, 200, 300, 400, 500, 600], '', T.s4 + .5);
    // varies by variety: 71–534 (whisker), typical 120–180 (dashed box)
    const wk = seg(t, T.bb120 + 1.2, T.bb120 + 2);
    if (wk > 0) { E.pencilStroke(g, [[sx(71), yb], [sx(lerp(71, 534, wk)), yb]], { color: P.inkSoft, width: 1.6, passes: 1 }); if (wk >= 1) { E.inkLine(g, [[sx(71), yb - 14], [sx(71), yb + 14]], { color: P.inkSoft, width: 1.6 }); E.inkLine(g, [[sx(534), yb - 14], [sx(534), yb + 14]], { color: P.inkSoft, width: 1.6 }); E.setType(g, 'किस्म के अनुसार: 71–534', sx(534), yb - 26, { size: 22, font: 'NotoSansDeva', align: 'right' }); } }
    if (t > T.bb120 - .1) { E.inkShape(g, [[sx(120), yb - 40], [sx(180), yb - 40], [sx(180), yb + 40], [sx(120), yb + 40]], { value: .85, hatch: .45, progress: seg(t, T.bb120 - .1, T.bb120 + .7) }); E.setType(g, '120–180 mg', sx(180) + 14, yb + 52, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.bb120 + .4, T.bb120 + 1) }); PEN.push([T.bb120 - .1, T.bb120 + .7, [sx(120), yb], [sx(180), yb], 0]); }
    note('याददाश्त के लिए उम्मीद भरा —', X0, yb + 250, T.bbStudied, { size: 44 });
    note('रिसर्च अभी जारी है', X0, yb + 330, T.bbStudied + 1.0, { size: 44, color: P.red });
    E.dashedCell(g, X0, yb + 380, X1, yb + 470, { progress: seg(t, T.bbStudied + 1.6, T.bbStudied + 2.6), color: P.inkSoft });
  }
  // —— 5. the plate: pull back, the five charts on one sheet ——
  {
    const y = 5250;
    hand('हरी सब्ज़ी · अंडा · मछली', X0 - 40, y, T.s5 + 1.6, 1.4, { size: 140, color: P.ink }); hand('अखरोट · बेरीज़', X0 - 40, y + 200, T.s5 + 3.0, 1.2, { size: 140, color: P.ink });
    hand('इलाज नहीं।', X0 - 40, y + 410, T.cure + .1, .9, { size: 140, color: P.red });
  }
  // —— pencil ——
  g.setTransform(1, 0, 0, 1, 0, 0);
  pencil();
  // —— caption ——
  captions();
  const f = clamp(t / .4) * clamp((DUR - t) / .8); if (f < 1) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(246,243,236,${1 - f})`; g.fillRect(0, 0, E.W, E.H); }
}

function pencil() {
  const ev = PEN.filter(e => e[1] > e[0]).sort((a, b) => a[0] - b[0]);
  if (!ev.length) return;
  let tip, lift = .9, lead = 0;
  const cur = ev.filter(e => t >= e[0] && t <= e[1]).pop();
  if (cur) { const u = seg(t, cur[0], cur[1]); tip = [lerp(cur[2][0], cur[3][0], u), lerp(cur[2][1], cur[3][1], u)]; lift = .05 + .08 * Math.abs(Math.sin(t * 20)); lead = cur[4]; }
  else {
    const prev = ev.filter(e => e[1] < t).pop(), next = ev.find(e => e[0] > t);
    if (prev && next) { const u = eio(seg(t, prev[1], next[0])); tip = [lerp(prev[3][0], next[2][0], u), lerp(prev[3][1], next[2][1], u)]; lift = .15 + Math.sin(u * Math.PI) * .7; lead = next[4]; }
    else if (prev) { tip = prev[3]; lift = .3 + seg(t, prev[1], prev[1] + 1) * .9; lead = prev[4]; }
    else { tip = next[2]; lift = .9; lead = next[4]; }
  }
  const s = E.w2s(cam, tip[0], tip[1]);
  const exitA = 1 - seg(t, DUR - 6, DUR - 4.5);
  E.drawPencil(g, { tip: s, s: .55 * Math.max(.6, cam.zoom), lift, flip: lead, alpha: exitA, ang: 1.05 });
}

function captions() {
  const ln = TL.find(l => t >= l.t0 - .15 && t < l.t0 + l.dur + .45); if (!ln) return;
  const cues = []; let cur = [];
  for (const w of ln.words) { cur.push(w); if (cur.length >= 12 || (/[.?:।]$/.test(w.w) && cur.length >= 4)) { cues.push(cur); cur = []; } }
  if (cur.length) cues.push(cur);
  cues.forEach((c, i) => {
    const t0 = c[0].t - .15, t1 = i + 1 < cues.length ? cues[i + 1][0].t - .2 : ln.t0 + ln.dur + .15;
    E.caption(g, c, t, { t0, t1, x: 70, y: 1790, size: 46, maxW: 940, font: 'NotoSerifDeva', kicker: ['', 'VITAMIN K · पालक', 'CHOLINE · अंडा', 'OMEGA-3 · अखरोट बनाम सैल्मन', 'ANTHOCYANINS · ब्लूबेरी', 'एक थाली'][TL.indexOf(ln)] });
  });
}

window.DUR = DUR; window.render = draw; draw(0); window.READY = true;
