#!/usr/bin/env python3
"""Aligns every lyric word to the isolated vocal track and writes lyrics.json.

Pipeline:
  1. separate.py has split the song into stems/vocals.wav (UVR-MDX-NET-Voc_FT).
  2. Here, on the clean vocals:
     - loudness (dB) and spectral flux are computed every 10 ms;
     - each line's sung span = where the vocals are above a level gate inside the slide;
     - two-line slides are split at the longest quiet gap near the expected point;
     - candidate syllable boundaries = energy dips + flux peaks;
     - dynamic programming picks one boundary per word start so that boundaries are
       strong AND word lengths match their syllable counts.
Manual fixes: put {"slide": i, "line": j, "word": k, "t": seconds} objects in
slides.json "fixes" and re-run; they override the aligner.
"""
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).parent
FPS = 100

v, sr = sf.read(HERE / "stems/vocals.wav", always_2d=True)
v = v.mean(1)
hop, win = sr // FPS, 2048
n = (len(v) - win) // hop
db = np.empty(n)
flux = np.zeros(n)
prev = None
w = np.hanning(win)
for k in range(0, n, 2000):
    idx = np.arange(win)[None, :] + hop * np.arange(k, min(n, k + 2000))[:, None]
    fr = v[idx] * w
    sp = np.abs(np.fft.rfft(fr, axis=1))[:, 4:300]  # ~90 Hz .. 6.4 kHz
    db[k:k + len(fr)] = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    lg = np.log1p(sp * 10)
    d = np.diff(lg, axis=0, prepend=lg[:1] if prev is None else prev[None, :])
    flux[k:k + len(fr)] = np.maximum(d, 0).sum(1)
    prev = lg[-1]


def sm(a, k):
    return np.convolve(a, np.ones(k) / k, "same")


dbs = sm(db, 5)
flux = sm(flux, 3)
flux = flux / (np.percentile(flux, 99) + 1e-9)
GATE = -30.0  # dB: vocals present above this

# boundary strength: dip depth (vs. surrounding 120 ms max) + onset flux
dip = np.zeros(n)
for i in range(12, n - 12):
    dip[i] = max(0.0, min(dbs[i - 12:i].max(), dbs[i + 1:i + 13].max()) - dbs[i])
dip = dip / 12.0
bscore = np.clip(dip, 0, 1.5) + 0.8 * np.clip(np.roll(flux, -3), 0, 1.5)


def syl(word):
    return max(1, len(re.findall(r"[aeiouy]+", word.lower())))


def sung_span(t0, t1):
    a, b = int(t0 * FPS), int(t1 * FPS)
    on = np.where(dbs[a:b] > GATE)[0]
    if len(on) == 0:
        return t0, t1
    # ignore isolated blips shorter than 60 ms at the edges
    return (a + on[0]) / FPS, (a + on[-1]) / FPS


def split_point(t0, t1, frac):
    """Longest quiet gap (below gate) near the expected split fraction."""
    a, b = int(t0 * FPS), int(t1 * FPS)
    exp = a + (b - a) * frac
    quiet = dbs[a:b] < GATE + 4
    best, bestv = None, -1e9
    i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            mid = a + (i + j) / 2
            val = (j - i) - abs(mid - exp) * 0.15
            if val > bestv and a + 30 < mid < b - 30:
                best, bestv = mid, val
            i = j
        else:
            i += 1
    if best is None:
        lo, hi = int(exp - (b - a) * 0.15), int(exp + (b - a) * 0.15)
        best = lo + int(np.argmin(dbs[lo:hi]))
    return best / FPS


lam_base = 1.2


