#!/usr/bin/env python3
"""Builds index.html (Hyperframes) for the 'Dil De Baithi' lyric video — v2.

  python3 build.py                 # full video
  python3 build.py --range 20 60   # only 20s..60s (quick preview, audio stays in sync)

Layers per scene:
  1. an illustrated background environment (SVG layers with parallax pan + slow zoom)
  2. 1-3 hero items: animated Noto emoji (Lottie) or Fluent 3D images, choreographed to words
  3. lyrics: karaoke sweep under each word for exactly as long as it is sung
"""
import html
import json
import math
import random
import sys
from pathlib import Path

HERE = Path(__file__).parent
L = json.loads((HERE / "lyrics.json").read_text(encoding="utf-8"))
BEATS = json.loads((HERE / "beats.json").read_text())
T0, T1 = 0.0, float(L["duration"])
if "--range" in sys.argv:
    i = sys.argv.index("--range")
    T0, T1 = float(sys.argv[i + 1]), float(sys.argv[i + 2])
DUR = round(T1 - T0, 3)
W, H = 1920, 1080
esc = html.escape
CHORUS = {"heart", "hearts", "finale"}


def rt(t):
    return round(t - T0, 3)


def beats_in(a, b, key="beats"):
    return [t for t in BEATS[key] if a <= t < b]


# =================================================================== backgrounds (SVG)
def svg(body, vb=f"0 0 {W} {H}", cls="layer", style=""):
    return f'<svg class="{cls}" viewBox="{vb}" preserveAspectRatio="xMidYMid slice" style="{style}">{body}</svg>'


def grad_sky(stops, gid):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">{s}</linearGradient></defs><rect width="{W}" height="{H}" fill="url(#{gid})"/>'


def hills(rng, y, amp, color, n=5, w=2400):
    pts = [(-200, H + 50), (-200, y)]
    for i in range(n + 1):
        x = -200 + i * (w / n)
        pts.append((x, y - amp * (0.4 + 0.6 * rng.random())))
    pts += [(w, y), (w, H + 50)]
    d = f"M{pts[0][0]},{pts[0][1]} L{pts[1][0]},{pts[1][1]} "
    for i in range(2, len(pts) - 2):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        d += f"Q{x0 + (x1 - x0) / 2:.0f},{y1 - 40:.0f} {x1:.0f},{y1:.0f} "
    d += f"L{pts[-2][0]},{pts[-2][1]} L{pts[-1][0]},{pts[-1][1]} Z"
    return f'<path d="{d}" fill="{color}"/>'


def cloud(x, y, s, color, op):
    return (f'<g opacity="{op}" fill="{color}" transform="translate({x:.0f},{y:.0f}) scale({s:.2f})">'
            '<ellipse cx="0" cy="0" rx="120" ry="45"/><ellipse cx="-60" cy="-20" rx="70" ry="50"/>'
            '<ellipse cx="50" cy="-35" rx="80" ry="60"/><ellipse cx="110" cy="0" rx="70" ry="38"/></g>')


def stars_svg(rng, n, ymax=650):
    return "".join(f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(0, ymax):.0f}" r="{rng.uniform(0.8, 2.6):.1f}" fill="#fff" opacity="{rng.uniform(0.4, 1):.2f}"/>'
                   for _ in range(n))


def tree(x, y, s, color):
    return (f'<g transform="translate({x},{y}) scale({s:.2f})" fill="{color}"><rect x="-8" y="-10" width="16" height="120"/>'
            '<circle cx="0" cy="-60" r="70"/><circle cx="-55" cy="-20" r="50"/><circle cx="55" cy="-25" r="55"/></g>')


def palm(x, y, s, color):
    leaves = "".join(f'<path d="M0,-200 q{dx},{dy} {dx * 2},{dy + 60}" stroke="{color}" stroke-width="16" fill="none" stroke-linecap="round"/>'
                     for dx, dy in [(-80, -30), (80, -30), (-60, -70), (60, -70), (-90, 10), (90, 10)])
    return f'<g transform="translate({x},{y}) scale({s:.2f})"><path d="M0,0 q-10,-100 0,-200" stroke="{color}" stroke-width="18" fill="none"/>{leaves}</g>'


def hut(x, y, s, color, lit=True):
    win = '<rect x="-15" y="-55" width="30" height="30" fill="#ffd36b" opacity="0.9"/>' if lit else ""
    return (f'<g transform="translate({x},{y}) scale({s:.2f})"><rect x="-70" y="-80" width="140" height="80" fill="{color}"/>'
            f'<path d="M-90,-80 L0,-150 L90,-80 Z" fill="{color}"/>{win}</g>')


