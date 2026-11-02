#!/usr/bin/env python3
"""Fuses Whisper word timings with vocal-onset boundaries -> lyrics.json.

Inputs
  lyrics_dp.json            acoustic-only alignment from timing.py (fallback + line windows)
  stems/lines/lNN.wav.json  whisper.cpp (medium, Hindi) word segments per line clip
  stems/lines/offsets.json  clip start offsets
  stems/vocals.wav          isolated vocals (for exact syllable boundaries)

For every slide, Whisper's words (Devanagari, transliterated to Latin) are matched to
the known lyric words with Needleman-Wunsch; matched words take Whisper's time snapped
to the closest strong vocal boundary (+-0.15 s); unmatched words are interpolated.
Manual "fixes" in slides.json still win.
"""
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).parent
FPS = 100

# ---------------------------------------------------------------- vocal boundaries
v, sr = sf.read(HERE / "stems/vocals.wav", always_2d=True)
v = v.mean(1)
hop, win = sr // FPS, 2048
n = (len(v) - win) // hop
db = np.empty(n)
flux = np.zeros(n)
prev = None
wnd = np.hanning(win)
for k in range(0, n, 2000):
    idx = np.arange(win)[None, :] + hop * np.arange(k, min(n, k + 2000))[:, None]
    fr = v[idx] * wnd
    lg = np.log1p(np.abs(np.fft.rfft(fr, axis=1))[:, 4:300] * 10)
    db[k:k + len(fr)] = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    d = np.diff(lg, axis=0, prepend=lg[:1] if prev is None else prev[None, :])
    flux[k:k + len(fr)] = np.maximum(d, 0).sum(1)
    prev = lg[-1]
sm = lambda a, k: np.convolve(a, np.ones(k) / k, "same")
dbs = sm(db, 5)
flux = sm(flux, 3)
flux /= np.percentile(flux, 99) + 1e-9
dip = np.zeros(n)
for i in range(12, n - 12):
    dip[i] = max(0.0, min(dbs[i - 12:i].max(), dbs[i + 1:i + 13].max()) - dbs[i]) / 12
bscore = np.clip(dip, 0, 1.5) + 0.8 * np.clip(np.roll(flux, -3), 0, 1.5)
# a word start is where the voice comes back: frame of rising energy after a dip
onset_frames = [i for i in range(3, n - 3) if bscore[i] >= bscore[i - 3:i + 4].max() and bscore[i] > 0.2]
onset_frames = np.array(onset_frames)


def snap(t, lo, hi, radius=0.15):
    if len(onset_frames) == 0:
        return t
    c = onset_frames[(onset_frames >= max(lo, t - radius) * FPS) & (onset_frames <= min(hi, t + radius) * FPS)]
    if len(c) == 0:
        return t
    # prefer strong and close
    score = bscore[c] - np.abs(c / FPS - t) * 4
    return float(c[int(np.argmax(score))]) / FPS


# ---------------------------------------------------------------- transliteration
CONS = {"क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
        "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
        "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
        "ष": "sh", "स": "s", "ह": "h", "ड़": "d", "ढ़": "dh", "क़": "k", "ख़": "kh", "ग़": "g", "ज़": "j", "फ़": "f", "ळ": "l"}
VOW = {"अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri"}
MAT = {"ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri", "ं": "n", "ँ": "n", "ः": "h"}


def translit(s):
    out, i = [], 0
    s = s.replace("़", "")  # nukta
    while i < len(s):
        ch = s[i]
        if ch in CONS:
            out.append(CONS[ch])
            nxt = s[i + 1] if i + 1 < len(s) else ""
            if nxt == "्":
                i += 2
                continue
            if nxt not in MAT:
                out.append("a")
        elif ch in VOW:
            out.append(VOW[ch])
        elif ch in MAT:
            out.append(MAT[ch])
        elif ch.isascii() and ch.isalpha():
            out.append(ch.lower())
        i += 1
    w = "".join(out)
    if w.endswith("a") and len(w) > 2 and not w.endswith("aa"):
        w = w[:-1]  # schwa deletion at word end
    return w


