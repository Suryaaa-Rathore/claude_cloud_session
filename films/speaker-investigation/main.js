// How a speaker is made: the paper trail. Visual Investigation, 1080x1920, deterministic render(t).
const W = 1080, H = 1920;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const TL = await (await fetch('timeline.json')).json();
const LN = Object.fromEntries(TL.map(l => [l.id, l]));
for (const f of ['600 40px Plex', '400 40px Mono', '600 40px Mono', 'italic 400 40px Serif']) await document.fonts.load(f);
const COL = { bg: '#0B0C0E', panel: '#141619', hair: '#2E3238', text: '#ECEAE4', sec: '#8B9097', tick: '#4A4F57', red: '#FF4A2E' };
const DUR = 63.4;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u;
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
// time of the first word in line id that contains `w` (after word index from)
const wt = (id, w, from = 0) => { const ws = LN[id].words; for (let i = from; i < ws.length; i++) if (ws[i].w.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(w)) return ws[i].t; return LN[id].t0; };

// —— sources ——
const img = (src) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
const IM = {};
for (const k of ['US149797-1', 'US149797-3', 'US1707570-1', 'US1707570-2', 'US2490466-1', 'US2490466-4']) IM[k] = await img(`src/${k}.png`);
// grain tiles
const GR = [...Array(6)].map((_, k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), d = x.createImageData(256, 256); let s = 1234 + k * 99; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });

// —— section times from the voice ——
const T = {
  s1: LN.v2.t0, s1coil: wt('v2', 'coil'), s1magnet: wt('v2', 'magnet'), s1text: wt('v2', 'alternating') - .3, s1vib: wt('v2', 'vibrate'),
  s2: LN.v3.t0, s2conical: wt('v3', 'conical'), s2text: wt('v3', 'spider') - .9, s2spider: wt('v3', 'spider'), s2side: wt('v3', 'sideways'),
  s3: LN.v4.t0, s3rim: wt('v4', 'corrugated'), s3soft: wt('v4', 'softer'),
  s4: LN.v5.t0, a: ['magnet', 'frame', 'spider', 'coil', 'cone', 'surround'].map((w, i) => wt('v5', w)),
  s5: LN.v6.t0,
};

