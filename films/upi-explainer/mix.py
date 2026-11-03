#!/usr/bin/env python3
"""Score + foley + voice → out/mix.wav (48 kHz stereo). Times come from timeline.json (the same numbers the picture uses)."""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr

LIB = Path('/home/user/lemomo-ai/lemo-opuscar')
sys.path.insert(0, str(LIB / 'core/audio'))
import sampler as Smp
import sfx

HERE = Path(__file__).parent
SR = 48000
DUR = 56.0
TL = {l['id']: l for l in json.loads((HERE / 'timeline.json').read_text())}
wt = lambda k, i: TL[k]['words'][min(i, len(TL[k]['words']) - 1)]['t']
T = dict(scan=.9, paid=wt('l1', 12) - .1, pull0=7.4, appPin=wt('l2', 9), r1=wt('l3', 0) + .2, r2=wt('l3', 4), cut=wt('l3', 6) + .2,
         r3=wt('l4', 0) + .3, pinOk=wt('l4', 13), balOk=wt('l4', 20), debit=wt('l5', 2), r4=wt('l6', 2), credit=wt('l6', 8),
         ok1=wt('l7', 2), ok2=wt('l7', 4), big0=TL['l8']['t0'] - .6, fill=TL['l8']['t0'] + .4, fillEnd=wt('l8', 7) + .3,
         day=wt('l8', 10), end=TL['l9']['t0'] - .4)

Smp.seed(7)
BPM = 100; B = 60 / BPM
ev = []
# —— harmony: D major pentatonic world, I–vi–IV–V loop (D, Bm, G, A), 2 bars each chord = 8 beats ——
prog = [('D', ['D3', 'A3', 'F#4']), ('B', ['B2', 'F#3', 'D4']), ('G', ['G2', 'D3', 'B3']), ('A', ['A2', 'E3', 'C#4'])]
motif = ['F#5', 'A5', 'D5', 'E5', 'F#5', 'E5', 'D5', 'A4']
t0 = .2
nbeats = int((DUR - 3) / B)
for b in range(nbeats):
    t = t0 + b * B
    ch = prog[(b // 8) % 4]
    big = t >= T['big0'] and t < T['end']
    if t >= T['end'] + 1.5: break
    # kalimba ostinato on 8ths (sparse in the hook)
    for h in (0, 1):
        tt = t + h * B / 2
        if tt < T['pull0'] and (b * 2 + h) % 3: continue
        p = motif[(b * 2 + h) % 8]
        ev.append((tt, 'kalimba', p, .5, .5 if not big else .6, .25 * (1 if h else -1)))
    # hang chord on each bar
    if b % 4 == 0 and t > T['pull0'] - .2:
        for k, p in enumerate(ch[1]): ev.append((t + k * .03, 'hang', p, 2.4, .45, -.2 + .2 * k))
    # bass on beats 1 and 3
    if t > T['pull0'] and b % 2 == 0: ev.append((t, 'electric_bass', ch[1][0].replace('3', '2') if '3' in ch[1][0] else ch[1][0], B * 1.6, .55, 0))
    # nylon guitar off-beat strum during the process section
    if T['r1'] - .5 < t < T['big0'] and b % 2 == 1: ev.append((t + B / 2, 'guitar_nylon', ch[1][2], .4, .35, .3))
# Isotype fill: a rising kalimba run, one note per wave of icons
scale = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6']
n = 16
for k in range(n):
    tt = T['fill'] + (T['fillEnd'] - T['fill']) * (k / (n - 1)) ** 1.4
    ev.append((tt, 'kalimba', scale[k % 8], .6, .55, -.4 + .8 * k / n))
# "800 million a day": a soft single hang chord
for k, p in enumerate(['D3', 'A3', 'F#4', 'A4']): ev.append((T['day'] + k * .04, 'hang', p, 3.0, .5, 0))
# end chord
for k, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4']): ev.append((T['end'] + .6 + k * .05, 'hang', p, 5.0, .5, -.3 + .15 * k))
music = Smp.render(ev, dur=DUR, master=True)
music = music / (np.abs(music).max() + 1e-9) * .5

# shaker (synth): 16ths during the process section
sh = np.zeros((int(DUR * SR), 2))
for b in range(int((T['big0'] - T['pull0']) / (B / 4))):
    tt = T['pull0'] + b * B / 4
    x = sfx.hp(sfx.noise(.06), 5000) * sfx.env_exp(.06, .015) * (.5 if b % 2 else .25)
    sfx.add(sh, x, tt, .12, .2)
music = music + sh

# —— foley on the picture's events ——
fx = np.zeros((int(DUR * SR), 2))
sfx.add(fx, sfx.click(1.2, .8), T['scan'], .5)
for k in range(6): sfx.add(fx, sfx.click(1.6, .4), 2.7 + k * ((T['paid'] - .25 - 2.7) / 6), .25)
for tt in (T['paid'], T['pinOk'], T['balOk'], T['ok1'], T['ok2']): sfx.add(fx, sfx.ding(.8), tt, .35)
sfx.add(fx, sfx.whoosh(.6, .8), T['pull0'], .35)
for tt in (T['r1'], T['r2'], T['r3'], T['r4']): sfx.add(fx, sfx.whoosh(.35, .5), tt, .2)
sfx.add(fx, sfx.creak(.6), T['cut'], .2)
coin = lambda: sfx.hp(sfx.noise(.25), 2500) * sfx.env_exp(.25, .05) * .4 + np.sin(2 * np.pi * 3100 * sfx.t_(.25)) * sfx.env_exp(.25, .07) * .5
sfx.add(fx, coin(), T['debit'] + .3, .35); sfx.add(fx, coin(), T['credit'] + .3, .35)
for k in range(12): sfx.add(fx, sfx.pop(.5), T['fill'] + (T['fillEnd'] - T['fill']) * k / 12, .12, -.5 + k / 12)

# —— voice ——
voice = np.zeros(int(DUR * SR))
act = np.zeros(int(DUR * SR))
for k, l in TL.items():
    a, sr = sf.read(HERE / f'voice/{k}.wav')
    if a.ndim > 1: a = a.mean(1)
    a = soxr.resample(a, sr, SR)
    i = int(l['t0'] * SR); voice[i:i + len(a)] += a[:len(voice) - i]
    act[max(0, i - int(.15 * SR)):i + len(a) + int(.25 * SR)] = 1
voice = sfx.compress(voice, thr=.2, ratio=3.5)
voice = voice / (np.abs(voice).max() + 1e-9) * .85
# duck music ~8 dB under the voice (smoothed)
k = int(.12 * SR); duck = np.convolve(act, np.ones(k) / k, 'same')
g = 1 - duck * (1 - 10 ** (-8 / 20))
mix = music * g[:, None] * .55 + fx * .6 + voice[:, None] * .9
mix = sfx.limit(mix, .95) if mix.ndim == 1 else np.stack([sfx.limit(mix[:, 0], .95), sfx.limit(mix[:, 1], .95)], 1)
(HERE / 'out').mkdir(exist_ok=True)
sf.write(HERE / 'out/mix.wav', mix.astype(np.float32), SR)
print('mix.wav', mix.shape, 'peak', float(np.abs(mix).max()))
print(Smp.credits(['kalimba', 'hang', 'guitar_nylon', 'electric_bass']))