def env(kind, rng, uid):
    """Returns list of (html, parallax_px, start_zoom) layers, back -> front."""
    g = lambda n: f"{uid}{n}"
    out = []
    if kind == "sunset":
        out.append((svg(grad_sky([(0, "#2d1b5e"), (0.45, "#b2457a"), (0.75, "#f48a63"), (1, "#ffd28a")], g("s"))
                        + f'<defs><radialGradient id="{g("sg")}"><stop offset="0" stop-color="#fff6d6"/><stop offset="0.45" stop-color="#ffe3a3"/><stop offset="0.6" stop-color="#ffd28a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffd28a" stop-opacity="0"/></radialGradient></defs><circle cx="960" cy="720" r="420" fill="url(#{g("sg")})"/>'), 0, 1.06))
        out.append((svg("".join(cloud(rng.uniform(0, W), rng.uniform(80, 380), rng.uniform(0.6, 1.3), "#ffd6e6", 0.35) for _ in range(7))), 140, 1.04))
        out.append((svg(hills(rng, 800, 120, "#6b2d6b") + hills(rng, 880, 100, "#4a1f55")), 60, 1.03))
        out.append((svg(hills(rng, 960, 90, "#2c1238") + "".join(palm(x, 1000, rng.uniform(0.7, 1.0), "#1b0a24") for x in (180, 1720, 1550))), 120, 1.02))
    elif kind == "love":
        out.append((svg(f'<defs><radialGradient id="{g("l")}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#ff7aa8"/><stop offset="0.5" stop-color="#c2185b"/><stop offset="1" stop-color="#3d0a2a"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#{g("l")})"/>'), 0, 1.08))
        out.append(('<div class="rays"></div>', 0, 1.0))
        out.append((svg("".join(f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(0, H):.0f}" r="{rng.uniform(20, 90):.0f}" fill="#ffd1e3" opacity="{rng.uniform(0.06, 0.18):.2f}"/>' for _ in range(28))), 220, 1.05))
    elif kind == "night":
        out.append((svg(grad_sky([(0, "#030716"), (0.6, "#13235c"), (1, "#3b3478")], g("n")) + stars_svg(rng, 160)
                        + f'<defs><radialGradient id="{g("mg")}"><stop offset="0" stop-color="#fff6c9" stop-opacity="0.35"/><stop offset="1" stop-color="#fff6c9" stop-opacity="0"/></radialGradient></defs><circle cx="1500" cy="220" r="320" fill="url(#{g("mg")})"/>'), 30, 1.05))
        out.append((svg(hills(rng, 830, 80, "#151a3f")), 60, 1.03))
        out.append((svg("".join(hut(x, 900, rng.uniform(0.7, 1.1), "#0b0e26", rng.random() > 0.3) for x in (220, 420, 1380, 1620))
                        + "".join(tree(x, 900, rng.uniform(0.8, 1.2), "#0a0c22") for x in (90, 620, 1200, 1820))
                        + f'<rect y="900" width="{W}" height="200" fill="#080a1d"/>'), 130, 1.02))
        out.append((svg("".join(f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(600, 1000):.0f}" r="{rng.uniform(2, 4):.1f}" fill="#fff7a8" opacity="0.8"/>' for _ in range(30)), cls="layer fireflies"), 260, 1.0))
    elif kind == "rooftop":
        out.append((svg(grad_sky([(0, "#2b5876"), (0.55, "#b06ea0"), (1, "#ffb48a")], g("r"))
                        + "".join(cloud(rng.uniform(0, W), rng.uniform(60, 300), rng.uniform(0.6, 1.1), "#ffe0ea", 0.3) for _ in range(5))), 60, 1.05))
        roofs = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{H - y}" fill="{c}"/>' for x, y, w, c in
                        [(0, 640, 300, "#3c2f55"), (280, 560, 260, "#463764"), (520, 690, 320, "#3c2f55"), (1180, 600, 300, "#463764"), (1460, 520, 260, "#3c2f55"), (1700, 650, 260, "#463764")])
        tanks = "".join(f'<rect x="{x}" y="{y}" width="70" height="80" rx="10" fill="#2a2140"/>' for x, y in [(330, 480), (1520, 440)])
        out.append((svg(roofs + tanks), 110, 1.03))
        line = ('<path d="M120,780 Q960,860 1800,770" stroke="#20182f" stroke-width="5" fill="none"/>'
                + "".join(f'<path d="M{x},{805 - abs(960 - x) * 0.04:.0f} l30,0 l10,110 l-50,0 Z" fill="{c}" opacity="0.95"/>'
                          for x, c in [(420, "#e84a5f"), (560, "#f9c74f"), (1280, "#43aa8b"), (1420, "#f3722c")]))
        out.append((svg(f'<rect y="900" width="{W}" height="180" fill="#2a2140"/><rect y="880" width="{W}" height="26" fill="#3a2d55"/>' + line), 180, 1.02))
    elif kind == "field":
        out.append((svg(grad_sky([(0, "#4fa3e0"), (0.6, "#a7d8f5"), (1, "#fff3c4")], g("f"))
                        + f'<defs><radialGradient id="{g("fs")}"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.35" stop-color="#fff6c9"/><stop offset="0.5" stop-color="#fff6c9" stop-opacity="0.35"/><stop offset="1" stop-color="#fff6c9" stop-opacity="0"/></radialGradient></defs><circle cx="1550" cy="180" r="300" fill="url(#{g("fs")})"/>'
                        + "".join(cloud(rng.uniform(0, W), rng.uniform(60, 330), rng.uniform(0.7, 1.3), "#ffffff", 0.85) for _ in range(6))), 120, 1.05))
        out.append((svg(hills(rng, 700, 60, "#6aa84f") + "".join(tree(x, 700, rng.uniform(0.5, 0.8), "#3f7d2c") for x in (150, 500, 1300, 1750))), 60, 1.03))
        rows = "".join(f'<path d="M-100,{720 + k * 45} Q960,{700 + k * 45} 2100,{720 + k * 45} L2100,{760 + k * 45} Q960,{740 + k * 45} -100,{760 + k * 45} Z" fill="{["#f2c230", "#e8b420", "#ffd84d"][k % 3]}"/>' for k in range(9))
        dots = "".join(f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(730, 1080):.0f}" r="{rng.uniform(4, 9):.0f}" fill="#fff59d" opacity="0.8"/>' for _ in range(120))
        out.append((svg(rows + dots), 160, 1.02))
    elif kind == "rain":
        out.append((svg(grad_sky([(0, "#3b4a63"), (0.6, "#6b7b93"), (1, "#9aa6b8")], g("w"))
                        + "".join(cloud(rng.uniform(0, W), rng.uniform(40, 260), rng.uniform(1.0, 1.8), "#4c5a70", 0.9) for _ in range(9))), 80, 1.04))
        out.append((svg(hills(rng, 880, 70, "#46536a") + "".join(tree(x, 900, 1.0, "#38445a") for x in (200, 1700))), 60, 1.02))
        out.append(('<div class="rainfx"></div>', 0, 1.0))
        out.append(('<div class="sunbreak"></div>', 0, 1.0))
    elif kind == "room":
        out.append((svg(f'<rect width="{W}" height="{H}" fill="#3a1c2c"/>'
                        + '<rect x="560" y="120" width="800" height="560" rx="12" fill="#1d1238"/>' + stars_svg(rng, 40, 600).replace("<circle", '<circle clip-path="none"')
                        + '<rect x="560" y="120" width="800" height="560" rx="12" fill="none" stroke="#7a4a3a" stroke-width="22"/>'
                        + '<rect x="950" y="120" width="20" height="560" fill="#7a4a3a"/>'
                        + '<path d="M420,90 Q520,400 470,760 L380,760 L380,90 Z" fill="#a8324f"/><path d="M1500,90 Q1400,400 1450,760 L1540,760 L1540,90 Z" fill="#a8324f"/>'
                        + f'<rect y="760" width="{W}" height="320" fill="#24101c"/>'), 50, 1.05))
        ys = lambda x: 100 + 40 * math.sin(x / 160)
        bulbs = "".join(f'<circle cx="{x}" cy="{ys(x):.0f}" r="11" fill="#ffd36b"/><circle cx="{x}" cy="{ys(x):.0f}" r="30" fill="#ffd36b" opacity="0.18"/>' for x in range(60, 1900, 110))
        out.append((svg('<path d="M0,90 ' + " ".join(f"L{x},{ys(x):.0f}" for x in range(0, 1960, 40)) + '" stroke="#5a3a2a" stroke-width="3" fill="none"/>' + bulbs, cls="layer bulbs"), 90, 1.02))
    elif kind == "snow":
        out.append((svg(grad_sky([(0, "#7f9cf5"), (0.6, "#b9cdfc"), (1, "#eef3ff")], g("o"))), 0, 1.05))
        mts = "".join(f'<path d="M{x - w},{760} L{x},{760 - h} L{x + w},{760} Z" fill="#5869a8"/>'
                      f'<path d="M{x - w * 0.28:.0f},{760 - h * 0.72:.0f} L{x},{760 - h} L{x + w * 0.28:.0f},{760 - h * 0.72:.0f} L{x + w * 0.1:.0f},{760 - h * 0.66:.0f} L{x - w * 0.08:.0f},{760 - h * 0.74:.0f} Z" fill="#ffffff"/>'
                      for x, w, h in [(300, 420, 460), (900, 520, 560), (1500, 460, 480), (1900, 400, 380)])
        out.append((svg(mts), 70, 1.03))
        pines = "".join(f'<path d="M{x},{y} l-40,90 h25 l-45,80 h120 l-45,-80 h25 Z" fill="#2f4a6b"/>' for x, y in [(140, 760), (260, 790), (1660, 770), (1790, 800), (720, 820)])
        out.append((svg(f'<path d="M0,820 Q960,760 1920,830 L1920,1080 L0,1080 Z" fill="#f4f8ff"/>' + pines), 140, 1.02))
    elif kind == "golden":
        out.append((svg(grad_sky([(0, "#fff4cf"), (0.5, "#f9c74f"), (1, "#c96f2a")], g("g"))), 0, 1.05))
        out.append(('<div class="rays rays-gold"></div>', 0, 1.0))
        temple = ('<path d="M760,760 L760,600 L860,600 L860,520 Q960,380 1060,520 L1060,600 L1160,600 L1160,760 Z" fill="#a8541f" opacity="0.55"/>'
                  '<path d="M955,370 L960,330 L965,370 Z" fill="#a8541f" opacity="0.55"/>')
        out.append((svg(hills(rng, 860, 50, "#c9772f") + temple + hills(rng, 960, 40, "#9a4e1c")), 80, 1.02))
    elif kind == "stage":
        out.append((svg(f'<rect width="{W}" height="{H}" fill="#12061f"/>'), 0, 1.0))
        out.append(('<div class="beams"><i></i><i></i><i></i><i></i><i></i></div>', 0, 1.0))
        out.append((svg(f'<rect y="900" width="{W}" height="180" fill="#1d0b30"/>' + "".join(f'<circle cx="{x}" cy="{1000 + (x % 3) * 20}" r="70" fill="#090312"/>' for x in range(40, 1960, 120))), 100, 1.02))
    elif kind == "mandala":
        out.append((svg(f'<defs><radialGradient id="{g("m")}" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3fa9f5"/><stop offset="0.55" stop-color="#0d3c8c"/><stop offset="1" stop-color="#050f2e"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#{g("m")})"/>'), 0, 1.04))
        petals = "".join(f'<ellipse cx="0" cy="-260" rx="60" ry="200" transform="rotate({a})" fill="none" stroke="#8fd3ff" stroke-width="3" opacity="0.5"/>' for a in range(0, 360, 20))
        rings = "".join(f'<circle r="{r}" fill="none" stroke="#bfe9ff" stroke-width="2" opacity="0.35"/>' for r in (120, 200, 330, 470))
        inner = f'<g transform="translate(500,500)">{petals}{rings}</g>'
        out.append((f'<div class="mandala">{svg(inner, vb="0 0 1000 1000", cls="mandala-svg")}</div>', 0, 1.0))
    elif kind == "dark":
        out.append((svg(f'<defs><radialGradient id="{g("d")}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#4a1f3a"/><stop offset="1" stop-color="#12060f"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#{g("d")})"/>'
                        + stars_svg(rng, 60)), 40, 1.05))
    return out


# =================================================================== scene object
class Scene:
    def __init__(self, idx, sid, s, e, lines):
        self.idx, self.id, self.s, self.e, self.lines = idx, f"sc{idx}", s, e, lines
        self.h, self.j, self.n = [], [], 0
        self.rng = random.Random(f"{sid}-{s}")

    def wt(self, word, nth=0, default=None):
        hits = [w["t"] for l in self.lines for w in l["words"] if word.lower() in w["w"].lower()]
        return hits[nth] if len(hits) > nth else (self.s + 0.6 if default is None else default)

    def in_win(self, at):
        return self.s - 1.5 <= at <= self.e + 1.5

    def tw(self, sel, frm, to, at):
        if self.in_win(at):
            self.j.append(f'tl.fromTo("{sel}", {frm}, {to}, {rt(at)});')

    def to(self, sel, to, at):
        if self.in_win(at):
            self.j.append(f'tl.to("{sel}", {to}, {rt(at)});')

    def background(self, kind):
        dur = self.e - self.s + 1.5
        for k, (html_, par, zoom) in enumerate(env(kind, self.rng, self.id)):
            lid = f"{self.id}-bg{k}"
            self.h.append(f'<div class="bgl" id="{lid}">{html_}</div>')
            if par or zoom != 1.0:
                self.tw(f"#{lid}", f"{{x:{par / 2:.0f}, scale:{zoom}}}", f"{{x:{-par / 2:.0f}, scale:1, duration:{dur:.2f}, ease:'none'}}", self.s - 0.3)
        if kind == "mandala":
            self.tw(f"#{self.id} .mandala", "{rotation:0}", f"{{rotation:60, duration:{dur:.2f}, ease:'none'}}", self.s)
        if kind == "rain":
            self.tw(f"#{self.id} .rainfx", "{y:-300}", "{y:0, duration:0.5, ease:'none', repeat:" + str(int(dur / 0.5)) + "}", self.s)
        if kind in ("love", "golden"):
            self.tw(f"#{self.id} .rays", "{rotation:-10}", f"{{rotation:25, duration:{dur:.2f}, ease:'none'}}", self.s)
        if kind == "stage":
            for k in range(5):
                self.tw(f"#{self.id} .beams i:nth-child({k + 1})", f"{{rotation:{-25 + k * 12}}}",
                        f"{{rotation:{25 - k * 12}, duration:1.8, yoyo:true, repeat:{int(dur / 1.8)}, ease:'sine.inOut'}}", self.s)
        if kind == "room":
            self.tw(f"#{self.id} .bulbs", "{opacity:0.7}", f"{{opacity:1, duration:0.6, yoyo:true, repeat:{int(dur / 0.6)}, ease:'sine.inOut'}}", self.s)
        if kind == "night":
            self.tw(f"#{self.id} .fireflies", "{y:0, opacity:0.5}", f"{{y:-60, opacity:1, duration:1.5, yoyo:true, repeat:{int(dur / 1.5)}, ease:'sine.inOut'}}", self.s)

    def item(self, kind, name, x, y, size, at, out=None, enter="pop"):
        """kind: 'lot' (animated Noto emoji, Lottie) or 'img' (Fluent 3D png)."""
        self.n += 1
        eid = f"{self.id}-i{self.n}"
        inner = f'<div class="lot" data-lottie="{name}"></div>' if kind == "lot" else f'<img src="assets/img/{name}.png" alt="">'
        self.h.append(f'<div id="{eid}" class="item" style="left:{x - size / 2:.0f}px;top:{y - size / 2:.0f}px;width:{size}px;height:{size}px;opacity:0">'
                      f'<div class="shadow"></div><div class="bob">{inner}</div></div>')
        sel = "#" + eid
        enters = {
            "pop": ("{opacity:0, scale:0.3, y:40, rotation:-12}", "{opacity:1, scale:1, y:0, rotation:0, duration:0.7, ease:'back.out(1.8)'}"),
            "drop": ("{opacity:1, y:-700}", "{opacity:1, y:0, duration:0.9, ease:'bounce.out'}"),
            "left": ("{opacity:0, x:-500}", "{opacity:1, x:0, duration:0.8, ease:'power3.out'}"),
            "right": ("{opacity:0, x:500}", "{opacity:1, x:0, duration:0.8, ease:'power3.out'}"),
            "rise": ("{opacity:0, y:300}", "{opacity:1, y:0, duration:1.2, ease:'power2.out'}"),
        }
        self.tw(sel, *enters[enter], at)
        end = out if out else self.e
        reps = int((end - at - 0.7) / 1.6)
        if reps > 0:
            self.tw(sel + " .bob", "{y:0}", f"{{y:-14, duration:0.8, yoyo:true, repeat:{reps}, ease:'sine.inOut'}}", at + 0.7)
        if out:
            self.to(sel, "{opacity:0, scale:0.6, duration:0.35, ease:'power2.in'}", out)
        return sel

    def burst(self, x, y, at, color="#ffe066", n=10, r=260):
        for k in range(n):
            self.n += 1
            eid = f"{self.id}-b{self.n}"
            a = 2 * math.pi * k / n
            self.h.append(f'<i id="{eid}" class="spark" style="left:{x}px;top:{y}px;background:{color};color:{color}"></i>')
            self.tw("#" + eid, "{x:0, y:0, opacity:1, scale:1}", f"{{x:{math.cos(a) * r:.0f}, y:{math.sin(a) * r * 0.6:.0f}, opacity:0, scale:0.2, duration:0.9, ease:'power3.out'}}", at)

    def ring(self, x, y, at, color="#ffffff"):
        self.n += 1
        eid = f"{self.id}-r{self.n}"
        self.h.append(f'<i id="{eid}" class="ringfx" style="left:{x - 150}px;top:{y - 150}px;border-color:{color}"></i>')
        self.tw("#" + eid, "{scale:0.2, opacity:0.9}", "{scale:1.6, opacity:0, duration:0.9, ease:'power2.out'}", at)

    def pulse(self, sel, a, b, amt=1.08, every=2):
        for k, t in enumerate(beats_in(a, b)):
            if k % every == 0 and self.in_win(t):
                self.j.append(f'tl.fromTo("{sel} .bob", {{scale:1}}, {{scale:{amt}, duration:0.11, yoyo:true, repeat:1, ease:"power1.out"}}, {rt(t)});')


# =================================================================== scenes
CX = 960


def sc_intro(S):
    S.background("sunset")
    S.h.append('<div class="titlebox">' + "".join(
        '<span class="tword">' + "".join(f'<span class="tch">{esc(c)}</span>' for c in w) + "</span>" for w in "Dil De Baithi".split()) + "</div>")
    S.h.append('<div class="artistline">Dhanda Nyoliwala</div>')
    S.tw(f"#{S.id} .tch", "{y:-600, opacity:0, rotation:-25}", "{y:0, opacity:1, rotation:0, duration:0.8, ease:'bounce.out', stagger:0.42}", 3.0)
    S.tw(f"#{S.id} .artistline", "{opacity:0, y:40}", "{opacity:1, y:0, duration:1, ease:'power2.out'}", 8.6)
    S.item("lot", "1f54a_fe0f", 300, 330, 140, 12.0, enter="left")
    S.item("lot", "1f54a_fe0f", 1620, 300, 120, 13.0, enter="right")
    for t in beats_in(12, S.e - 1.2, "downbeats"):
        S.j.append(f'tl.fromTo("#{S.id} .titlebox", {{scale:1}}, {{scale:1.04, duration:0.12, yoyo:true, repeat:1}}, {rt(t)});')
    S.to(f"#{S.id} .titlebox, #{S.id} .artistline", "{opacity:0, y:-60, duration:0.6, ease:'power2.in'}", S.e - 1.0)


def sc_heart(S):
    S.background("love")
    t = S.wt("etbaar")
    h = S.item("lot", "2764_fe0f", CX, 320, 300, S.s + 0.1, out=t - 0.05)
    S.pulse(h, S.s + 0.6, t - 0.1, 1.1, every=1)
    S.item("lot", "1f494", CX, 320, 300, t - 0.05, out=S.wt("baat") + 0.2)
    h2 = S.item("lot", "1f496", CX, 320, 300, S.wt("baat") + 0.2)
    S.pulse(h2, S.wt("baat") + 0.8, S.e, 1.1, every=1)
    S.ring(CX, 320, S.wt("dil"), "#ffd1e0")
    S.item("lot", "1faf6", 1420, 360, 190, S.wt("baithi") - 0.2, enter="right")
    S.burst(CX, 320, S.wt("baithi"), "#ffd1e0")


def sc_hearts(S):
    S.background("love")
    h = S.item("lot", "1f49e", CX, 310, 290, S.s + 0.1)
    S.pulse(h, S.s + 0.6, S.e, 1.08, every=1)
    S.item("lot", "1f970", 520, 360, 180, S.wt("dil", 0) + 0.2, enter="left")
    S.item("lot", "1f496", 1400, 360, 180, S.wt("dil", 1, S.s + 3) + 0.2, enter="right")
    for k in range(2):
        S.burst(CX, 310, S.wt("baithi", k), "#ffe0ec", n=8, r=230)


def sc_night(S):
    S.background("night")
    S.item("lot", "1f30d", CX, 310, 260, S.wt("duniya") - 0.3, out=S.wt("raataan") - 0.4)
    S.ring(CX, 310, S.wt("laagan"), "#9ad0ff")
    S.item("lot", "1f31b", 1450, 260, 230, S.wt("raataan") - 0.3, enter="rise")
    c = S.item("lot", "23f0", 480, 320, 190, S.wt("jaagan") - 0.2)
    S.tw(c + " .bob", "{rotation:-10}", "{rotation:10, duration:0.06, yoyo:true, repeat:11, ease:'none'}", S.wt("jaagan") + 0.5)


def sc_running(S):
    S.background("field")
    S.item("lot", "1f4ac", 640, 280, 180, S.wt("jikra") - 0.3, out=S.wt("uth"))
    S.item("lot", "1f92b", 1280, 300, 180, S.wt("ho") - 0.1, out=S.wt("uth"))
    r = S.item("lot", "1f483", 300, 380, 230, S.wt("uth") - 0.1, enter="left")
    S.to(r, "{x:1300, duration:1.6, ease:'power2.inOut'}", S.wt("bhaagan") - 0.2)


def sc_rooftop(S):
    S.background("rooftop")
    k = S.item("img", "kite", 1500, 230, 190, S.s + 0.2, enter="rise")
    S.to(k + " .bob", "{rotation:12, x:-60, duration:1.4, yoyo:true, repeat:3, ease:'sine.inOut'}", S.s + 1.2)
    S.item("lot", "1f602", 560, 330, 210, S.wt("haase") - 0.2)
    S.item("img", "love_letter", CX, 320, 200, S.wt("kaagaj") - 0.2, enter="drop")


def sc_music(S):
    S.background("stage")
    S.h.append('<div class="eqwrap">' + "".join(f'<i class="eq" style="left:{220 + k * 62}px"></i>' for k in range(24)) + "</div>")
    for k, t in enumerate(beats_in(S.s, S.e)):
        for i in range(k % 2, 24, 2):
            hgt = 0.3 + ((i * 7 + k * 13) % 10) / 10 * 0.7
            S.j.append(f'tl.fromTo("#{S.id} .eq:nth-child({i + 1})", {{scaleY:0.12}}, {{scaleY:{hgt:.2f}, duration:0.13, yoyo:true, repeat:1, ease:"power2.out"}}, {rt(t)});')
    S.item("lot", "1f3b6", CX, 300, 240, S.s + 0.3)
    S.item("lot", "1f941", 560, 380, 170, S.s + 1.2, enter="left")
    S.item("lot", "1f3b8", 1360, 380, 170, S.s + 1.6, enter="right")
    S.h.append('<div class="musiclabel">♪ Music ♪</div>')
    S.tw(f"#{S.id} .musiclabel", "{opacity:0, scale:0.7}", "{opacity:1, scale:1, duration:0.6, ease:'back.out(2)'}", S.s + 0.5)
    S.to(f"#{S.id} .musiclabel", "{opacity:0, duration:0.4}", S.e - 0.7)


def sc_stars(S):
    S.background("night")
    t = S.wt("taare")
    td = S.wt("din")
    for k in range(7):
        S.item("lot", "1f31f", 300 + k * 220, 160 + (k % 2) * 120, 110, t + k * 0.25, out=td - 0.4)
    S.h.append(f'<div class="counter" id="{S.id}-cnt"></div>')
    for k in range(7):
        S.j.append(f'tl.call(() => {{ const c = document.getElementById("{S.id}-cnt"); if (c) c.textContent = "{k + 1}"; }}, null, {rt(t + k * 0.25)});')
    S.j.append(f'tl.call(() => {{ const c = document.getElementById("{S.id}-cnt"); if (c) c.textContent = ""; }}, null, {rt(max(T0, S.s - 0.5))});')
    S.tw(f"#{S.id}-cnt", "{opacity:0}", "{opacity:1, duration:0.3}", t)
    S.to(f"#{S.id}-cnt", "{opacity:0, duration:0.3}", td - 0.4)
    cal = S.item("img", "calendar", CX, 320, 230, td - 0.3)
    S.tw(cal + " .bob", "{rotationY:0}", "{rotationY:360, duration:0.4, repeat:4, ease:'none'}", td)


def sc_firstmeet(S):
    S.background("night")
    S.item("img", "crescent_moon", 1620, 170, 150, S.s + 0.2)
    t = S.wt("mulaqaat")
    a = S.item("lot", "1f60a", 420, 340, 190, S.s + 0.3, enter="left")
    b = S.item("lot", "1f60c", 1500, 340, 190, S.s + 0.3, enter="right")
    S.to(a, "{x:360, duration:1.4, ease:'power2.inOut'}", t - 0.4)
    S.to(b, "{x:-360, duration:1.4, ease:'power2.inOut'}", t - 0.4)
    S.item("lot", "2764_fe0f", CX, 230, 130, t + 1.0)
    S.burst(CX, 230, t + 1.0, "#ff8fab")
    S.item("lot", "1f92b", CX, 470, 120, S.wt("chup") - 0.2)


def sc_cup(S):
    S.background("room")
    S.item("lot", "2615", 760, 330, 230, S.s + 0.1)
    S.burst(760, 300, S.wt("pee"), "#ff8fab", n=8, r=200)
    S.item("lot", "2696_fe0f", 1200, 330, 220, S.wt("faisla") - 0.3)


def sc_embrace(S):
    S.background("room")
    t = S.wt("baahaan")
    S.item("lot", "1f917", CX, 330, 260, S.s + 0.2)
    S.item("lot", "1f497", 560, 300, 150, t - 0.2, enter="left")
    S.item("lot", "1f497", 1360, 300, 150, t - 0.2, enter="right")
    S.burst(CX, 330, t + 0.3, "#ffd1e0")


def sc_praise(S):
    S.background("field")
    S.item("lot", "1f44f", 640, 320, 220, S.wt("tareef") - 0.3, out=S.wt("mholi") - 0.2)
    S.burst(640, 320, S.wt("tareef"), "#ffffff")
    S.item("lot", "1f607", CX, 320, 250, S.wt("mholi") - 0.2)
    S.item("img", "bouquet", 1380, 340, 200, S.wt("tore") - 0.3)


def sc_sorrow(S):
    S.background("rain")
    tp = S.wt("palle")
    S.item("img", "chair", 760, 430, 170, S.s + 0.1)
    S.item("lot", "1f327", 1120, 260, 240, S.s + 0.1, out=tp - 0.3)
    S.item("lot", "1f62d", 760, 230, 150, S.wt("dukh") - 0.2, out=tp - 0.1)
    S.item("lot", "1f308", 1120, 280, 280, tp - 0.2)
    S.to(f"#{S.id} .rainfx", "{opacity:0, duration:0.8}", tp - 0.4)
    S.to(f"#{S.id} .sunbreak", "{opacity:1, duration:1.2}", tp - 0.4)


def sc_rings(S):
    S.background("golden")
    t = S.wt("aapna")
    a = S.item("lot", "1f48d", 560, 320, 200, S.s + 0.1, enter="left")
    b = S.item("lot", "1f48d", 1360, 320, 200, S.s + 0.1, enter="right")
    S.to(a, "{x:330, duration:0.8, ease:'power3.in'}", t - 0.6)
    S.to(b, "{x:-330, duration:0.8, ease:'power3.in'}", t - 0.6)
    S.burst(CX, 320, t + 0.2, "#fff6c9", n=12, r=300)
    S.item("lot", "1f91d", CX, 520, 150, t + 0.3)


def sc_heartbeat(S):
    S.background("room")
    S.h.append('<svg class="ecg" viewBox="0 0 1920 300"><path d="M0 150 H560 L610 150 L650 30 L700 270 L750 80 L790 150 H1120 L1170 150 L1210 30 L1260 270 L1310 80 L1350 150 H1920"/></svg>')
    S.tw(f"#{S.id} .ecg path", "{strokeDashoffset:2600}", "{strokeDashoffset:0, duration:2.0, ease:'none'}", S.s + 0.1)
    h = S.item("lot", "1f493", CX, 220, 200, S.s + 0.1)
    S.pulse(h, S.s + 0.5, S.e, 1.15, every=1)
    S.item("lot", "1f917", 1500, 250, 170, S.wt("baahaan") - 0.2)


def sc_forever(S):
    S.background("golden")
    S.item("lot", "1f3e0", 700, 330, 230, S.wt("dil") - 0.2)
    S.item("lot", "2764_fe0f", 700, 180, 110, S.wt("mein") - 0.1)
    S.item("lot", "267e_fe0f", 1220, 330, 240, S.wt("sadaa") - 0.2)


def sc_eyes(S):
    S.background("field")
    S.item("lot", "1f440", CX, 300, 260, S.s + 0.1, out=S.wt("chaave") - 0.3)
    S.item("lot", "1f60d", CX, 300, 260, S.wt("chaave") - 0.3)
    S.burst(CX, 300, S.wt("chaave"), "#ff8fab")


def sc_magnet(S):
    S.background("sunset")
    a = S.item("lot", "1f60a", 820, 320, 200, S.s + 0.1)
    b = S.item("lot", "1f618", 1100, 320, 200, S.s + 0.1)
    S.to(a, "{x:-480, duration:1.2, ease:'power2.out'}", S.wt("hat-ti") - 0.2)
    S.to(b, "{x:-520, duration:1.4, ease:'power2.inOut'}", S.wt("nede") - 0.5)


def sc_sulk(S):
    S.background("room")
    S.item("lot", "1f624", CX, 300, 250, S.s + 0.1, out=S.wt("galti") - 0.1)
    S.item("lot", "1f97a", CX, 300, 250, S.wt("galti") - 0.1, out=S.wt("manaave") - 0.1)
    S.item("lot", "1f60a", CX, 300, 250, S.wt("manaave") - 0.1)
    S.item("lot", "1f64f", 1400, 330, 160, S.wt("maang") - 0.2)


def sc_hands(S):
    S.background("field")
    S.item("lot", "1f91d", CX, 300, 260, S.wt("haath") - 0.2)
    S.burst(CX, 300, S.wt("pakad"), "#ffffff")
    S.item("lot", "1faf6", 1400, 320, 170, S.wt("jagah") - 0.2)


def sc_nazar(S):
    S.background("mandala")
    S.h.append(f'<div class="string" id="{S.id}-str"></div>')
    n = S.item("img", "nazar_amulet", CX, 330, 260, S.s, enter="drop")
    S.tw(f"#{S.id}-str", "{y:-700}", "{y:0, duration:0.9, ease:'bounce.out'}", S.s)
    S.tw(f"{n} .bob", "{rotation:-10}", "{rotation:10, duration:0.55, yoyo:true, repeat:3, ease:'sine.inOut'}", S.s + 0.9)
    S.ring(CX, 330, S.wt("nazar"), "#bfe9ff")


def sc_thread(S):
    S.background("mandala")
    S.item("img", "thread", 640, 300, 200, S.wt("baandh") - 0.3)
    S.h.append('<svg class="thread" viewBox="0 0 1920 600"><path d="M300 330 C 600 150, 800 500, 960 330 S 1300 150, 1620 330"/></svg>')
    S.tw(f"#{S.id} .thread path", "{strokeDashoffset:2000}", "{strokeDashoffset:0, duration:1.6, ease:'power2.inOut'}", S.wt("baandh", 1, S.s + 2))
    S.item("img", "nazar_amulet", CX, 390, 130, S.wt("kaale") - 0.2)


def sc_winter(S):
    S.background("snow")
    S.h.append('<div class="snowfx"></div>')
    S.tw(f"#{S.id} .snowfx", "{y:-280, x:0}", f"{{y:0, x:-60, duration:1.6, ease:'none', repeat:{int((S.e - S.s) / 1.6) + 1}}}", S.s - 0.5)
    S.item("img", "scarf", 600, 320, 220, S.wt("baahaan") - 0.2)
    S.item("lot", "1f976", CX, 300, 170, S.wt("sard") - 0.2)
    S.item("lot", "1f32c_fe0f", 1320, 300, 220, S.wt("hawaavaan") - 0.3)


def sc_faraway(S):
    S.background("snow")
    g = S.item("lot", "1f30f", 1400, 250, 200, S.s + 0.1)
    S.to(g, "{scale:0.4, x:300, y:-80, duration:2.5, ease:'power2.in'}", S.wt("door"))
    S.item("lot", "1f54a_fe0f", 500, 300, 200, S.wt("jaake") - 0.2, enter="left")
    S.item("lot", "1f972", CX, 330, 200, S.wt("dukhde") - 0.2)


def sc_onlyyou(S):
    S.background("dark")
    t = S.wt("nazraan")
    for i in range(12):
        if i == 8:
            continue
        S.item("lot", "1f90d", 300 + (i % 6) * 264, 170 + (i // 6) * 230, 120, S.s + 0.1 + i * 0.05)
    S.to(f"#{S.id} .item", "{opacity:0.2, duration:0.5}", t - 0.3)
    S.item("lot", "2764_fe0f", 300 + 2 * 264, 400, 250, t - 0.2)
    S.burst(300 + 2 * 264, 400, t, "#ff4d6d", n=12, r=320)


def sc_prayer(S):
    S.background("golden")
    p = S.item("lot", "1f64f", CX, 310, 260, S.wt("rabb") - 0.3)
    S.pulse(p, S.wt("rabb") + 0.5, S.e, 1.05, every=2)
    S.item("lot", "1f54a_fe0f", 520, 260, 170, S.wt("sacchi") - 0.2, enter="left")
    S.item("lot", "1f54a_fe0f", 1400, 260, 170, S.wt("sacchi") - 0.1, enter="right")


def sc_petals(S):
    S.background("golden")
    S.h.append('<div class="petalfx"></div>')
    S.tw(f"#{S.id} .petalfx", "{y:-320}", f"{{y:0, duration:2.2, ease:'none', repeat:{int((S.e - S.s) / 2.2) + 1}}}", S.s - 0.5)
    S.item("lot", "1f338", 700, 320, 220, S.s + 0.1)
    S.item("lot", "1f940", 1220, 320, 220, S.wt("mar") - 0.2)


def sc_finale(S):
    S.background("sunset")
    h = S.item("lot", "2764_fe0f", CX, 320, 280, S.s + 0.1, out=S.e - 3.2)
    S.pulse(h, S.s + 0.5, S.e - 3.3, 1.1, every=1)
    S.item("lot", "1f386", 480, 260, 220, S.wt("dil") - 0.2, out=S.e - 3.2)
    S.item("lot", "1f386", 1440, 260, 220, S.wt("baithi") - 0.2, out=S.e - 3.2)
    S.h.append('<div class="endtitle">Dil De Baithi<small>Dhanda Nyoliwala</small></div>')
    S.tw(f"#{S.id} .endtitle", "{opacity:0, scale:0.6}", "{opacity:1, scale:1, duration:0.9, ease:'back.out(2)'}", S.e - 3.0)


SCENES = {k[3:]: v for k, v in list(globals().items()) if k.startswith("sc_")}

# =================================================================== assemble
by_slide = {}
for ln in L["lines"]:
    by_slide.setdefault(ln["slide"], []).append(ln)

slides = L["slides"]
scene_html, js = [], []
for i, sl in enumerate(slides):
    s, e = sl["s"], sl["e"]
    nxt = slides[i + 1]["s"] if i + 1 < len(slides) else T1
    end = min(T1, nxt + 0.7)
    if end <= T0 or s >= T1:
        continue
    S = Scene(i, sl["scene"], s, end, by_slide.get(i, []))
    SCENES[sl["scene"]](S)
    a = max(s - 0.05, T0)
    scene_html.append(f'<div id="sc{i}" class="clip scene" data-start="{rt(a)}" data-duration="{round(end - a, 3)}" '
                      f'data-track-index="1" style="z-index:{i + 1}">\n  ' + "\n  ".join(S.h) + "\n</div>")
    if s > T0 + 0.1:
        js.append(f'tl.fromTo("#sc{i}", {{opacity:0, scale:1.12}}, {{opacity:1, scale:1, duration:0.7, ease:"power2.out"}}, {rt(s - 0.05)});')
    if sl["scene"] in CHORUS:  # downbeat camera pulse
        for t in beats_in(s + 0.8, end - 0.3, "downbeats"):
            js.append(f'tl.fromTo("#sc{i}-bg0", {{scale:1}}, {{scale:1.03, duration:0.12, yoyo:true, repeat:1, ease:"power1.out"}}, {rt(t)});')
    js.extend(S.j)

# --------------------------------------------------------------- lyrics
lyric_html = []
for i, sl in enumerate(slides):
    lines = by_slide.get(i, [])
    if not lines or sl["e"] <= T0 or sl["s"] >= T1:
        continue
    chorus = sl["scene"] in CHORUS
    first_t = min(w["t"] for ln in lines for w in ln["words"])
    last_e = max(w["e"] for ln in lines for w in ln["words"])
    show = min(sl["s"], first_t - 0.4)
    nxt_s = slides[i + 1]["s"] if i + 1 < len(slides) else T1
    hide = min(max(sl["e"], last_e + 0.25), nxt_s + 0.25)
    a, b = max(show, T0), min(hide, T1)
    rows = []
    for ln in [x for x in lines if x.get("rep", 0) == 0]:
        ws = "".join(f'<span class="w" id="w{i}-{ln["line"]}-{k}"><span class="wt">{esc(w["w"])}</span><i class="u"></i></span>'
                     for k, w in enumerate(ln["words"]))
        rows.append(f'<div class="row">{ws}</div>')
    cls = "lyr chorus" if chorus else "lyr"
    lyric_html.append(f'<div id="ly{i}" class="clip {cls}" data-start="{rt(a)}" data-duration="{round(b - a, 3)}" data-track-index="2">'
                      f'<div class="plate"></div>{"".join(rows)}</div>')
    if show >= T0:
        js.append(f'tl.fromTo("#ly{i} .plate", {{opacity:0, scaleX:0.6}}, {{opacity:1, scaleX:1, duration:0.4, ease:"power3.out"}}, {rt(show)});')
        if not chorus:
            js.append(f'tl.fromTo("#ly{i} .row", {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.35, stagger:0.1, ease:"power3.out"}}, {rt(show)});')
    js.append(f'tl.to("#ly{i}", {{opacity:0, y:-24, duration:0.25, ease:"power2.in"}}, {rt(hide - 0.25)});')
    for r in sorted({x.get("rep", 0) for x in lines} - {0}):  # repeated lines: dim the words again before the second pass
        r_start = min(w["t"] for x in lines if x.get("rep", 0) == r for w in x["words"])
        js.append(f'tl.to("#ly{i} .wt", {{color:"rgba(255,255,255,0.55)", duration:0.3}}, {rt(r_start - 0.35)});')
    for ln in lines:
        for k, w in enumerate(ln["words"]):
            t, e_ = w["t"], max(w["e"], w["t"] + 0.12)
            if not (T0 - 1 <= t <= T1):
                continue
            sel = f"#w{i}-{ln['line']}-{k}"
            dur = round(e_ - t, 3)
            if chorus and ln.get("rep", 0) == 0:  # word drops in exactly when sung
                js.append(f'tl.fromTo("{sel}", {{opacity:0, y:-70, scale:1.5}}, {{opacity:1, y:0, scale:1, duration:0.2, ease:"back.out(2.5)"}}, {rt(t - 0.05)});')
            js.append(f'tl.to("{sel} .wt", {{color:"#ffe066", scale:1.12, y:-6, textShadow:"0 0 28px rgba(255,214,64,0.9)", duration:0.1, ease:"power2.out"}}, {rt(t)});')
            js.append(f'tl.fromTo("{sel} .u", {{scaleX:0, opacity:1}}, {{scaleX:1, opacity:1, duration:{max(0.1, dur - 0.04):.3f}, ease:"none"}}, {rt(t)});')
            js.append(f'tl.to("{sel} .wt", {{color:"#ffffff", scale:1, y:0, textShadow:"0 4px 16px rgba(0,0,0,0.5)", duration:0.2}}, {rt(e_)});')
            js.append(f'tl.to("{sel} .u", {{opacity:0, duration:0.25}}, {rt(e_)});')

page = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="assets/gsap.min.js"></script>
<script src="assets/lottie.min.js"></script>
<script src="assets/lottie-data.js"></script>
<style>
@font-face {{ font-family: "Baloo 2"; font-weight: 500; src: url(assets/fonts/baloo-2-latin-500-normal.woff2) format("woff2"); }}
@font-face {{ font-family: "Baloo 2"; font-weight: 700; src: url(assets/fonts/baloo-2-latin-700-normal.woff2) format("woff2"); }}
@font-face {{ font-family: "Baloo 2"; font-weight: 800; src: url(assets/fonts/baloo-2-latin-800-normal.woff2) format("woff2"); }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #1a0b1e; }}
#root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Baloo 2", sans-serif; }}
.clip {{ position: absolute; inset: 0; }}
.scene {{ overflow: hidden; }}
.bgl {{ position: absolute; inset: -60px; }}
.layer {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
.rays {{ position: absolute; left: 50%; top: 35%; width: 2600px; height: 2600px; margin: -1300px 0 0 -1300px; border-radius: 50%;
   background: repeating-conic-gradient(rgba(255,255,255,0.13) 0deg 7deg, transparent 7deg 20deg); }}
.rays-gold {{ top: 20%; background: repeating-conic-gradient(rgba(255,255,255,0.28) 0deg 7deg, transparent 7deg 20deg); }}
.rainfx {{ position: absolute; left: 0; right: 0; top: -300px; bottom: 0; background-image: repeating-linear-gradient(100deg, rgba(220,230,255,0.35) 0 2px, transparent 2px 46px),
   repeating-linear-gradient(100deg, rgba(220,230,255,0.2) 0 1px, transparent 1px 23px); background-size: 100% 300px; }}
.sunbreak {{ position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle at 60% 25%, rgba(255,240,180,0.85), rgba(255,200,120,0.25) 40%, transparent 70%); }}
.beams i {{ position: absolute; bottom: -100px; width: 160px; height: 1400px; transform-origin: 50% 100%;
   background: linear-gradient(0deg, rgba(255,120,200,0.55), rgba(255,120,200,0)); filter: blur(6px); }}
.beams i:nth-child(1) {{ left: 200px; }} .beams i:nth-child(2) {{ left: 560px; background: linear-gradient(0deg, rgba(120,180,255,0.5), transparent); }}
.beams i:nth-child(3) {{ left: 880px; background: linear-gradient(0deg, rgba(255,224,102,0.5), transparent); }}
.beams i:nth-child(4) {{ left: 1200px; background: linear-gradient(0deg, rgba(120,180,255,0.5), transparent); }} .beams i:nth-child(5) {{ left: 1560px; }}
.eqwrap {{ position: absolute; inset: 0; }}
.eq {{ position: absolute; bottom: 180px; width: 42px; height: 520px; border-radius: 21px; transform-origin: bottom; transform: scaleY(0.12);
   background: linear-gradient(0deg, rgba(255,90,160,0.75), rgba(255,224,102,0.75)); }}
.musiclabel {{ position: absolute; left: 0; right: 0; top: 905px; text-align: center; font-weight: 800; font-size: 96px; color: #ffe066; text-shadow: 0 0 30px rgba(255,214,64,0.7); }}
.mandala {{ position: absolute; left: 50%; top: 45%; width: 1600px; height: 1600px; margin: -800px 0 0 -800px; }}
.mandala-svg {{ width: 100%; height: 100%; }}
.snowfx {{ position: absolute; left: -100px; right: -100px; top: -300px; bottom: 0; background-image: radial-gradient(circle, #fff 0 3px, transparent 4px), radial-gradient(circle, rgba(255,255,255,0.8) 0 2px, transparent 3px);
   background-size: 140px 140px, 90px 90px; background-position: 0 0, 40px 60px; opacity: 0.9; }}
.petalfx {{ position: absolute; left: -100px; right: -100px; top: -320px; bottom: 0; background-image: radial-gradient(ellipse 9px 5px, #ff9ec4 0 90%, transparent 100%), radial-gradient(ellipse 7px 4px, #ffd1e3 0 90%, transparent 100%);
   background-size: 180px 160px, 120px 140px; background-position: 0 0, 60px 40px; }}
.item {{ position: absolute; z-index: 5; }}
.bob {{ position: absolute; inset: 0; }}
.item .lot, .item img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 18px 24px rgba(0,0,0,0.35)); }}
.item .shadow {{ position: absolute; left: 18%; right: 18%; bottom: -8%; height: 10%; border-radius: 50%; background: rgba(0,0,0,0.22); filter: blur(8px); }}
.spark {{ position: absolute; width: 16px; height: 16px; margin: -8px; border-radius: 50%; opacity: 0; z-index: 6; box-shadow: 0 0 12px currentColor; }}
.ringfx {{ position: absolute; width: 300px; height: 300px; border-radius: 50%; border: 6px solid #fff; opacity: 0; z-index: 4; }}
.ecg {{ position: absolute; left: 0; top: 380px; width: 1920px; height: 300px; z-index: 3; }}
.ecg path {{ fill: none; stroke: #ff8fab; stroke-width: 10; stroke-linejoin: round; stroke-dasharray: 2600; filter: drop-shadow(0 0 14px #ff4d6d); }}
.thread {{ position: absolute; left: 0; top: 60px; width: 1920px; height: 600px; z-index: 3; }}
.thread path {{ fill: none; stroke: #0a0a0a; stroke-width: 14; stroke-linecap: round; stroke-dasharray: 2000; filter: drop-shadow(0 0 8px rgba(255,214,64,0.7)); }}
.string {{ position: absolute; left: 958px; top: 0; width: 4px; height: 210px; background: #e8e8e8; z-index: 4; }}
.counter {{ position: absolute; right: 120px; top: 470px; font-weight: 800; font-size: 120px; color: #ffe066; text-shadow: 0 0 30px rgba(255,214,64,0.8); }}
.titlebox {{ position: absolute; left: 0; right: 0; top: 200px; display: flex; justify-content: center; gap: 60px; font-size: 190px; font-weight: 800; color: #fff;
   text-shadow: 0 10px 40px rgba(80,0,40,0.55); z-index: 6; }}
.tword {{ display: inline-flex; }} .tch {{ display: inline-block; }}
.artistline {{ position: absolute; left: 0; right: 0; top: 470px; text-align: center; font-weight: 700; font-size: 64px; color: #ffe066; text-shadow: 0 4px 22px rgba(0,0,0,0.4); z-index: 6; }}
.endtitle {{ position: absolute; left: 0; right: 0; top: 230px; text-align: center; font-weight: 800; font-size: 150px; line-height: 1.1; color: #fff; text-shadow: 0 10px 40px rgba(80,0,40,0.6); z-index: 6; }}
.endtitle small {{ display: block; font-size: 60px; color: #ffe066; font-weight: 700; }}
.lyr {{ display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 96px; z-index: 100; }}
.plate {{ position: absolute; left: 50%; bottom: 60px; width: 1500px; height: 290px; margin-left: -750px; border-radius: 40px;
   background: linear-gradient(180deg, rgba(20,6,28,0.35), rgba(20,6,28,0.55)); border: 2px solid rgba(255,255,255,0.12); }}
.row {{ position: relative; display: flex; flex-wrap: wrap; justify-content: center; column-gap: 0.36em; font-weight: 800; font-size: 84px; line-height: 1.3; padding: 0 90px; }}
.w {{ position: relative; display: inline-block; }}
.wt {{ display: inline-block; color: rgba(255,255,255,0.55); text-shadow: 0 4px 16px rgba(0,0,0,0.5); transform-origin: 50% 85%; }}
.u {{ position: absolute; left: 0; right: 0; bottom: 6px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #ffe066, #ff8fab);
   transform-origin: left; transform: scaleX(0); box-shadow: 0 0 14px rgba(255,214,64,0.8); }}
.chorus .row {{ font-size: 96px; }}
.chorus .w {{ opacity: 0; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="1920" data-height="1080" data-fps="60">
<audio id="song" src="assets/song.m4a" data-start="0" data-duration="{DUR}" data-media-start="{T0}" data-track-index="0" data-has-audio="true" data-fade-out="{2 if T1 >= L['duration'] else 0.3}"></audio>
{chr(10).join(scene_html)}
{chr(10).join(lyric_html)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
window.__hfLottie = window.__hfLottie || [];
document.querySelectorAll(".lot").forEach((el) => {{
  const data = window.LOTTIE[el.dataset.lottie];
  if (!data) return;
  const anim = lottie.loadAnimation({{ container: el, renderer: "svg", loop: true, autoplay: false,
    animationData: JSON.parse(JSON.stringify(data)), rendererSettings: {{ preserveAspectRatio: "xMidYMid meet" }} }});
  window.__hfLottie.push(anim);
}});
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(js)}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
"""
(HERE / "index.html").write_text(page, encoding="utf-8")
nl = sum(h.count('class="lot"') for h in scene_html)
print(f"index.html: {DUR}s, {len(scene_html)} scenes, {len(lyric_html)} lyric slides, {len(js)} tweens, {nl} lottie items")