// —— helpers ——
function flash(t0, dur = .1) { const a = 1 - seg(t, t0, t0 + dur); if (t >= t0 && a > 0) { g.fillStyle = `rgba(255,255,255,${.55 * a})`; g.fillRect(0, 0, W, H); } }
function frameBox(x, y, w, h) { g.strokeStyle = COL.hair; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); }
function tag(x, y, s) { g.fillStyle = COL.red; g.fillRect(x, y - 12, 6, 12); g.font = '400 20px Mono'; g.fillStyle = COL.sec; g.textBaseline = 'alphabetic'; g.fillText(s, x + 14, y); }
function text(s, x, y, font, col = COL.text, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
// a crop of a scanned page into a panel (cover-fit horizontally), returns page→screen mapping
function strip(im, crop, x, y, w, t0, o = {}) {
  if (t < t0) return null;
  const [cx, cy, cw, ch] = crop, s = w / cw, h = ch * s, push = 1 + (o.push || 0) * seg(t, t0, t0 + 8);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = COL.panel; g.fillRect(x, y, w, h);
  g.translate(x + w / 2, y + h / 2); g.scale(push, push); g.translate(-(x + w / 2), -(y + h / 2));
  g.filter = 'grayscale(1) contrast(1.05) brightness(0.86)';
  g.drawImage(im, cx, cy, cw, ch, x, y, w, h);
  g.filter = 'none';
  // highlights (multiply red, wiped left to right)
  for (const hl of (o.hl || [])) {
    const u = eo(seg(t, hl.t, hl.t + .55)); if (u <= 0) continue;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,74,46,.62)';
    for (const [bx0, by0, bx1, by1] of hl.boxes) { const X0 = x + (bx0 - cx - 4) * s, X1 = x + (bx1 - cx + 4) * s, Y0 = y + (by0 - cy - 3) * s, Y1 = y + (by1 - cy + 3) * s; g.fillRect(X0, Y0, (X1 - X0) * u, Y1 - Y0); }
    g.globalCompositeOperation = 'source-over';
  }
  // grain (paper α .10)
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = .10; const gt = GR[Math.floor(t * 30) % 6]; for (let gx = x; gx < x + w; gx += 256) for (let gy = y; gy < y + h; gy += 256) g.drawImage(gt, gx, gy); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.restore();
  frameBox(x, y, w, h);
  flash(t0);
  const map = (px, py) => [x + w / 2 + ((x + (px - cx) * s) - (x + w / 2)) * push, y + h / 2 + ((y + (py - cy) * s) - (y + h / 2)) * push];
  return { map, h, s: s * push };
}
// red circle drawn clockwise with leader + label
function circle(cx, cy, r, t0, label, side = 1) {
  const u = eo(seg(t, t0, t0 + .5)); if (u <= 0) return;
  g.save(); g.strokeStyle = COL.red; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); g.stroke();
  const la = seg(t, t0 + .3, t0 + .6);
  if (label && la > 0) { const ex = cx + side * (r + 70) * la, ey = cy - r - 30 * la; g.beginPath(); g.moveTo(cx + side * r * .7, cy - r * .7); g.lineTo(ex, ey); g.stroke(); g.font = '600 30px Plex'; g.fillStyle = COL.red; g.textAlign = side > 0 ? 'left' : 'right'; g.fillText(label, ex + side * 8, ey + 10); }
  g.restore();
}
function badge(x, y, t0) { const u = seg(t, t0, t0 + .1); if (u <= 0) return; g.fillStyle = COL.red; g.fillRect(x - 15, y - 15, 30, 30); g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x - 2, y + 6); g.lineTo(x + 8, y - 7); g.stroke(); }
function dashLink(a, b, t0, d = .6) { const u = eo(seg(t, t0, t0 + d)); if (u <= 0) return; g.save(); g.strokeStyle = COL.red; g.lineWidth = 2; g.setLineDash([8, 7]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u)); g.stroke(); g.restore(); }

// —— schematic: half cross-section of a cone loudspeaker (axis vertical, cone opens upward) ——
// parts as polylines in a 1000×560 design box; drawn mirrored about the axis x=500
const PART = {
  magnet: { pts: [[[330, 520], [500, 520]], [[330, 520], [330, 450], [400, 450], [400, 520]], [[330, 450], [330, 420], [470, 420]], [[485, 520], [485, 380], [500, 380]]], label: 'MAGNET', at: [365, 480] },
  frame: { pts: [[[470, 420], [450, 400], [250, 210], [150, 120], [110, 120]]], label: 'FRAME', at: [190, 175] },
  spider: { pts: [[[478, 330], [455, 318], [440, 342], [420, 318], [400, 342], [380, 318], [362, 335]]], label: 'SPIDER', at: [395, 300] },
  coil: { pts: [[[478, 300], [478, 410]], [[474, 385], [474, 410], [482, 410], [482, 385], [474, 385]]], label: 'COIL', at: [470, 260] },
  cone: { pts: [[[478, 300], [300, 190], [160, 112]]], label: 'CONE', at: [280, 160] },
  surround: { pts: [[[160, 112], [150, 96], [132, 92], [118, 104], [112, 120]]], label: 'SURROUND', at: [130, 70] },
  cap: { pts: [[[478, 300], [490, 268], [500, 262]]], label: 'DUST CAP', at: [510, 240] },
};
const ORDER = ['magnet', 'frame', 'spider', 'coil', 'cone', 'surround', 'cap'];
function schematic(x0, y0, sc, st) {   // st[name] = {draw:0..1, red:bool, a:alpha}
  const P = (p, m) => [x0 + (m ? 1000 - p[0] : p[0]) * sc, y0 + p[1] * sc];
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  // axis
  g.strokeStyle = COL.tick; g.lineWidth = 1; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(...P([500, 40])); g.lineTo(...P([500, 545])); g.stroke(); g.setLineDash([]);
  for (const k of ORDER) {
    const s = st[k] || {}, d = s.draw ?? 0; if (d <= 0) continue;
    g.strokeStyle = s.red ? COL.red : (s.dim ? COL.tick : COL.text); g.lineWidth = s.red ? 4 : 3;
    for (const m of [false, true]) for (const pl of PART[k].pts) {
      // progressive stroke by fraction d
      let L = 0; for (let i = 1; i < pl.length; i++) L += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
      let rem = L * d; g.beginPath(); g.moveTo(...P(pl[0], m));
      for (let i = 1; i < pl.length && rem > 0; i++) { const l = Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]), f = Math.min(1, rem / l); g.lineTo(...P([lerp(pl[i - 1][0], pl[i][0], f), lerp(pl[i - 1][1], pl[i][1], f)], m)); rem -= l; }
      g.stroke();
    }
    if (s.label) { const [lx, ly] = P(PART[k].at); g.font = '400 22px Mono'; g.fillStyle = s.red ? COL.red : COL.sec; g.textAlign = 'right'; g.fillText(PART[k].label, lx - 10, ly); g.textAlign = 'left'; }
  }
  g.restore();
  return (k) => P(PART[k].at);
}

