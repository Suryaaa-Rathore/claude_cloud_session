#!/usr/bin/env python3
"""Bed + clockwork + ostinato + foley + voice -> out/mix.wav. Times from timeline.json (same as the picture)."""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr
sys.path.insert(0, '/home/user/lemomo-ai/lemo-opuscar/core/audio')
import sampler as Smp, sfx
HERE = Path(__file__).parent; SR = 48000; DUR = 63.4; N = int(DUR * SR)
TL = {l['id']: l for l in json.loads((HERE / 'timeline.json').read_text())}
def wt(k, w):
    for x in TL[k]['words']:
        if x['w'].lower().strip('.,').startswith(w): return x['t']
    return TL[k]['t0']
t_ = np.arange(N) / SR
# —— bed: low D (contrabass-like drone), very quiet, slow swell ——
bed = sum(a * np.sin(2 * np.pi * f * t_ + p) for f, a, p in [(36.71, 1, 0), (73.42, .5, 1), (110.0, .18, 2), (146.8, .08, .5)])
bed *= .5 + .5 * np.sin(2 * np.pi * t_ / 9) ** 2
bed = sfx.lp(bed, 400) * .08
# —— clockwork: a pendulum tick every 0.5 s in the document sections, accent every 4 ——
ticks = np.zeros((N, 2))
s1, s5 = TL['v2']['t0'] - .4, TL['v5']['t0']
k = 0
for tt in np.arange(s1, s5, .5):
    sfx.add(ticks, sfx.click(.7 if k % 4 else .9, .6), tt, .14 if k % 4 else .22, .15 * (-1) ** k); k += 1
# —— ostinato: soft plucked bass eighths on Dm – Bb – Gm – A ——
Smp.seed(3); ev = []
ch = [['D2', 'A2', 'D3', 'F3'], ['A#1', 'F2', 'A#2', 'D3'], ['G1', 'D2', 'G2', 'A#2'], ['A1', 'E2', 'A2', 'C#3']]
B = .5
for i, tt in enumerate(np.arange(TL['v2']['t0'], TL['v6']['t0'] + 6, B / 2)):
    c = ch[int(i // 8) % 4]; ev.append((tt, 'electric_bass', c[i % 4], B * .45, .32, .2 * ((i % 2) * 2 - 1)))
# verdict: sustained Dm add9 on the evidence map
for j, p in enumerate(['D3', 'A3', 'E4', 'F4', 'A4']): ev.append((TL['v6']['t0'] + j * .06, 'hang', p, 6, .42, -.3 + .15 * j))
music = Smp.render(ev, dur=DUR, master=True); music = music / (np.abs(music).max() + 1e-9) * .35
# —— foley: paper/shutter at each source cut-in, a mallet note on each tick badge, pencil on the assembly ——
fx = np.zeros((N, 2))
paper = lambda: sfx.bp(sfx.noise(.35), 1500, 7000) * sfx.env_exp(.35, .09)
shutter = lambda: sfx.click(1.4, 1.0)
cuts = [TL['v2']['t0'], wt('v2', 'alternating') - .3, TL['v3']['t0'], wt('v3', 'spider') - .9, TL['v4']['t0'], wt('v4', 'corrugated') - .8, TL['v6']['t0'] + .1, TL['v6']['t0'] + .35, TL['v6']['t0'] + .6]
for i, c in enumerate(cuts): sfx.add(fx, shutter() if i % 2 == 0 else paper(), c, .3)
mallet = lambda f: np.sin(2 * np.pi * f * sfx.t_(.8)) * sfx.env_exp(.8, .18) + .3 * np.sin(2 * np.pi * f * 3.9 * sfx.t_(.8)) * sfx.env_exp(.8, .05)
for i, tt in enumerate([wt('v2', 'magnet'), wt('v2', 'vibrate'), wt('v3', 'conical'), wt('v3', 'sideways'), wt('v4', 'corrugated')]): sfx.add(fx, mallet([587.3, 659.3, 698.5, 784, 880][i]), tt + .1, .18)
for w in ['magnet', 'frame', 'spider', 'coil', 'cone', 'surround']:
    tt = wt('v5', w) - .15; x = sfx.bp(sfx.noise(.45), 2500, 8000) * (.6 + .4 * np.sin(np.linspace(0, 40, int(.45 * SR)))) * sfx.env_exp(.45, .2); sfx.add(fx, x, tt, .12)
for i in range(3): sfx.add(fx, mallet([587.3, 698.5, 880][i]), TL['v6']['t0'] + 1.3 + i * .12, .15)
# —— voice ——
voice = np.zeros(N); act = np.zeros(N)
for kk, l in TL.items():
    a, sr = sf.read(HERE / f'voice/{kk}.wav'); a = soxr.resample(a if a.ndim == 1 else a.mean(1), sr, SR)
    i = int(l['t0'] * SR); voice[i:i + len(a)] += a[:N - i]; act[max(0, i - 7200):i + len(a) + 12000] = 1
voice = sfx.compress(voice, .2, 3.5); voice = voice / np.abs(voice).max() * .85
kk = int(.12 * SR); duck = np.convolve(act, np.ones(kk) / kk, 'same'); g = 1 - duck * (1 - 10 ** (-9 / 20))
mix = (music + ticks + bed[:, None]) * g[:, None] * .6 + fx * .55 + voice[:, None] * .9
mix = np.stack([sfx.limit(mix[:, 0], .95), sfx.limit(mix[:, 1], .95)], 1)
(HERE / 'out').mkdir(exist_ok=True); sf.write(HERE / 'out/mix.wav', mix.astype(np.float32), SR); print('ok', mix.shape)
