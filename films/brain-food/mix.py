#!/usr/bin/env python3
"""Sonification + pad + foley + voice -> out/mix.wav. Times from timeline.json (same as picture)."""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr
sys.path.insert(0, '/home/user/lemomo-ai/lemo-opuscar/core/audio'); import sfx
HERE = Path(__file__).parent; SR = 48000; DUR = 83.0; N = int(DUR * SR); tt = np.arange(N) / SR
TL = {l['id']: l for l in json.loads((HERE / 'timeline.json').read_text())}
nrm = lambda s: re.sub(r'[^a-z0-9.%]', '', s.lower())
def wt(k, w, nth=0):
    c = 0
    for x in TL[k]['words']:
        if nrm(x['w']).startswith(w):
            if c == nth: return x['t']
            c += 1
    raise KeyError(w)
def plonk(f, d=1.2, idx=1.0):   # low-pass-gate plonk: sine + FM, brighter with value
    t = np.arange(int(d * SR)) / SR; env = np.exp(-t / .35); mod = np.sin(2 * np.pi * f * 2.0 * t) * idx * np.exp(-t / .12)
    return np.sin(2 * np.pi * f * t + mod) * env
mus = np.zeros((N, 2)); fx = np.zeros((N, 2))
# pad: D major-ish detuned saws, very soft, low-passed; brightens slightly through the film
pad = np.zeros(N)
for f in [146.83, 220.0, 293.66, 369.99]:
    for d in (-.6, .6): pad += np.sign(np.sin(2 * np.pi * (f + d) * tt)) * .25 + np.sin(2 * np.pi * (f + d) * tt) * .5
pad = sfx.lp(pad, 900) * (.5 + .5 * np.clip(tt / 20, 0, 1)) * .018
mus += pad[:, None]
# sonification: one plonk per data mark, pitch = value (pentatonic low, higher = brighter)
marks = [(wt('v2', '145'), 121, .2), (wt('v3', '147'), 27, -.2), (wt('v4', '2.57'), 257 / 1.5, -.3), (wt('v4', '1.8.'), 183 / 1.5, .3), (wt('v4', '1.24'), 124 / 1.5, .3), (wt('v5', '120'), 75, 0)]
for t0, v, pan in marks:
    f = 220 * 2 ** (np.clip(v, 10, 200) / 100); sfx.add(mus, plonk(f, 1.4, .4 + v / 120), t0, .5, pan)
# walnut collapse: a falling plonk
for i, f in enumerate([523.3, 392, 293.7, 196, 130.8]): sfx.add(mus, plonk(f, .6, .3), wt('v4', 'less') + .4 + i * .12, .3, -.3)
# end: one plonk per food on the pull-back
for i, f in enumerate([293.7, 369.99, 440, 587.3, 740]): sfx.add(mus, plonk(f, 1.8, .6), TL['v6']['t0'] + 1.6 + i * .5, .35, -.4 + .2 * i)
# foley: ratchet on the spinach rescale, paper sweep on the morph, pencil scratches under handwriting
for i in range(5): sfx.add(fx, sfx.click(1.6, .7), wt('v2', '121%') - .2 + i * .1, .2)
sfx.add(fx, sfx.whoosh(.5, .6), wt('v4', 'less') + .4, .2)
sfx.add(fx, sfx.whoosh(.4, .5), wt('v4', 'dha') - .1, .15)
scr = lambda d: sfx.bp(sfx.noise(d), 2500, 8000) * (.55 + .45 * np.sin(np.linspace(0, d * 60, int(round(d * SR))))) * .5
for t0, d in [(.5, 2.8), (wt('v2', 'study'), 3.5), (wt('v2', '11'), 1.0), (wt('v3', 'quarter'), 1.0), (wt('v3', 'acetylcholine') - .3, 2.0), (wt('v4', 'less'), 1.2), (wt('v4', '15'), 2.0), (wt('v5', 'promising'), 2.0), (TL['v6']['t0'] + 1.6, 3.4)]:
    sfx.add(fx, scr(d), t0, .07)
for k in TL:   # section change: a soft paper slide
    sfx.add(fx, sfx.whoosh(.6, .4), TL[k]['t0'] - .9, .08)
# voice + ducking
voice = np.zeros(N); act = np.zeros(N)
for k, l in TL.items():
    a, sr = sf.read(HERE / f'voice/{k}.wav'); a = soxr.resample(a if a.ndim == 1 else a.mean(1), sr, SR)
    i = int(l['t0'] * SR); voice[i:i + len(a)] += a[:N - i]; act[max(0, i - 7200):i + len(a) + 12000] = 1
voice = sfx.compress(voice, .2, 3.5); voice = voice / np.abs(voice).max() * .85
kk = int(.12 * SR); duck = np.convolve(act, np.ones(kk) / kk, 'same'); g = 1 - duck * (1 - 10 ** (-11 / 20))
mix = mus * g[:, None] * .7 + fx * .6 + voice[:, None] * .9
mix = np.stack([sfx.limit(mix[:, 0], .95), sfx.limit(mix[:, 1], .95)], 1)
(HERE / 'out').mkdir(exist_ok=True); sf.write(HERE / 'out/mix.wav', mix.astype(np.float32), SR); print('ok')