// —— date readout (the clock of this film: dates) ——
function readout(big, small) { text(big, 60, 170, '600 104px Mono', COL.text); text(small, 64, 222, '400 26px Mono', COL.sec); }

let t = 0;
function draw(tt) {
  t = tt; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
  const SCX = 40, SCY = 1130, SCS = 1.0;
  const proven = { magnet: T.s1magnet, coil: T.s1vib, cone: T.s2conical, spider: T.s2side, surround: T.s3rim };
  const st = {};
  // ———— cold open ————
  if (t < T.s1) {
    readout('?', 'WHAT IS INSIDE');
    for (const k of ORDER) if (k !== 'cap') st[k] = { draw: eo(seg(t, .2 + ORDER.indexOf(k) * .25, 1 + ORDER.indexOf(k) * .25)) };
    const at = schematic(SCX, 640, SCS, st);
    const rings = [['magnet', [365, 470]], ['coil', [478, 360]], ['spider', [420, 330]], ['cone', [320, 205]], ['surround', [138, 104]]];
    rings.forEach(([k, p], i) => { const t0 = 2.2 + i * .45; const x = SCX + p[0] * SCS, y = 640 + p[1] * SCS; circle(x, y, 34, t0, null); if (t > t0 + .4) text('?', x, y + 12, '600 34px Plex', COL.red, 'center'); });
    text('THE BLUEPRINTS', 60, 1500, '600 58px Plex', COL.text); text('ARE ON FILE', 60, 1565, '600 58px Plex', t > wt('v1', 'blueprints') ? COL.red : COL.hair);
    flash(.05);
  }
  // ———— section 1: Siemens 1874 ————
  else if (t < T.s2) {
    readout('14 APR 1874', 'PATENTED · US 149,797');
    const d = strip(IM['US149797-1'], [140, 330, 880, 480], 60, 300, 960, T.s1, { push: .04 });
    tag(60, 290, 'PATENT · SIEMENS');
    if (d) { const [cx, cy] = d.map(528, 598); circle(cx, cy, 60, T.s1coil, 'COIL', -1); const [mx, my] = d.map(528, 700); circle(mx, my, 55, T.s1magnet, 'MAGNET', 1); }
    const q = strip(IM['US149797-3'], [480, 425, 520, 545], 330, 850, 560, T.s1text, {
      hl: [{ t: T.s1text + .1, boxes: [[663, 449, 938, 465], [525, 468, 805, 485]] }, { t: T.s1vib - .2, boxes: [[759, 916, 940, 935], [525, 938, 885, 955]] }],
    });
    if (q) tag(330, 840, 'TEXT · p.2');
    for (const k of ORDER) if (k !== 'cap') st[k] = { draw: 1, dim: !(k === 'magnet' && t > proven.magnet) && !(k === 'coil' && t > proven.coil), red: (k === 'magnet' && t > proven.magnet) || (k === 'coil' && t > proven.coil), label: (k === 'magnet' && t > proven.magnet) || (k === 'coil' && t > proven.coil) };
    const at = schematic(290, 1450, .5, st);
    if (t > proven.magnet) badge(960, 1520, proven.magnet + .1);
    if (t > proven.coil) badge(960, 1570, proven.coil + .1);
  }
  // ———— section 2: Rice 1925 ————
  else if (t < T.s3) {
    readout('20 APR 1925', 'FILED · US 1,707,570 · GENERAL ELECTRIC');
    const d = strip(IM['US1707570-1'], [300, 380, 640, 640], 190, 300, 700, T.s2, { push: .03 });
    tag(60, 290, 'PATENT · RICE');
    if (d) { const [cx, cy] = d.map(820, 640); circle(cx, cy, 80, T.s2conical, 'CONE', 1); const [sx, sy] = d.map(745, 770); circle(sx, sy, 40, T.s2spider, 'SPIDER', -1); }
    const q = strip(IM['US1707570-2'], [480, 860, 520, 250], 300, 1030, 720, T.s2text, { hl: [{ t: T.s2spider, boxes: [[754, 884, 959, 902]] }, { t: T.s2side - .2, boxes: [[523, 1071, 947, 1092]] }] });
    if (q) tag(300, 1020, 'TEXT · p.2');
    for (const k of ORDER) if (k !== 'cap') { const pr = (k === 'magnet' || k === 'coil') || (k === 'cone' && t > proven.cone) || (k === 'spider' && t > proven.spider); st[k] = { draw: 1, dim: !pr, red: (k === 'cone' && t > proven.cone) || (k === 'spider' && t > proven.spider), label: pr }; }
    schematic(290, 1450, .5, st);
    badge(960, 1520, proven.cone + .1); if (t > proven.spider) badge(960, 1570, proven.spider + .1);
  }
  // ———— section 3: Olson 1944 ————
  else if (t < T.s4) {
    readout('19 JUL 1944', 'FILED · US 2,490,466 · RCA');
    const d = strip(IM['US2490466-1'], [180, 280, 900, 430], 60, 300, 960, T.s3, { push: .04 });
    tag(60, 290, 'PATENT · OLSON & PRESTON');
    if (d) { const [cx, cy] = d.map(250, 350); circle(cx, cy, 60, T.s3rim, 'RIM', 1); }
    const q = strip(IM['US2490466-4'], [480, 990, 520, 110], 300, 840, 720, T.s3rim - .8, { hl: [{ t: T.s3rim, boxes: [[759, 1027, 938, 1042], [521, 1046, 688, 1061]] }] });
    if (q) tag(300, 830, 'TEXT · p.1');
    // quoted original under the strip
    if (t > T.s3rim + .4) { text('“an annularly corrugated', 300, 1060, 'italic 400 40px Serif', COL.text); text('fibrous support rim”', 300, 1110, 'italic 400 40px Serif', COL.text); }
    for (const k of ORDER) if (k !== 'cap') { const pr = k !== 'surround' || t > proven.surround; st[k] = { draw: 1, dim: !pr, red: k === 'surround' && t > proven.surround, label: pr }; }
    schematic(290, 1450, .5, st);
    if (t > proven.surround) badge(960, 1520, proven.surround + .1);
  }
  // ———— section 4: assembly (schematic, typical build) ————
  else if (t < T.s5) {
    readout('TODAY', 'TYPICAL BUILD · SCHEMATIC');
    const order = ['magnet', 'frame', 'spider', 'coil', 'cone', 'surround'];
    order.forEach((k, i) => { const t0 = T.a[i] - .15; st[k] = { draw: eo(seg(t, t0, t0 + .5)), red: t > t0 && t < t0 + .9, label: t > t0 }; });
    st.cap = { draw: eo(seg(t, T.a[5] + 1.0, T.a[5] + 1.5)), label: t > T.a[5] + 1.0 };
    schematic(SCX, 420, 1.0, st);
    order.forEach((k, i) => { const t0 = T.a[i] - .15; if (t > t0) { text(`${i + 1}`, 120, 1180 + i * 70, '600 40px Mono', COL.red); text(PART[k].label, 180, 1180 + i * 70, '600 40px Plex', t < t0 + .9 ? COL.text : COL.sec); } });
    flash(T.s4);
  }
  // ———— section 5: evidence map ————
  else {
    readout('1874 → TODAY', '3 PATENTS · 1 IDEA');
    const thumbs = [['US149797-1', [140, 330, 880, 480], '1874 · SIEMENS', ['magnet', 'coil']], ['US1707570-1', [300, 380, 640, 640], '1925 · RICE', ['cone', 'spider']], ['US2490466-1', [180, 280, 900, 430], '1944 · OLSON', ['surround']]];
    const sc2 = .62 * 1.62;
    for (const k of ORDER) st[k] = { draw: 1, label: true, red: t > T.s5 + 1.2 };
    schematic(SCX, 1080, sc2, st);
    thumbs.forEach(([k, crop, lab, parts], i) => {
      const t0 = T.s5 + .1 + i * .25, x = 60 + i * 330, y = 330;
      strip(IM[k], crop, x, y, 300, t0); tag(x, y - 10, lab);
      for (const p of parts) { const tp = PART[p].at; dashLink([x + 150, y + 300 * crop[3] / crop[2] + 4], [SCX + tp[0] * sc2, 1080 + tp[1] * sc2], t0 + .5, .7); }
      badge(x + 280, y + 20, t0 + 1.2 + i * .12);
    });
    if (t > T.s5 + 3) { text('CURRENT · COIL · MAGNET · AIR', W / 2, 1720 - 40, '600 40px Plex', COL.text, 'center'); }
    const ea = seg(t, DUR - 3.2, DUR - 3);
    if (ea > 0) { g.fillStyle = `rgba(11,12,14,${.92 * ea})`; g.fillRect(0, 0, W, H); g.globalAlpha = ea;
      text('HOW A SPEAKER IS MADE', W / 2, 820, '600 64px Plex', COL.text, 'center'); text('THE PAPER TRAIL', W / 2, 900, '600 64px Plex', COL.red, 'center');
      ['US 149,797 · E. W. SIEMENS · 1874', 'US 1,707,570 · C. W. RICE / GE · 1929', 'US 2,490,466 · H. F. OLSON, J. PRESTON / RCA · 1949', 'US PATENT DOCUMENTS · PUBLIC DOMAIN', 'SCHEMATICS: DRAWN, NOT TO SCALE'].forEach((s, i) => text(s, W / 2, 1040 + i * 46, '400 24px Mono', i < 3 ? COL.text : COL.sec, 'center'));
      g.globalAlpha = 1; }
  }
  subtitles();
  const f = clamp(t / .3) * clamp((DUR - t) / .6); if (f < 1) { g.fillStyle = `rgba(11,12,14,${1 - f})`; g.fillRect(0, 0, W, H); }
}

function subtitles() {
  const ln = TL.find(l => t >= l.t0 - .1 && t < l.t0 + l.dur + .35); if (!ln) return;
  // two-line cue chunks: split the line into cues of <= ~7 words, each shown while spoken
  const ws = ln.words, cues = []; let cur = [];
  for (const w of ws) { cur.push(w); if (cur.length >= 7 || /[.,]$/.test(w.w) && cur.length >= 4) { cues.push(cur); cur = []; } }
  if (cur.length) cues.push(cur);
  let cue = cues[0]; for (const c of cues) if (t >= c[0].t - .1) cue = c;
  g.save(); g.font = '600 44px Plex'; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 10;
  const s = cue.map(w => w.w).join(' ');
  g.fillStyle = COL.text;
  if (g.measureText(s).width > 960) { const h = Math.ceil(cue.length / 2); g.fillText(cue.slice(0, h).map(w => w.w).join(' '), W / 2, 1790); g.fillText(cue.slice(h).map(w => w.w).join(' '), W / 2, 1846); }
  else g.fillText(s, W / 2, 1830);
  g.restore();
}

window.DUR = DUR; window.render = draw; draw(0); window.READY = true;
