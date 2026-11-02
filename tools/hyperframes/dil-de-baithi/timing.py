#!/usr/bin/env python3
"""Estimates line and word timings from the song audio and writes lyrics.json.

Slide windows (from the original lyric video) are in slides.json. Inside each slide,
a 'vocal activity' curve (energy of the centre channel vs. the sides in the 300-3400 Hz
voice band) is used to find where each line is sung and the pause between lines. Words
are spread over the line by syllable count and snapped to nearby vocal onsets.

It is an estimate, not true speech recognition. To fix a word by hand, edit lyrics.json
(or add "fix" overrides in slides.json) and rebuild.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR, HOP, WIN = 16000, 160, 1024  # 10 ms frames
FPS = SR // HOP

pcm = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", str(HERE / "assets/song.m4a"), "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"],
    capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.int16).reshape(-1, 2).astype(np.float32) / 32768
mid, side = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2


def band_energy(sig):
    n = (len(sig) - WIN) // HOP
    f = np.fft.rfftfreq(WIN, 1 / SR)
    band = (f > 300) & (f < 3400)
    out = []
    win = np.hanning(WIN)
    for k in range(0, n, 4000):
        idx = np.arange(WIN)[None, :] + HOP * np.arange(k, min(n, k + 4000))[:, None]
        out.append((np.abs(np.fft.rfft(sig[idx] * win, axis=1)) ** 2)[:, band].sum(1))
    return np.concatenate(out)


em, es = band_energy(mid), band_energy(side)
ratio = 10 * np.log10(em + 1e-9) - 10 * np.log10(es + 1e-9)
loud = 10 * np.log10(em + 1e-9)


def smooth(a, n):
    return np.convolve(a, np.ones(n) / n, "same")


act = smooth(ratio, 15)
act_slow = smooth(ratio, 40)
onset = np.maximum(0, np.diff(smooth(loud, 3), prepend=loud[0]))


def syllables(word):
    return max(1, len(re.findall(r"[aeiouy]+", word.lower())))


def snap(t, lo, hi):
    """Move t to the strongest vocal onset within +-0.12 s, staying inside (lo, hi)."""
    a, b = int((t - 0.12) * FPS), int((t + 0.12) * FPS)
    a, b = max(a, int(lo * FPS) + 1), min(b, int(hi * FPS) - 1)
    if b <= a:
        return t
    return (a + int(np.argmax(onset[a:b]))) / FPS


def sung_span(t0, t1):
    a, b = int(t0 * FPS), int(t1 * FPS)
    seg = act[a:b]
    thr = np.percentile(seg, 35)
    on = np.where(seg > thr)[0]
    if len(on) == 0:
        return t0, t1
    return (a + on[0]) / FPS, (a + on[-1]) / FPS


data = json.loads((HERE / "slides.json").read_text())
lines_out = []
for si, sl in enumerate(data["slides"]):
    lines = sl["lines"]
    if not lines:
        continue
    s, e = sl["s"] - 0.2, sl["e"] - 0.15
    if len(lines) == 1:
        windows = [(s, e)]
    else:
        # split between the two lines at the quietest vocal point near the weighted middle
        w1, w2 = sum(map(syllables, lines[0].split())), sum(map(syllables, lines[1].split()))
        guess = s + (e - s) * w1 / (w1 + w2)
        a, b = int((guess - 0.25 * (e - s) * 0.5) * FPS), int((guess + 0.25 * (e - s) * 0.5) * FPS)
        split = (a + int(np.argmin(act_slow[a:b]))) / FPS
        windows = [(s, split), (split, e)]
    for li, (text, (w0, w1_)) in enumerate(zip(lines, windows)):
        start, end = sung_span(w0, w1_)
        words = text.split()
        weights = np.array([syllables(w) + 0.6 for w in words], float)
        cum = np.concatenate([[0], np.cumsum(weights)])[:-1] / weights.sum()
        times = [start + c * (end - start) for c in cum]
        snapped, prev = [], start - 0.01
        for i, t in enumerate(times):
            nxt = times[i + 1] if i + 1 < len(times) else end
            t2 = t if i == 0 else snap(t, prev + 0.08, nxt)
            snapped.append(round(max(t2, prev + 0.08), 3))
            prev = snapped[-1]
        lines_out.append({
            "slide": si, "line": li, "scene": sl["scene"],
            "start": round(start, 3), "end": round(end, 3),
            "show": round(sl["s"], 3), "hide": round(sl["e"], 3),
            "words": [{"w": w, "t": t} for w, t in zip(words, snapped)],
        })

out = {k: data[k] for k in ("title", "artist", "duration")}
out["slides"] = [{"s": sl["s"], "e": sl["e"], "scene": sl["scene"]} for sl in data["slides"]]
out["lines"] = lines_out
(HERE / "lyrics.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(f"lyrics.json: {len(lines_out)} lines")
for l in lines_out[:8]:
    print(f'{l["start"]:7.2f}-{l["end"]:7.2f}  ' + " ".join(f'{w["w"]}@{w["t"]:.2f}' for w in l["words"]))