def align_words(words, start, end, flex=()):
    """DP: choose start frame for words[1:] among frames in (start, end)."""
    a, b = int(start * FPS), min(int(end * FPS), n - 8)
    lamk = [lam_base * (0.12 if k in flex else 1.0) for k in range(len(words))]
    sy = np.array([syl(w) for w in words], float)
    if len(words) == 1:
        return [start]
    per = (b - a) / sy.sum()
    # candidate frames: local maxima of boundary score
    cand = [i for i in range(a + 6, b - 6) if bscore[i] >= bscore[i - 3:i + 4].max() and bscore[i] > 0.15]
    if len(cand) < len(words) - 1:
        cand = list(range(a + 6, b - 6, 3))
    cand = np.array(cand)
    if len(cand) < len(words) - 1:
        print(f"  ! short line {start:.2f}-{end:.2f}: proportional fallback for {' '.join(words)}")
        return [start + (exp_start_i) / FPS for exp_start_i in (np.concatenate([[0], np.cumsum(sy)])[:-1] * per)]
    K, C = len(words) - 1, len(cand)
    exp_start = a + np.concatenate([[0], np.cumsum(sy)])[:-1] * per  # expected start of each word
    INF = 1e18
    cost = np.full((K, C), INF)
    back = np.zeros((K, C), int)
    for c in range(C):
        dur = cand[c] - a
        cost[0, c] = -bscore[cand[c]] + lamk[0] * ((dur - sy[0] * per) / (sy[0] * per + 15)) ** 2 \
            + 0.4 * ((cand[c] - exp_start[1]) / (per * 2 + 20)) ** 2
    for k in range(1, K):
        for c in range(C):
            best, bi = INF, 0
            for p in range(c):
                dur = cand[c] - cand[p]
                if dur < 8 or cost[k - 1, p] >= INF:
                    continue
                v_ = cost[k - 1, p] + lamk[k] * ((dur - sy[k] * per) / (sy[k] * per + 15)) ** 2
                if v_ < best:
                    best, bi = v_, p
            if best < INF:
                cost[k, c] = best - bscore[cand[c]] + 0.4 * ((cand[c] - exp_start[k + 1]) / (per * 2 + 20)) ** 2
                back[k, c] = bi
    # last word must leave room until end
    last = np.array([cost[K - 1, c] + lamk[-1] * (((b - cand[c]) - sy[-1] * per) / (sy[-1] * per + 15)) ** 2 * 0.5
                     for c in range(C)])
    c = int(np.argmin(last))
    picks = [c]
    for k in range(K - 1, 0, -1):
        c = back[k, c]
        picks.append(c)
    picks = picks[::-1]
    return [start] + [cand[p] / FPS for p in picks]


data = json.loads((HERE / "slides.json").read_text())
fixes = {(f["slide"], f["line"], f["word"]): f["t"] for f in data.get("fixes", [])}
lines_out = []
for si, sl in enumerate(data["slides"]):
    lines = sl["lines"]
    if not lines:
        continue
    s0, e0 = sung_span(sl["s"] - 0.3, sl["e"] - 0.05)
    allw, owner, flex = [], [], set()
    for li, text in enumerate(lines):
        ws = text.split()
        allw += ws
        owner += [(li, k) for k in range(len(ws))]
        flex.add(len(allw) - 1)
    ts_all = align_words(allw, s0, e0, flex)
    for li, text in enumerate(lines):
        idx = [i for i, o in enumerate(owner) if o[0] == li]
        words = [allw[i] for i in idx]
        ts = [fixes.get((si, li, k), ts_all[i]) for k, i in enumerate(idx)]
        nxt = idx[-1] + 1
        line_end = ts_all[nxt] - 0.05 if nxt < len(allw) else e0
        # trim the line end to where the voice actually stops (held note tail)
        w0, w1 = ts[0], line_end
        ends = ts[1:] + [w1]
        lines_out.append({
            "slide": si, "line": li, "scene": sl["scene"],
            "start": round(w0, 3), "end": round(w1, 3),
            "words": [{"w": w, "t": round(t, 3), "e": round(en, 3)} for w, t, en in zip(words, ts, ends)],
        })

out = {k: data[k] for k in ("title", "artist", "duration")}
out["slides"] = [{"s": sl["s"], "e": sl["e"], "scene": sl["scene"]} for sl in data["slides"]]
out["lines"] = lines_out
(HERE / "lyrics.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(f"lyrics.json: {len(lines_out)} lines")
for l in lines_out[:10]:
    print(f'{l["start"]:7.2f}-{l["end"]:7.2f}  ' + " ".join(f'{w["w"]}@{w["t"]:.2f}' for w in l["words"]))