def norm(w):
    w = w.lower().replace("-", "")
    for a, b in [("aa", "a"), ("ee", "i"), ("oo", "u"), ("ph", "f"), ("w", "v"), ("z", "j"), ("chh", "ch"), ("q", "k"),
                 ("bh", "b"), ("dh", "d"), ("th", "t"), ("kh", "k"), ("gh", "g"), ("jh", "j"), ("sh", "s"), ("y", "i")]:
        w = w.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", w)


def lev(a, b):
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[-1]


def sim(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    return 1 - lev(a, b) / max(len(a), len(b))


def nw(lyr, wh):
    """Global alignment; returns {lyric_index: whisper_index}."""
    G = -0.35
    A, B = len(lyr), len(wh)
    S = np.zeros((A + 1, B + 1))
    S[:, 0] = np.arange(A + 1) * G
    S[0, :] = np.arange(B + 1) * G
    for i in range(1, A + 1):
        for j in range(1, B + 1):
            S[i, j] = max(S[i - 1, j - 1] + (sim(lyr[i - 1], wh[j - 1]["lat"]) - 0.45) * 2, S[i - 1, j] + G, S[i, j - 1] + G)
    i, j, m = A, B, {}
    while i > 0 and j > 0:
        if S[i, j] == S[i - 1, j - 1] + (sim(lyr[i - 1], wh[j - 1]["lat"]) - 0.45) * 2:
            if sim(lyr[i - 1], wh[j - 1]["lat"]) >= 0.34:
                m[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif S[i, j] == S[i - 1, j] + G:
            i -= 1
        else:
            j -= 1
    return m


def syl(w):
    return max(1, len(re.findall(r"[aeiouy]+", w.lower())))


def phrases(t0, t1, min_gap=0.3, min_len=0.25):
    """Voiced stretches in [t0,t1], gaps shorter than min_gap merged."""
    a, b = int(t0 * FPS), int(t1 * FPS)
    thr = min(-30.0, float(np.percentile(dbs[a:b], 90)) - 14)  # adapt to quieter passages
    on = dbs[a:b] > thr
    out, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            out.append([(a + i) / FPS, (a + j) / FPS])
            i = j
        else:
            i += 1
    merged = []
    for p in out:
        if merged and p[0] - merged[-1][1] < min_gap:
            merged[-1][1] = p[1]
        else:
            merged.append(p)
    return [p for p in merged if p[1] - p[0] >= min_len]


def phrase_align(line_words, t0, t1):
    """Silence-aware fallback: lines -> groups of phrases -> words by syllables."""
    ph = phrases(t0, t1)
    nl = len(line_words)
    if not ph:
        return None
    while len(ph) < nl:  # lines sung back to back: split the longest phrase at its deepest dip
        k = max(range(len(ph)), key=lambda i: ph[i][1] - ph[i][0])
        a_, b_ = ph[k]
        lo, hi = int((a_ + (b_ - a_) * 0.3) * FPS), int((a_ + (b_ - a_) * 0.7) * FPS)
        cut = (lo + int(np.argmin(dbs[lo:hi]))) / FPS
        ph[k:k + 1] = [[a_, cut], [cut + 0.02, b_]]
    sy = [sum(syl(w) for w in ws) for ws in line_words]
    # choose nl-1 cut points among phrase boundaries (brute force, few phrases)
    import itertools
    best, bcut = 1e9, None
    for cuts in itertools.combinations(range(1, len(ph)), nl - 1):
        bounds = [0, *cuts, len(ph)]
        durs = [ph[bounds[k + 1] - 1][1] - ph[bounds[k]][0] for k in range(nl)]
        tot = sum(durs)
        err = sum(abs(durs[k] / tot - sy[k] / sum(sy)) for k in range(nl))
        if err < best:
            best, bcut = err, bounds
    res = []
    for k in range(nl):
        segs = ph[bcut[k]:bcut[k + 1]]
        voiced = sum(b - a for a, b in segs)
        ws = line_words[k]
        wsy = [syl(w) + 0.5 for w in ws]
        tot = sum(wsy)
        times, acc = [], 0.0
        for w_ in wsy:  # walk along voiced time only (skipping the gaps)
            target = acc / tot * voiced
            for a, b in segs:
                if target <= b - a:
                    times.append(a + target)
                    break
                target -= b - a
            else:
                times.append(segs[-1][1] - 0.1)
            acc += w_
        res.append(times)
    return res


# ---------------------------------------------------------------- whisper words
offsets = {o["i"]: o["offset"] for o in json.loads((HERE / "stems/lines/offsets.json").read_text())}


def whisper_words(i):
    f = HERE / f"stems/lines/l{i:02d}.wav.json"
    if not f.exists():
        return []
    d = json.loads(f.read_bytes().decode("utf-8", "replace"))
    out, seen = [], set()
    for s in d["transcription"]:
        txt = s["text"].strip()
        a, b = s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000
        if not txt or txt.startswith("[") or b - a < 0.04:
            continue
        key = (txt, round(a, 1))
        if key in seen or len(txt) > 14:
            continue
        if len(out) >= 2 and out[-1]["dev"] == txt and out[-2]["dev"] == txt:  # decoder stuck in a loop
            break
        seen.add(key)
        out.append({"dev": txt, "lat": translit(txt), "t": offsets[i] + a, "e": offsets[i] + b})
    return out


DP = json.loads((HERE / "lyrics_dp.json").read_text())
data = json.loads((HERE / "slides.json").read_text())
fixes = {(f["slide"], f["line"], f["word"]): f["t"] for f in data.get("fixes", [])}
by_slide = {}
for li, ln in enumerate(DP["lines"]):
    by_slide.setdefault(ln["slide"], []).append((li, ln))

lines_out, report = [], []
for si, items in sorted(by_slide.items()):
    if not data["slides"][si]["lines"]:  # instrumental: no lyrics shown
        continue
    words, owner, dp_t = [], [], []
    wh = []
    for li, ln in items:
        for k, w in enumerate(ln["words"]):
            words.append(w["w"])
            owner.append((ln["line"], k))
            dp_t.append(w["t"])
        wh += whisper_words(li)
    wh.sort(key=lambda x: x["t"])
    # dedupe words seen by both overlapping clips
    ded = []
    for w in wh:
        if ded and abs(w["t"] - ded[-1]["t"]) < 0.25 and sim(w["lat"], ded[-1]["lat"]) > 0.6:
            continue
        ded.append(w)
    wh = ded
    s_lo, s_hi = data["slides"][si]["s"] - 0.6, data["slides"][si]["e"] + 0.3
    wh = [w for w in wh if s_lo <= w["t"] <= s_hi]
    # does the singer repeat the slide's lines? try 1x and 2x, keep the better fit
    best = None
    for R in (1, 2):
        if R == 2 and len(wh) < 1.5 * len(words):
            continue
        wR = words * R
        mR = nw(wR, wh)
        score = sum(sim(wR[a], wh[b]["lat"]) for a, b in mR.items()) - 0.25 * (len(wR) - len(mR))
        if best is None or score > best[0] + 0.5:
            best = (score, R, mR)
    _, R, m = best
    weak = R == 1 and len(m) < 0.5 * len(words)
    if weak:  # whisper could not follow this part: trust the acoustic alignment instead
        m = {}
    words_all = words * R
    owner_all = [(o[0], o[1], r) for r in range(R) for o in owner]
    dp_all = dp_t + [None] * (len(words) * (R - 1))
    ts = [None] * len(words_all)
    for li_, wi in m.items():
        ts[li_] = wh[wi]["t"]
    if ts[0] is None:
        ts[0] = dp_t[0]
    if weak:
        lw = [[w["w"] for w in ln["words"]] for _, ln in items]
        pa = phrase_align(lw, data["slides"][si]["s"] - 0.4, data["slides"][si]["e"] - 0.05)
        ts = [t for line in pa for t in line] if pa else list(dp_t)
    last = -1
    for k in range(len(ts)):
        if ts[k] is not None:
            if ts[k] <= last + 0.06:
                ts[k] = None
            else:
                last = ts[k]
    anchors = [k for k, t in enumerate(ts) if t is not None]
    for a_, b_ in zip(anchors, anchors[1:]):
        if b_ - a_ > 1:
            sy = [syl(words_all[k]) for k in range(a_, b_)]
            tot, acc = sum(sy), 0
            for k in range(a_ + 1, b_):
                acc += sy[k - a_ - 1]
                ts[k] = ts[a_] + (ts[b_] - ts[a_]) * acc / tot
    for k in range(anchors[-1] + 1, len(ts)):
        ts[k] = max(ts[k - 1] + 0.18, dp_all[k] or 0)
    final = []
    for k, t in enumerate(ts):
        lo = final[-1] + 0.08 if final else t - 0.3
        hi = (ts[k + 1] - 0.08) if k + 1 < len(ts) else t + 0.3
        t2 = max(lo, snap(t, lo, hi))
        # never start a word in silence: move it to where the voice comes in
        f0 = int(t2 * FPS)
        if dbs[f0] < -32:
            lim = int(min(hi, t2 + 1.2) * FPS)
            voiced = np.where(dbs[f0:lim] > -30)[0]
            if len(voiced):
                t2 = (f0 + voiced[0]) / FPS
        final.append(t2)
    # sanity check: a word in the middle of a line must not span a long silence
    def violation(times):
        v_ = 0.0
        nper = len(words)
        for k in range(len(times) - 1):
            if (k % nper) in line_final_idx:
                continue
            a_, b_ = int((times[k] + 0.25) * FPS), int(times[k + 1] * FPS)
            if b_ > a_:
                q = dbs[a_:b_] < -32
                run = best_run = 0
                for x in q:
                    run = run + 1 if x else 0
                    best_run = max(best_run, run)
                if best_run > 60:
                    v_ += best_run / FPS
        return v_
    line_final_idx = set()
    cnt = 0
    for _, ln in items:
        cnt += len(ln["words"])
        line_final_idx.add(cnt - 1)
    va = violation(final)
    if va > 0:
        lw = [[w["w"] for w in ln["words"]] for _, ln in items] * R
        pa = phrase_align(lw, data["slides"][si]["s"] - 0.4, data["slides"][si]["e"] - 0.05)
        if pa:
            alt = [t for line in pa for t in line]
            alt2 = []
            for k, t in enumerate(alt):
                lo = alt2[-1] + 0.08 if alt2 else t - 0.3
                hi = (alt[k + 1] - 0.08) if k + 1 < len(alt) else t + 0.3
                alt2.append(max(lo, snap(t, lo, hi)))
            if violation(alt2) < va:
                final = alt2
                report.append(f"slide {si:2d}: whisper timing crossed {va:.1f}s of silence -> phrase alignment")
    report.append(f"slide {si:2d}: {len(m)}/{len(words_all)} words matched by whisper" + ("  (lines sung twice)" if R == 2 else "") + ("  -> acoustic fallback" if weak else ""))
    words, owner = words_all, owner_all
    # emit lines (one entry per line per repeat)
    for r in range(R):
        for li, ln in items:
            idx = [k for k, o in enumerate(owner) if o[0] == ln["line"] and o[2] == r]
            wl = []
            for j, k in enumerate(idx):
                t = fixes.get((si, ln["line"], j), final[k]) if r == 0 else final[k]
                nxt = final[k + 1] if k + 1 < len(final) else None
                if nxt is not None and j == len(idx) - 1:
                    e = nxt - 0.08
                    fr = int(t * FPS) + 10
                    quiet = np.where(dbs[fr:int(e * FPS)] < -30)[0]
                    if len(quiet):
                        e = min(e, (fr + quiet[0]) / FPS + 0.05)
                elif nxt is not None:
                    e = nxt
                else:
                    fr = int(t * FPS) + 10
                    quiet = np.where(dbs[fr:fr + 400] < -30)[0]
                    e = (fr + quiet[0]) / FPS if len(quiet) else t + 1.0
                wl.append({"w": words[k], "t": round(t, 3), "e": round(max(e, t + 0.12), 3)})
            lines_out.append({"slide": si, "line": ln["line"], "rep": r, "scene": ln["scene"],
                              "start": wl[0]["t"], "end": wl[-1]["e"], "words": wl})

out = {k: DP[k] for k in ("title", "artist", "duration", "slides")}
out["lines"] = lines_out
(HERE / "lyrics.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print("\n".join(report))
for l in lines_out[:8]:
    print(f'{l["start"]:7.2f}-{l["end"]:7.2f}  ' + " ".join(f'{w["w"]}@{w["t"]:.2f}' for w in l["words"]))
