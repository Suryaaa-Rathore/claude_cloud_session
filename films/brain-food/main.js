// What should your brain eat? Data Storytelling, 1080x1920, deterministic render(t).
import * as E from './engine.js';
const { P } = E;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const TL = await (await fetch('timeline.json')).json();
for (const f of ['500 40px Caveat', '400 40px Newsreader', '400 20px "IBM Plex Mono"']) await document.fonts.load(f);
const LN = Object.fromEntries(TL.map(l => [l.id, l]));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u;
const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
const nrm = s => s.toLowerCase().replace(/[^a-z0-9.%]/g, '');
const wt = (id, w, nth = 0) => { let k = 0; for (const x of LN[id].words) if (nrm(x.w).startsWith(w)) { if (k === nth) return x.t; k++; } throw new Error('word ' + w + ' in ' + id); };
const DUR = 83;

// —— sheet layout (world = px at zoom 1): one long vertical sheet, a section per food ——
const SEC = [0, 1100, 2200, 3300, 4400];
const X0 = 90, X1 = 990;                       // plot x-range
const T = {
  q: .3,
  s1: LN.v2.t0, sp145: wt('v2', '145'), sp121: wt('v2', '121%'), spStudy: wt('v2', 'study'), sp11: wt('v2', '11'),
  s2: LN.v3.t0, eg147: wt('v3', '147'), egQuarter: wt('v3', 'quarter'), egAch: wt('v3', 'acetylcholine'),
  s3: LN.v4.t0, w257: wt('v4', '2.57'), s18: wt('v4', '1.8.'), ala: wt('v4', 'ala'), less: wt('v4', 'less'), dha: wt('v4', 'dha'), cortex: wt('v4', '15'), salmon: wt('v4', 'salmon', 1), s124: wt('v4', '1.24'),
  s4: LN.v5.t0, bb120: wt('v5', '120'), bbStudied: wt('v5', 'promising'),
  s5: LN.v6.t0, cure: wt('v6', 'not'),
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
  const p = seg(t, t0, t0 + dur); PEN.push([t0, t0 + dur, [x, y - 10], [x + E.measureHand(g, text, o.size || 30) , y - 10], o.color === P.red ? 1 : 0]);
  if (p > 0) E.handText(g, text, x, y, { progress: p, zoom: cam.zoom, ...o });
}
function head(title, sub, y0, t0) {
  E.setType(g, title, X0, y0 + 120, { size: 60, font: 'Newsreader', color: P.ink, progress: seg(t, t0, t0 + .7) });
  E.setType(g, sub, X0, y0 + 168, { size: 21, color: P.inkSoft, progress: seg(t, t0 + .3, t0 + 1), track: 1 });
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
    hand('What should', X0, y0 + 420, .5, 1.3, { size: 120, color: P.ink });
    hand('your brain eat?', X0, y0 + 560, 1.7, 1.5, { size: 120, color: P.ink });
    E.setType(g, '5 FOODS · 1 SERVING EACH · REAL NUMBERS', X0, y0 + 680, { size: 22, color: P.inkSoft, progress: seg(t, 3.6, 4.6), track: 1 });
    E.dashedCell(g, X0, y0 + 760, X1, y0 + 1000, { progress: seg(t, 4.2, 5.6), color: P.inkSoft });
  }
  // —— 1. spinach: vitamin K, % of daily value; the bar breaks the 100 % frame ——
  {
    const y0 = SEC[1], yb = y0 + 330;
    head('Spinach', '1 CUP, RAW · VITAMIN K · % OF DAILY VALUE (120 MCG)', y0, T.s1 - .2);
    const sx = axis(yb + 90, 150, [0, 50, 100, 150], '%', T.s1 + .6, 100, T.sp121 - .2);
    if (t > T.s1 + .8) { const x = sx(100); E.pencilStroke(g, [[x, yb - 110], [x, yb + 80]], { color: P.red, width: 1.6, progress: seg(t, T.s1 + .8, T.s1 + 1.3), wobble: .3, passes: 1 }); E.setType(g, "A DAY'S VALUE", x - 8, yb - 120, { size: 18, color: P.red, align: 'right', progress: seg(t, T.s1 + 1, T.s1 + 1.6) }); }
    const x1 = bar(yb, 130, 0, 121, sx, T.sp145 - .1, 1.6, 1.1);
    if (x1 && t > T.sp145 + .4) E.setType(g, '145 mcg', X0 + 14, yb + 12, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.sp145 + .4, T.sp145 + .9) });
    if (x1 && t > T.sp121) { note('121%', Math.min(x1 + 14, 860), yb - 60, T.sp121, { color: P.red, size: 52 }); }
    note('960 older adults, ~1 serving a day:', X0, yb + 250, T.spStudy, { size: 36 });
    note('memory declined like someone', X0, yb + 310, T.spStudy + 2.0, { size: 36 });
    note('11 years younger', X0, yb + 380, T.sp11 - .1, { size: 54, color: P.red });
    E.setType(g, 'MORRIS ET AL., NEUROLOGY 2018 · ASSOCIATION, NOT PROOF', X0, yb + 440, { size: 18, progress: seg(t, T.sp11 + .5, T.sp11 + 1.4) });
  }
  // —— 2. egg: choline ——
  {
    const y0 = SEC[2], yb = y0 + 330;
    head('Egg', '1 LARGE · CHOLINE · % OF DAILY VALUE (550 MG)', y0, T.s2 - .2);
    const sx = axis(yb + 90, 100, [0, 25, 50, 75, 100], '%', T.s2 + .5);
    const x1 = bar(yb, 130, 0, 27, sx, T.eg147 - .1, 1.0, .5);
    if (x1 && t > T.eg147 + .3) { E.setType(g, '147 mg', x1 + 16, yb + 12, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.eg147 + .3, T.eg147 + .8) }); }
    if (t > T.egQuarter) note('27%, about a quarter', X0 + 330, yb - 60, T.egQuarter, { size: 40 });
    note('choline  →  acetylcholine', X0, yb + 260, T.egAch - .3, { size: 46 });
    note('a messenger your brain uses for memory', X0, yb + 330, T.egAch + .8, { size: 34 });
  }
  // —— 3. omega-3: walnuts win by weight… then the headline is revised to DHA ——
  {
    const y0 = SEC[3], ya = y0 + 300, ys = y0 + 470;
    const rev = T.dha - .1, struck = seg(t, rev, rev + .5);
    E.setType(g, 'Omega-3', X0, y0 + 120, { size: 60, font: 'Newsreader', color: struck > 0 ? P.inkSoft : P.ink, progress: seg(t, T.s3 - .2, T.s3 + .5) });
    if (struck > 0) { E.pencilStroke(g, [[X0 - 6, y0 + 100], [X0 + 236, y0 + 96]], { color: P.red, width: 4, progress: struck, passes: 2 }); PEN.push([rev, rev + .5, [X0, y0 + 100], [X0 + 236, y0 + 96], 1]); hand('DHA', X0 + 270, y0 + 124, rev + .5, .6, { size: 72, color: P.red }); }
    E.setType(g, struck > 0 ? 'GRAMS OF DHA PER SERVING' : 'GRAMS OF OMEGA-3 PER SERVING', X0, y0 + 168, { size: 21, progress: seg(t, T.s3 + .2, T.s3 + 1) });
    const sx = axis(ys + 110, 3, [0, 1, 2, 3], ' g', T.s3 + .6);
    // walnuts: 2.57 g ALA → < 0.026 g DHA
    const mw = seg(t, T.less + .4, T.less + 1.4);
    const wv = lerp(2.57, .026, eo(mw));
    let xw = null; if (t > T.w257 - .1) { g.save(); g.globalAlpha *= 1 - .8 * eo(mw); xw = bar(ya, 110, 0, 2.57, sx, T.w257 - .1, 1.0, .9); g.restore(); if (mw > 0) { const x1 = sx(wv); E.inkShape(g, [[X0, ya - 55], [x1, ya - 55], [x1, ya + 55], [X0, ya + 55]], { value: .9, hatch: .45 }); } }
    E.setType(g, 'WALNUTS · 1 OZ', X0, ya - 56, { size: 20, progress: seg(t, T.w257 - .2, T.w257 + .3) });
    if (t > T.w257 + .3) E.setType(g, mw > .5 ? '< 0.03 g' : '2.57 g', mw > .5 ? X0 + 30 : sx(2.57) + 14, ya + 12, { size: 30, font: 'Newsreader', color: mw > .5 ? P.red : P.ink });
    // salmon: 1.83 g EPA+DHA → 1.24 g DHA
    const ms = seg(t, T.s124 - .2, T.s124 + .6), sv = lerp(1.83, 1.24, eo(ms));
    if (t > T.s18 - .1) { bar(ys, 110, 0, 1.83, sx, T.s18 - .1, 1.0, .75); if (ms > 0) { const x1 = sx(sv); g.save(); if (t > T.s124 + .8) E.setType(g, 'EPA', sx(1.83) - 60, ys - 62, { size: 18 }); E.inkShape(g, [[X0, ys - 55], [x1, ys - 55], [x1, ys + 55], [X0, ys + 55]], { value: 1.25, hatch: .45 }); g.restore(); } }
    E.setType(g, 'SALMON · 3 OZ', X0, ys - 56, { size: 20, progress: seg(t, T.s18 - .2, T.s18 + .3) });
    if (t > T.s18 + .3) E.setType(g, ms > .5 ? '1.24 g DHA' : '1.83 g', sx(1.83) + 14, ys + 12, { size: 30, font: 'Newsreader', color: ms > .5 ? P.red : P.ink });
    if (t > T.s18 + .8 && t < rev) note('by weight, walnuts win', X0 + 380, ya + 90, T.s18 + .8, { size: 36 });
    note('< 1% of ALA becomes DHA', X0, ys + 230, T.less, { size: 40, color: P.red });
    note('DHA ≈ 15–20% of the fats in', X0, ys + 300, T.cortex, { size: 38 });
    note('your frontal cortex', X0, ys + 352, T.cortex + 1.1, { size: 38 });
    if (ms > .6) ring(sx(1.83) + 110, ys + 2, 105, T.s124 + .3, P.red);
  }
  // —— 4. blueberries: a range, not a point ——
  {
    const y0 = SEC[4], yb = y0 + 330;
    head('Blueberries', 'ANTHOCYANINS · MG PER 100 G', y0, T.s4 - .2);
    const sx = axis(yb + 90, 600, [0, 100, 200, 300, 400, 500, 600], '', T.s4 + .5);
    // varies by variety: 71–534 (whisker), typical 120–180 (dashed box)
    const wk = seg(t, T.bb120 + 1.2, T.bb120 + 2);
    if (wk > 0) { E.pencilStroke(g, [[sx(71), yb], [sx(lerp(71, 534, wk)), yb]], { color: P.inkSoft, width: 1.6, passes: 1 }); if (wk >= 1) { E.inkLine(g, [[sx(71), yb - 14], [sx(71), yb + 14]], { color: P.inkSoft, width: 1.6 }); E.inkLine(g, [[sx(534), yb - 14], [sx(534), yb + 14]], { color: P.inkSoft, width: 1.6 }); E.setType(g, 'BY VARIETY: 71–534', sx(534), yb - 26, { size: 18, align: 'right' }); } }
    if (t > T.bb120 - .1) { E.inkShape(g, [[sx(120), yb - 40], [sx(180), yb - 40], [sx(180), yb + 40], [sx(120), yb + 40]], { value: .85, hatch: .45, progress: seg(t, T.bb120 - .1, T.bb120 + .7) }); E.setType(g, '120–180 mg', sx(180) + 14, yb + 52, { size: 30, font: 'Newsreader', color: P.ink, progress: seg(t, T.bb120 + .4, T.bb120 + 1) }); PEN.push([T.bb120 - .1, T.bb120 + .7, [sx(120), yb], [sx(180), yb], 0]); }
    note('promising for memory —', X0, yb + 250, T.bbStudied, { size: 44 });
    note('still being studied', X0, yb + 316, T.bbStudied + 1.0, { size: 44, color: P.red });
    E.dashedCell(g, X0, yb + 380, X1, yb + 470, { progress: seg(t, T.bbStudied + 1.6, T.bbStudied + 2.6), color: P.inkSoft });
  }
  // —— 5. the plate: pull back, the five charts on one sheet ——
  {
    const y = 5250;
    hand('greens · eggs · fish', X0 - 40, y, T.s5 + 1.6, 1.4, { size: 150, color: P.ink }); hand('walnuts · berries', X0 - 40, y + 190, T.s5 + 3.0, 1.2, { size: 150, color: P.ink });
    hand('not a cure.', X0 - 40, y + 400, T.cure + .1, .9, { size: 150, color: P.red });
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
  for (const w of ln.words) { cur.push(w); if (cur.length >= 13 || (/[.?:]$/.test(w.w) && cur.length >= 4)) { cues.push(cur); cur = []; } }
  if (cur.length) cues.push(cur);
  cues.forEach((c, i) => {
    const t0 = c[0].t - .15, t1 = i + 1 < cues.length ? cues[i + 1][0].t - .2 : ln.t0 + ln.dur + .15;
    E.caption(g, c, t, { t0, t1, x: 70, y: 1790, size: 44, maxW: 940, kicker: ['', 'VITAMIN K · SPINACH', 'CHOLINE · EGG', 'OMEGA-3 · WALNUTS VS SALMON', 'ANTHOCYANINS · BLUEBERRIES', 'ONE PLATE'][TL.indexOf(ln)] });
  });
}

window.DUR = DUR; window.render = draw; draw(0); window.READY = true;
