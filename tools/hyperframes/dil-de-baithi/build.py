#!/usr/bin/env python3
"""Builds index.html (Hyperframes composition) for the 'Dil De Baithi' lyric video.

Inputs:  lyrics.json (from timing.py), beats.json
Usage:   python3 build.py                  # full video
         python3 build.py --range 20 60    # only 20s..60s (quick preview; audio stays in sync)

Every slide has a 'scene': a background colour mood plus animated objects for the
things the lyrics mention. Scenes are defined in SCENES below; each one is a function
that returns (html, js) for a time window.
"""
import html
import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).parent
L = json.loads((HERE / "lyrics.json").read_text(encoding="utf-8"))
BEATS = json.loads((HERE / "beats.json").read_text())["beats"]

T0, T1 = 0.0, float(L["duration"])
if "--range" in sys.argv:
    i = sys.argv.index("--range")
    T0, T1 = float(sys.argv[i + 1]), float(sys.argv[i + 2])
DUR = round(T1 - T0, 3)
esc = html.escape


def rt(t):
    """Song time -> composition time."""
    return round(t - T0, 3)


def beats_in(a, b):
    return [t for t in BEATS if a <= t < b]


# ---------------------------------------------------------------- helpers
class Scene:
    def __init__(self, sid, s, e, lines):
        self.id, self.s, self.e, self.lines = sid, s, e, lines
        self.h, self.j, self.n = [], [], 0
        self.rng = random.Random(f"{sid}-{s}")

    def word_t(self, word, nth=0, default=None):
        hits = [w["t"] for l in self.lines for w in l["words"] if word.lower() in w["w"].lower()]
        if len(hits) > nth:
            return hits[nth]
        return self.s + 0.5 if default is None else default

    def el(self, content, x, y, size=120, cls="obj", style=""):
        self.n += 1
        eid = f"{self.id}-{self.n}"
        self.h.append(
            f'<div id="{eid}" class="{cls}" style="left:{x}px;top:{y}px;font-size:{size}px;{style}">{content}</div>')
        return "#" + eid

    def tw(self, sel, frm, to, at):
        if self.s - 1 <= at <= self.e + 1:
            self.j.append(f'tl.fromTo("{sel}", {frm}, {to}, {rt(at)});')

    def to(self, sel, to, at):
        if self.s - 1 <= at <= self.e + 1:
            self.j.append(f'tl.to("{sel}", {to}, {rt(at)});')

    # -- reusable motions
    def pop_in(self, sel, at, rot=0):
        self.tw(sel, f"{{opacity:0, scale:0.2, rotation:{rot - 25}}}",
                f"{{opacity:1, scale:1, rotation:{rot}, duration:0.6, ease:'back.out(2.2)'}}", at)

    def fade_out(self, sel, at, d=0.5):
        self.to(sel, f"{{opacity:0, scale:0.7, duration:{d}, ease:'power2.in'}}", at)

    def pulse_on_beats(self, sel, a, b, amt=1.12, every=1):
        for k, t in enumerate(beats_in(a, b)):
            if k % every == 0:
                self.tw(sel, "{scale:1}", f"{{scale:{amt}, duration:0.12, yoyo:true, repeat:1, ease:'power1.out'}}", t)

    def float_up(self, chars, n, a, b, size=(50, 110), xr=(80, 1840), alpha=0.9):
        """Particles (emoji) drifting up from the bottom, staggered over [a,b]."""
        for i in range(n):
            c = chars[i % len(chars)]
            x = self.rng.uniform(*xr)
            sz = self.rng.uniform(*size)
            t = a + (b - a) * i / max(1, n)
            d = self.rng.uniform(3.5, 6.0)
            sel = self.el(c, x, 1120, sz, style="opacity:0")
            sway = self.rng.uniform(-120, 120)
            self.tw(sel, f"{{y:0, x:0, opacity:0, rotation:{self.rng.uniform(-30, 30):.0f}}}",
                    f"{{y:-1350, x:{sway:.0f}, opacity:{alpha}, rotation:{self.rng.uniform(-40, 40):.0f}, duration:{d:.2f}, ease:'sine.out'}}", t)

    def fall_down(self, chars, n, a, b, size=(40, 90), alpha=0.9, spin=180):
        for i in range(n):
            c = chars[i % len(chars)]
            x = self.rng.uniform(40, 1880)
            sz = self.rng.uniform(*size)
            t = a + (b - a) * i / max(1, n)
            d = self.rng.uniform(3.0, 5.5)
            sel = self.el(c, x, -140, sz, style="opacity:0")
            self.tw(sel, f"{{y:0, x:0, opacity:{alpha}, rotation:0}}",
                    f"{{y:1300, x:{self.rng.uniform(-200, 200):.0f}, opacity:{alpha}, rotation:{self.rng.uniform(-spin, spin):.0f}, duration:{d:.2f}, ease:'none'}}", t)

    def twinkle(self, n, a, b, char="✦", color="#fff", top=(30, 560)):
        for i in range(n):
            x, y = self.rng.uniform(30, 1890), self.rng.uniform(*top)
            sel = self.el(char, x, y, self.rng.uniform(14, 34), style=f"color:{color};opacity:0")
            t = a + self.rng.uniform(0, 1.2)
            self.tw(sel, "{opacity:0}", "{opacity:0.9, duration:0.6}", t)
            reps = int((b - t) / 1.6)
            if reps > 0:
                self.tw(sel, "{opacity:0.9}", f"{{opacity:0.25, duration:0.8, yoyo:true, repeat:{reps}, ease:'sine.inOut'}}", t + 0.6)

    def bg(self, css):
        self.h.insert(0, f'<div class="bgfill" style="background:{css}"></div>')

    def glow(self, x, y, r, color, opacity=0.55):
        self.h.insert(1, f'<div class="glow" style="left:{x - r}px;top:{y - r}px;width:{2 * r}px;height:{2 * r}px;'
                         f'background:radial-gradient(circle, {color} 0%, transparent 70%);opacity:{opacity}"></div>')


# ---------------------------------------------------------------- scenes
# Coordinates: canvas 1920x1080. Lyrics sit at y ~ 700-930, so objects live mostly above y=640.
def sc_intro(S):
    S.bg("linear-gradient(180deg,#3b2a6b 0%,#a2457a 45%,#f08a6a 75%,#ffd08a 100%)")
    sun = S.el("", 760, 700, cls="sun")
    S.tw(sun, "{y:300, opacity:0}", "{y:0, opacity:1, duration:6, ease:'power2.out'}", S.s + 0.3)
    hills = S.el("", 0, 760, cls="hills")
    S.tw(hills, "{y:200}", "{y:0, duration:3, ease:'power3.out'}", S.s + 0.3)
    spans = []
    k = 0
    for word in "Dil De Baithi".split():
        chars = "".join(f'<span class="tch" id="{S.id}-t{k + j}">{esc(c)}</span>' for j, c in enumerate(word))
        k += len(word)
        spans.append(f'<span class="tword">{chars}</span>')
    S.h.append(f'<div class="titlebox">{"".join(spans)}</div>')
    for i in range(k):
        S.tw(f"#{S.id}-t{i}", "{y:-500, opacity:0, rotation:-20}",
             "{y:0, opacity:1, rotation:0, duration:0.7, ease:'bounce.out'}", 3.0 + i * 0.45)
    art = S.el("Dhanda Nyoliwala", 960, 500, 58, cls="obj artist")
    S.tw(art, "{opacity:0, y:30}", "{opacity:1, y:0, duration:0.9, ease:'power2.out'}", 8.5)
    for k, x in enumerate([200, 420, 1500, 1700]):
        b = S.el("🕊️", x, 120 + 40 * k, 70, style="opacity:0")
        S.tw(b, "{x:-300, opacity:0}", "{x:500, opacity:1, duration:7, ease:'sine.inOut'}", 10 + k * 1.3)
    S.float_up(["💗", "💕", "💖"], 14, 14, S.e - 2, size=(40, 80))
    S.pulse_on_beats(art, 12, S.e - 1.5, 1.06, every=4)
    for sel in (art,):
        S.fade_out(sel, S.e - 0.6)
    S.to(f"#{S.id} .tch", "{opacity:0, y:-80, duration:0.5, stagger:0.03, ease:'power2.in'}", S.e - 0.8)


def sc_heart(S):
    S.bg("radial-gradient(ellipse at 50% 35%,#ff5c8a 0%,#c2185b 45%,#4a0d2e 100%)")
    S.glow(960, 330, 420, "#ffd1e0", 0.5)
    h = S.el("❤️", 840, 140, 240)
    S.pop_in(h, S.s + 0.1)
    for w in S.lines[0]["words"] + (S.lines[1]["words"] if len(S.lines) > 1 else []):
        S.tw(h, "{scale:1}", "{scale:1.18, duration:0.1, yoyo:true, repeat:1, ease:'power1.out'}", w["t"])
    # 'be-etbaar' (disbelief): a crack flashes, then heals
    t = S.word_t("etbaar")
    crack = S.el("💔", 840, 140, 240, style="opacity:0")
    S.tw(crack, "{opacity:0}", "{opacity:1, duration:0.12, yoyo:true, repeat:1, repeatDelay:0.5}", t)
    # 'Dil de baithi': heart flies into the hands
    t = S.word_t("baithi")
    hands = S.el("🫶", 860, 430, 170, style="opacity:0")
    S.pop_in(hands, t - 0.3)
    S.to(h, "{y:200, scale:0.55, duration:0.8, ease:'power2.inOut'}", t)
    S.float_up(["💗", "💖"], 8, S.s + 0.5, S.e - 2, size=(30, 60), alpha=0.7)


def sc_hearts(S):
    S.bg("linear-gradient(160deg,#ff7eb3 0%,#e0457b 40%,#7a1f5c 100%)")
    S.float_up(["💕", "💖", "💗", "💘", "❤️", "💓"], 26, S.s, S.e - 1.5, size=(50, 130))
    big = S.el("💘", 830, 150, 250)
    S.pop_in(big, S.s + 0.2)
    S.pulse_on_beats(big, S.s + 0.8, S.e - 0.5, 1.12, every=2)
    S.to(big, "{rotation:-8, duration:0.5, yoyo:true, repeat:5, ease:'sine.inOut'}", S.s + 1)


def sc_night(S):
    S.bg("linear-gradient(180deg,#050a24 0%,#1b2a6b 60%,#3d3c8f 100%)")
    S.twinkle(40, S.s, S.e)
    globe = S.el("🌍", 860, 160, 220)
    S.pop_in(globe, S.word_t("duniya") - 0.2)
    S.to(globe, "{rotation:360, duration:4, ease:'none'}", S.word_t("duniya"))
    S.to(globe, "{y:-400, opacity:0, scale:0.4, duration:1, ease:'power2.in'}", S.word_t("raataan") - 0.6)
    moon = S.el("🌙", 1450, 500, 200, style="opacity:0")
    S.tw(moon, "{y:0, opacity:0}", "{y:-400, opacity:1, duration:1.6, ease:'power2.out'}", S.word_t("raataan") - 0.5)
    S.glow(1550, 200, 260, "#fff6c9", 0.35)
    clock = S.el("⏰", 300, 170, 170, style="opacity:0")
    t = S.word_t("jaagan")
    S.pop_in(clock, t - 0.2)
    S.tw(clock, "{rotation:-12}", "{rotation:12, duration:0.07, yoyo:true, repeat:13, ease:'none'}", t + 0.4)
    owl = S.el("🦉", 860, 260, 150, style="opacity:0")
    S.pop_in(owl, t + 0.3)


def sc_running(S):
    S.bg("linear-gradient(120deg,#ff9a44 0%,#fc6076 100%)")
    for k, (x, y) in enumerate([(380, 120), (1250, 90), (800, 260)]):
        b = S.el("💬", x, y, 150)
        S.pop_in(b, S.word_t("jikra") - 0.3 + k * 0.25)
        S.fade_out(b, S.word_t("uth") - 0.1, 0.3)
    for k in range(6):
        ln = S.el("", 0, 300 + k * 50, cls="speedline", style="opacity:0")
        S.tw(ln, "{x:2000, opacity:0}", "{x:-600, opacity:0.8, duration:0.6, ease:'none', repeat:3}", S.word_t("uth") + k * 0.08)
    run = S.el("🏃‍♀️", -300, 230, 220)
    S.tw(run, "{x:0}", "{x:2300, duration:2.0, ease:'power1.in'}", S.word_t("uth"))


def sc_rooftop(S):
    S.bg("linear-gradient(180deg,#2b5876 0%,#ae6e9e 55%,#ffb38a 100%)")
    S.h.append('<div class="skyline"></div>')
    sel = "#" + S.id + " .skyline"
    S.tw(sel, "{y:300}", "{y:0, duration:1.2, ease:'power3.out'}", S.s + 0.1)
    girl = S.el("🧍‍♀️", 1160, 250, 150, style="opacity:0")
    S.pop_in(girl, S.word_t("chadh"))
    laugh = S.el("😄", 1290, 160, 110, style="opacity:0")
    S.pop_in(laugh, S.word_t("haase"))
    S.tw(laugh, "{y:0}", "{y:-20, duration:0.15, yoyo:true, repeat:7}", S.word_t("haase") + 0.5)
    t = S.word_t("kaagaj")
    for k in range(5):
        p = S.el("📄", 300 + k * 260, -150, 110, style="opacity:0")
        S.tw(p, "{y:0, rotation:0, opacity:1}",
             f"{{y:900, rotation:{(-1) ** k * 220}, opacity:1, duration:3, ease:'sine.in'}}", t - 0.4 + k * 0.25)


def sc_music(S):
    S.bg("linear-gradient(135deg,#1a0b3d 0%,#4a1a7a 50%,#b0306f 100%)")
    n = 24
    for i in range(n):
        S.h.append(f'<div class="bar" id="{S.id}-bar{i}" style="left:{240 + i * 60}px"></div>')
    for k, t in enumerate(beats_in(S.s, S.e)):
        for i in range(n):
            if (i + k) % 3 == 0:
                hgt = 0.25 + ((i * 7 + k * 13) % 10) / 10 * 0.75
                S.tw(f"#{S.id}-bar{i}", "{scaleY:0.15}", f"{{scaleY:{hgt:.2f}, duration:0.12, yoyo:true, repeat:1, ease:'power2.out'}}", t)
    head = S.el("🎧", 860, 120, 200)
    S.pop_in(head, S.s + 0.2)
    S.pulse_on_beats(head, S.s + 0.6, S.e - 0.4, 1.1)
    S.float_up(["🎵", "🎶", "🎼"], 18, S.s, S.e - 2, size=(50, 100))
    lab = S.el("♪ Music ♪", 960, 560, 90, cls="obj artist")
    S.tw(lab, "{opacity:0, y:30}", "{opacity:1, y:0, duration:0.6}", S.s + 0.4)
    S.fade_out(lab, S.e - 0.6)


def sc_stars(S):
    S.bg("linear-gradient(180deg,#0b0b2b 0%,#2c1a5a 70%,#5a2a7a 100%)")
    t = S.word_t("taare")
    stars = []
    for i in range(12):
        x, y = 160 + (i * 137) % 1600, 60 + (i * 211) % 420
        stars.append(S.el("⭐", x, y, 60, style="opacity:0"))
    for i, st in enumerate(stars):
        S.pop_in(st, t + i * 0.22)
    cnt = S.el('<span class="counter"></span>', 1700, 520, 70, cls="obj artist")
    for i in range(12):
        S.j.append(f'tl.call(() => {{ document.querySelector("{cnt} .counter").textContent = "{i + 1}"; }}, null, {rt(t + i * 0.22)});')
    S.tw(cnt, "{opacity:0}", "{opacity:1, duration:0.3}", t)
    S.to(cnt, "{opacity:0, duration:0.3}", S.word_t("din") - 0.6)
    S.j.append(f'tl.call(() => {{ document.querySelector("{cnt} .counter").textContent = ""; }}, null, {rt(S.s)});')
    cal = S.el("📅", 860, 230, 190, style="opacity:0")
    td = S.word_t("din")
    S.pop_in(cal, td - 0.4)
    S.tw(cal, "{rotationX:0}", "{rotationX:360, duration:0.35, repeat:5, ease:'none'}", td)
    for st in stars:
        S.to(st, "{opacity:0.25, duration:0.5}", td - 0.4)


def sc_firstmeet(S):
    S.bg("linear-gradient(180deg,#1d1238 0%,#4b2463 60%,#8c3d6f 100%)")
    S.twinkle(24, S.s, S.e)
    S.el("🌙", 1600, 70, 130)
    a = S.el("👩", 380, 260, 170)
    b = S.el("👨", 1370, 260, 170)
    t = S.word_t("mulaqaat")
    S.tw(a, "{x:-400, opacity:0}", "{x:0, opacity:1, duration:1, ease:'power2.out'}", S.s + 0.2)
    S.tw(b, "{x:400, opacity:0}", "{x:0, opacity:1, duration:1, ease:'power2.out'}", S.s + 0.2)
    S.to(a, "{x:330, duration:1.6, ease:'power2.inOut'}", t)
    S.to(b, "{x:-330, duration:1.6, ease:'power2.inOut'}", t)
    h = S.el("❤️", 885, 120, 120, style="opacity:0")
    S.pop_in(h, t + 1.4)
    S.pulse_on_beats(h, t + 2, S.e, 1.15, every=2)
    sh = S.el("🤫", 885, 420, 100, style="opacity:0")
    S.pop_in(sh, S.word_t("chup"))
    clk = S.el("🕰️", 160, 90, 110, style="opacity:0")
    S.pop_in(clk, S.word_t("guzaare"))


def sc_cup(S):
    S.bg("radial-gradient(ellipse at 50% 30%,#ffcf71 0%,#e2893b 55%,#6b2c1a 100%)")
    S.glow(960, 300, 380, "#fff1c1", 0.5)
    cup = S.el("🍵", 860, 170, 200)
    S.pop_in(cup, S.s + 0.1)
    t = S.word_t("pee")
    S.to(cup, "{rotation:-35, duration:0.5, ease:'power2.out'}", t - 0.2)
    for k in range(6):
        hh = S.el("💗", 900, 220, 60, style="opacity:0")
        S.tw(hh, "{x:0, y:0, opacity:1, scale:0.5}",
             f"{{x:{-300 + k * 110}, y:{-120 - (k % 3) * 40}, opacity:0, scale:1.3, duration:1.2, ease:'power2.out'}}", t + k * 0.08)
    sc = S.el("⚖️", 1400, 180, 160, style="opacity:0")
    S.pop_in(sc, S.word_t("faisla") - 0.2)
    S.tw(sc, "{rotation:-10}", "{rotation:10, duration:0.4, yoyo:true, repeat:3, ease:'sine.inOut'}", S.word_t("faisla"))


def sc_embrace(S):
    S.bg("linear-gradient(135deg,#ff9a9e 0%,#c94b7c 60%,#5e1d4d 100%)")
    a = S.el("💗", 450, 190, 160)
    b = S.el("💗", 1310, 190, 160)
    S.pop_in(a, S.s + 0.1)
    S.pop_in(b, S.s + 0.2)
    t = S.word_t("baahaan")
    S.to(a, "{x:410, duration:0.9, ease:'power3.in'}", t - 0.9)
    S.to(b, "{x:-450, duration:0.9, ease:'power3.in'}", t - 0.9)
    m = S.el("💞", 840, 150, 240, style="opacity:0")
    S.pop_in(m, t)
    S.to(a, "{opacity:0, duration:0.1}", t)
    S.to(b, "{opacity:0, duration:0.1}", t)
    hug = S.el("🤗", 1500, 420, 120, style="opacity:0")
    S.pop_in(hug, t + 0.3)


def sc_praise(S):
    S.bg("radial-gradient(ellipse at 50% 30%,#fff0b3 0%,#f6b93b 45%,#b35c1e 100%)")
    S.glow(960, 300, 450, "#ffffff", 0.45)
    t = S.word_t("tareef")
    clap = S.el("👏", 860, 170, 190, style="opacity:0")
    S.pop_in(clap, t - 0.3)
    S.tw(clap, "{scale:1}", "{scale:1.15, duration:0.1, yoyo:true, repeat:7}", t)
    for k in range(14):
        sp = S.el("✨", 960, 280, 70, style="opacity:0")
        ang = k / 14 * 6.283
        import math
        S.tw(sp, "{x:0, y:0, opacity:1, scale:0.3}",
             f"{{x:{math.cos(ang) * 600:.0f}, y:{math.sin(ang) * 300:.0f}, opacity:0, scale:1.2, duration:1.4, ease:'power2.out'}}", t + 0.1)
    angel = S.el("😇", 860, 170, 190, style="opacity:0")
    tm = S.word_t("mholi")
    S.fade_out(clap, tm - 0.4, 0.3)
    S.pop_in(angel, tm - 0.2)
    S.fall_down(["🌹", "🌸"], 14, tm - 0.5, S.e - 1, size=(50, 90))


def sc_sorrow(S):
    S.bg("linear-gradient(180deg,#4b6584 0%,#778ca3 60%,#a5b1c2 100%)")
    S.el("🪑", 860, 300, 150)
    cloud = S.el("🌧️", 820, 60, 220)
    S.pop_in(cloud, S.s + 0.1)
    for k in range(14):
        d = S.el("💧", 760 + (k * 53) % 400, 230, 34, style="opacity:0")
        S.tw(d, "{y:0, opacity:0.8}", "{y:420, opacity:0, duration:0.8, ease:'power1.in', repeat:2}", S.s + 0.3 + k * 0.12)
    t = S.word_t("dukh")
    S.to(cloud, "{opacity:0, scale:1.4, duration:0.8}", t + 0.3)
    sun = S.el("☀️", 1450, 60, 180, style="opacity:0")
    S.pop_in(sun, t + 0.6)
    S.to(sun, "{rotation:90, duration:3, ease:'none'}", t + 0.6)


def sc_rings(S):
    S.bg("radial-gradient(ellipse at 50% 30%,#fff3e0 0%,#f0c27b 50%,#8a5a44 100%)")
    S.glow(960, 280, 380, "#ffffff", 0.5)
    a = S.el("💍", 500, 170, 170)
    b = S.el("💍", 1250, 170, 170)
    S.pop_in(a, S.s + 0.1)
    S.pop_in(b, S.s + 0.2)
    t = S.word_t("aapna")
    S.to(a, "{x:330, rotation:-20, duration:0.9, ease:'power3.inOut'}", t - 0.8)
    S.to(b, "{x:-330, rotation:20, duration:0.9, ease:'power3.inOut'}", t - 0.8)
    hs = S.el("🤝", 870, 420, 130, style="opacity:0")
    S.pop_in(hs, t + 0.2)


def sc_heartbeat(S):
    S.bg("linear-gradient(180deg,#2b0a14 0%,#7a1630 60%,#c0294f 100%)")
    S.h.append('<svg class="ecg" viewBox="0 0 1920 300"><path d="M0 150 H600 L650 150 L690 40 L740 260 L790 90 L830 150 H1100 L1150 150 L1190 40 L1240 260 L1290 90 L1330 150 H1920"/></svg>')
    sel = "#" + S.id + " .ecg path"
    S.tw(sel, "{strokeDashoffset:2600}", "{strokeDashoffset:0, duration:2.2, ease:'none'}", S.s + 0.2)
    h = S.el("❤️", 870, 60, 170)
    S.pop_in(h, S.s + 0.1)
    S.pulse_on_beats(h, S.s + 0.6, S.e, 1.2)
    hug = S.el("🫂", 1500, 120, 140, style="opacity:0")
    S.pop_in(hug, S.word_t("baahaan"))


def sc_forever(S):
    S.bg("radial-gradient(ellipse at 50% 35%,#ffc3d8 0%,#e95b8f 50%,#6d1a45 100%)")
    h = S.el("❤️", 810, 90, 300)
    S.pop_in(h, S.s + 0.1)
    home = S.el("🏡", 905, 200, 110, style="opacity:0")
    S.pop_in(home, S.word_t("dil") + 0.1)
    inf = S.el("♾️", 870, 430, 170, style="opacity:0")
    S.pop_in(inf, S.word_t("sadaa"))
    S.to(inf, "{scale:1.15, duration:0.4, yoyo:true, repeat:3}", S.word_t("sadaa") + 0.6)


def sc_eyes(S):
    S.bg("linear-gradient(135deg,#0f3d3e 0%,#1f7a75 60%,#79d1c3 100%)")
    eyes = S.el("👀", 840, 130, 230)
    S.pop_in(eyes, S.s + 0.1)
    S.to(eyes, "{x:-120, duration:0.4, yoyo:true, repeat:3, ease:'sine.inOut'}", S.word_t("dekhe"))
    t = S.word_t("saans")
    for k in range(4):
        w = S.el("", 760, 300 + k * 30, cls="breath", style="opacity:0")
        S.tw(w, "{scaleX:0.2, opacity:0}", "{scaleX:1, opacity:0.7, duration:0.8, ease:'power2.out', yoyo:true, repeat:1}", t + k * 0.15)
    hs = S.el("😍", 1450, 250, 130, style="opacity:0")
    S.pop_in(hs, S.word_t("chaave") - 0.2)


def sc_magnet(S):
    S.bg("linear-gradient(135deg,#43275a 0%,#7b4397 60%,#dc2430 100%)")
    a = S.el("🙋‍♀️", 820, 200, 160)
    b = S.el("🙋‍♂️", 1010, 200, 160)
    S.pop_in(a, S.s + 0.1)
    S.pop_in(b, S.s + 0.1)
    t = S.word_t("hat-ti")
    S.to(a, "{x:-500, duration:1.2, ease:'power2.out'}", t - 0.2)
    S.to(b, "{x:-480, duration:1.4, ease:'power2.inOut'}", S.word_t("nede") - 0.6)
    mag = S.el("🧲", 1500, 90, 140, style="opacity:0")
    S.pop_in(mag, S.word_t("utna"), rot=-30)


def sc_sulk(S):
    S.bg("linear-gradient(135deg,#ffecd2 0%,#fcb69f 60%,#e46a6a 100%)")
    a = S.el("😤", 860, 160, 210)
    S.pop_in(a, S.s + 0.1)
    S.tw(a, "{x:-10}", "{x:10, duration:0.06, yoyo:true, repeat:9}", S.word_t("russu"))
    t = S.word_t("galti")
    b = S.el("🙏", 1380, 200, 150, style="opacity:0")
    S.pop_in(b, t - 0.2)
    c = S.el("🥰", 860, 160, 210, style="opacity:0")
    S.fade_out(a, S.word_t("manaave") - 0.2, 0.25)
    S.pop_in(c, S.word_t("manaave"))
    sorry = S.el("sorry!", 1450, 110, 60, cls="obj tag", style="opacity:0")
    S.pop_in(sorry, t, rot=-8)


def sc_hands(S):
    S.bg("linear-gradient(180deg,#ff8a65 0%,#f4511e 55%,#7a2a10 100%)")
    l = S.el("🫱", 500, 200, 190)
    r = S.el("🫲", 1220, 200, 190)
    t = S.word_t("haath")
    S.tw(l, "{x:-300, opacity:0}", "{x:0, opacity:1, duration:0.5}", S.s + 0.1)
    S.tw(r, "{x:300, opacity:0}", "{x:0, opacity:1, duration:0.5}", S.s + 0.1)
    S.to(l, "{x:280, duration:0.6, ease:'power3.in'}", t)
    S.to(r, "{x:-280, duration:0.6, ease:'power3.in'}", t)
    shake = S.el("🤝", 870, 190, 200, style="opacity:0")
    S.pop_in(shake, t + 0.6)
    S.to(l, "{opacity:0, duration:0.1}", t + 0.6)
    S.to(r, "{opacity:0, duration:0.1}", t + 0.6)
    pin = S.el("📍", 1480, -200, 140)
    S.tw(pin, "{y:0}", "{y:330, duration:0.7, ease:'bounce.out'}", S.word_t("jagah"))


def sc_nazar(S):
    S.bg("radial-gradient(ellipse at 50% 30%,#4fc3f7 0%,#0d47a1 60%,#071a3d 100%)")
    S.glow(960, 280, 360, "#bfe9ff", 0.55)
    S.h.append(f'<div class="string" id="{S.id}-str"></div>')
    eye = S.el("🧿", 860, 230, 200)
    S.tw(f"#{S.id}-str, {eye}", "{y:-500}", "{y:0, duration:0.8, ease:'bounce.out'}", S.s)
    S.tw(f"#{S.id}-str, {eye}", "{rotation:-14, transformOrigin:'50% -200px'}",
         "{rotation:14, transformOrigin:'50% -200px', duration:0.6, yoyo:true, repeat:2, ease:'sine.inOut'}", S.s + 0.6)


def sc_thread(S):
    S.bg("linear-gradient(180deg,#1b1b2f 0%,#3a2f4f 60%,#6b3f5f 100%)")
    S.h.append('<svg class="thread" viewBox="0 0 1920 600"><path d="M300 300 C 600 120, 800 480, 960 300 S 1300 120, 1620 300"/>'
               '<path d="M930 300 c -40 -60, 100 -60, 60 0 c -40 60, 100 60, 60 0" /></svg>')
    S.tw(f"#{S.id} .thread path", "{strokeDashoffset:2000}", "{strokeDashoffset:0, duration:1.6, ease:'power2.inOut', stagger:0.8}", S.word_t("baandh"))
    eye = S.el("🧿", 905, 330, 110, style="opacity:0")
    S.pop_in(eye, S.word_t("kaale"))
    S.twinkle(16, S.s, S.e, color="#ffd84d")


def sc_winter(S):
    S.bg("linear-gradient(180deg,#a8c0ff 0%,#5b7fd6 55%,#2a3d7c 100%)")
    S.fall_down(["❄️"], 40, S.s - 0.5, S.e - 2, size=(30, 70), alpha=0.95, spin=360)
    t = S.word_t("hawaavaan")
    for k in range(6):
        w = S.el("", 0, 140 + k * 70, cls="wind", style="opacity:0")
        S.tw(w, "{x:-900, opacity:0}", "{x:2200, opacity:0.8, duration:1.3, ease:'sine.inOut'}", t - 0.6 + k * 0.12)
    wf = S.el("🌬️", 1450, 120, 160, style="opacity:0")
    S.pop_in(wf, t - 0.5)
    sc = S.el("🧣", 840, 180, 200, style="opacity:0")
    S.pop_in(sc, S.word_t("baahaan"))


def sc_faraway(S):
    S.bg("linear-gradient(180deg,#141e30 0%,#35577d 55%,#e2a38a 100%)")
    S.h.append('<div class="mountains"></div><div class="road"></div>')
    S.tw(f"#{S.id} .mountains", "{y:200}", "{y:0, duration:1.5, ease:'power3.out'}", S.s)
    S.tw(f"#{S.id} .road", "{scaleY:0}", "{scaleY:1, duration:1.4, ease:'power2.out'}", S.s + 0.3)
    globe = S.el("🌍", 860, 130, 210)
    S.pop_in(globe, S.s + 0.1)
    S.to(globe, "{scale:0.2, y:-150, x:400, opacity:0.5, duration:2.5, ease:'power2.in'}", S.word_t("door"))
    couple = S.el("👫", 900, 330, 110, style="opacity:0")
    S.tw(couple, "{opacity:0, scale:1.6, y:80}", "{opacity:1, scale:0.6, y:-40, duration:3, ease:'sine.out'}", S.word_t("jaake"))
    tear = S.el("🥲", 1500, 160, 120, style="opacity:0")
    S.pop_in(tear, S.word_t("dukhde"))


def sc_onlyyou(S):
    S.bg("radial-gradient(ellipse at 50% 35%,#3a1c2e 0%,#1a0b16 100%)")
    sel = []
    for i in range(30):
        x, y = 140 + (i % 10) * 170, 70 + (i // 10) * 170
        sel.append(S.el("🤍", x, y, 70, style="opacity:0.35"))
    S.tw(f"#{S.id} .obj", "{opacity:0}", "{opacity:0.35, duration:0.6, stagger:0.02}", S.s)
    star = S.el("❤️", 140 + 4 * 170 + 85, 70 + 170, 70, style="opacity:0")
    t = S.word_t("nazraan")
    S.tw(star, "{opacity:0, scale:1}", "{opacity:1, scale:2.6, duration:0.8, ease:'back.out(2)'}", t - 0.2)
    S.glow(980, 280, 300, "#ff4d6d", 0.6)
    S.to(f"#{S.id} .obj:not({star})", "{opacity:0.1, duration:0.6}", t - 0.2)
    S.pulse_on_beats(star, t + 0.8, S.e, 1.1)


def sc_prayer(S):
    S.bg("linear-gradient(180deg,#fff3c4 0%,#f9c74f 40%,#c96f2a 100%)")
    S.h.append('<div class="rays"></div>')
    S.tw(f"#{S.id} .rays", "{rotation:0, opacity:0}", f"{{rotation:40, opacity:0.9, duration:{S.e - S.s + 1:.1f}, ease:'none'}}", S.s)
    p = S.el("🙏", 860, 170, 220)
    S.pop_in(p, S.word_t("rabb") - 0.3)
    S.pulse_on_beats(p, S.word_t("rabb") + 0.5, S.e, 1.06, every=2)
    for k, x in enumerate([300, 1500]):
        d = S.el("🕊️", x, 150, 120, style="opacity:0")
        S.tw(d, "{y:200, opacity:0}", "{y:0, opacity:1, duration:1.5, ease:'power2.out'}", S.word_t("sacchi") + k * 0.3)


def sc_petals(S):
    S.bg("linear-gradient(180deg,#ffd1dc 0%,#f48fb1 50%,#880e4f 100%)")
    S.fall_down(["🌸", "🌺", "🥀", "💮"], 34, S.s - 0.6, S.e - 1.5, size=(40, 90), spin=300)
    h = S.el("💝", 860, 170, 210)
    S.pop_in(h, S.s + 0.1)
    S.pulse_on_beats(h, S.s + 0.6, S.e, 1.1)


def sc_finale(S):
    sc_heart(S)
    S.h[0] = '<div class="bgfill" style="background:linear-gradient(180deg,#3b2a6b 0%,#a2457a 45%,#f08a6a 75%,#ffd08a 100%)"></div>'
    S.float_up(["💗", "💕", "💖", "❤️"], 30, S.s + 2, S.e - 1.5, size=(50, 120))
    S.to(f"#{S.id} .obj", "{opacity:0, duration:0.5}", S.e - 3.0)
    end = S.el("Dil De Baithi", 960, 300, 120, cls="obj artist", style="opacity:0;font-weight:800")
    S.tw(end, "{opacity:0, scale:0.6}", "{opacity:1, scale:1, duration:0.8, ease:'back.out(2)'}", S.e - 2.6)


SCENES = {k[3:]: v for k, v in globals().items() if k.startswith("sc_")}

# ---------------------------------------------------------------- lyrics
by_slide = {}
for ln in L["lines"]:
    by_slide.setdefault(ln["slide"], []).append(ln)

scene_html, js = [], []
slides = L["slides"]
for i, sl in enumerate(slides):
    s, e = sl["s"], sl["e"]
    nxt = slides[i + 1]["s"] if i + 1 < len(slides) else T1
    end = min(T1, nxt + 0.6)
    if end <= T0 or s >= T1:
        continue
    S = Scene(f"sc{i}", s, end, by_slide.get(i, []))
    SCENES[sl["scene"]](S)
    a = max(s, T0)
    scene_html.append(
        f'<div id="sc{i}" class="clip scene" data-start="{rt(a)}" data-duration="{round(end - a, 3)}" '
        f'data-track-index="1" style="z-index:{i + 1}">\n  ' + "\n  ".join(S.h) + "\n</div>")
    if s > T0:
        js.append(f'tl.fromTo("#sc{i}", {{opacity:0}}, {{opacity:1, duration:0.6, ease:"power1.out"}}, {rt(s)});')
    js.extend(S.j)

lyric_html = []
for i, sl in enumerate(slides):
    lines = by_slide.get(i, [])
    if not lines or sl["e"] <= T0 or sl["s"] >= T1:
        continue
    a, b = max(sl["s"], T0), min(sl["e"], T1)
    rows = []
    for ln in lines:
        ws = "".join(f'<span class="w" id="w{i}-{ln["line"]}-{k}">{esc(w["w"])}</span> '
                     for k, w in enumerate(ln["words"]))
        rows.append(f'<div class="row">{ws.strip()}</div>')
    lyric_html.append(f'<div id="ly{i}" class="clip lyr" data-start="{rt(a)}" data-duration="{round(b - a, 3)}" '
                      f'data-track-index="2">{"".join(rows)}</div>')
    if sl["s"] >= T0:
        js.append(f'tl.fromTo("#ly{i} .row", {{opacity:0, y:40}}, {{opacity:1, y:0, duration:0.4, stagger:0.12, ease:"power3.out"}}, {rt(sl["s"])});')
    js.append(f'tl.to("#ly{i}", {{opacity:0, y:-20, duration:0.3, ease:"power2.in"}}, {rt(sl["e"] - 0.3)});')
    for ln in lines:
        words = ln["words"]
        for k, w in enumerate(words):
            t = w["t"]
            nxt = words[k + 1]["t"] if k + 1 < len(words) else ln["end"] + 0.2
            held = nxt - t
            sel = f"#w{i}-{ln['line']}-{k}"
            if not (T0 - 1 <= t <= T1):
                continue
            # the 'sing' moment: pop up, turn gold and glow
            js.append(f'tl.fromTo("{sel}", {{scale:1, y:0, color:"rgba(255,255,255,0.5)", textShadow:"0 4px 18px rgba(0,0,0,0.45)"}}, '
                      f'{{scale:1.16, y:-12, color:"#ffe066", textShadow:"0 0 26px rgba(255,214,64,0.95)", duration:0.12, ease:"power2.out"}}, {rt(t)});')
            settle = min(0.35, max(0.15, held * 0.6))
            js.append(f'tl.to("{sel}", {{scale:1.06, y:-4, duration:{settle:.2f}, ease:"power2.out"}}, {rt(t + 0.12)});')
            if held > 0.9:  # long note: stretch the word while it is held
                js.append(f'tl.to("{sel}", {{scaleX:1.16, duration:{held - 0.5:.2f}, ease:"sine.inOut"}}, {rt(t + 0.3)});')
            js.append(f'tl.to("{sel}", {{scale:1, scaleX:1, y:0, color:"#ffffff", textShadow:"0 4px 18px rgba(0,0,0,0.45)", duration:0.25}}, {rt(nxt)});')

page = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="assets/gsap.min.js"></script>
<style>
@font-face {{ font-family: "Baloo 2"; font-weight: 500; src: url(assets/fonts/baloo-2-latin-500-normal.woff2) format("woff2"); }}
@font-face {{ font-family: "Baloo 2"; font-weight: 700; src: url(assets/fonts/baloo-2-latin-700-normal.woff2) format("woff2"); }}
@font-face {{ font-family: "Baloo 2"; font-weight: 800; src: url(assets/fonts/baloo-2-latin-800-normal.woff2) format("woff2"); }}
@font-face {{ font-family: "Emoji"; src: url(assets/fonts/NotoColorEmoji.ttf); }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #2a1030; }}
#root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Baloo 2", "Emoji", sans-serif; }}
.clip {{ position: absolute; inset: 0; }}
.scene {{ overflow: hidden; }}
.bgfill {{ position: absolute; inset: 0; }}
.glow {{ position: absolute; border-radius: 50%; filter: blur(10px); }}
.obj {{ position: absolute; line-height: 1; font-family: "Emoji", "Baloo 2", sans-serif; will-change: transform; }}
.artist, .tag {{ font-family: "Baloo 2", sans-serif; font-weight: 700; color: #fff; transform: translateX(-50%); white-space: nowrap; text-shadow: 0 4px 22px rgba(0,0,0,0.45); }}
.artist {{ color: #ffe066; }}
.tag {{ background: #fff; color: #e46a6a; padding: 6px 26px; border-radius: 40px; }}
.titlebox {{ position: absolute; left: 0; right: 0; top: 250px; display: flex; justify-content: center; gap: 70px; font-size: 170px; }}
.tword {{ display: inline-flex; }}
.tch {{ display: inline-block; font-family: "Baloo 2", sans-serif; font-weight: 800; color: #fff; text-shadow: 0 8px 30px rgba(80,0,40,0.55); }}
.sun {{ position: absolute; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle,#fff6c9 0%,#ffd08a 45%,rgba(255,160,100,0) 70%); }}
.hills {{ position: absolute; width: 1920px; height: 340px; background:
   radial-gradient(ellipse 520px 220px at 15% 100%, #3b1d4a 98%, transparent 100%),
   radial-gradient(ellipse 600px 260px at 55% 105%, #2e1640 98%, transparent 100%),
   radial-gradient(ellipse 560px 240px at 92% 100%, #3b1d4a 98%, transparent 100%); }}
.skyline {{ position: absolute; left: 0; right: 0; bottom: 0; height: 420px; background:
   linear-gradient(#1d1b33,#1d1b33) 0 160px/260px 100% no-repeat,
   linear-gradient(#26223f,#26223f) 230px 60px/220px 100% no-repeat,
   linear-gradient(#1d1b33,#1d1b33) 430px 200px/300px 100% no-repeat,
   linear-gradient(#26223f,#26223f) 1080px 120px/420px 100% no-repeat,
   linear-gradient(#1d1b33,#1d1b33) 1480px 40px/220px 100% no-repeat,
   linear-gradient(#26223f,#26223f) 1680px 180px/240px 100% no-repeat;
   opacity: 0.85; }}
.speedline {{ position: absolute; width: 500px; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.75); }}
.bar {{ position: absolute; bottom: 0; width: 40px; height: 1080px; border-radius: 20px 20px 0 0; transform-origin: bottom; transform: scaleY(0.15);
   background: linear-gradient(0deg, rgba(255,90,160,0.55), rgba(255,224,102,0.55)); }}
.ecg {{ position: absolute; left: 0; top: 260px; width: 1920px; height: 300px; }}
.ecg path {{ fill: none; stroke: #ff8fab; stroke-width: 10; stroke-linejoin: round; stroke-dasharray: 2600; filter: drop-shadow(0 0 12px #ff4d6d); }}
.thread {{ position: absolute; left: 0; top: 60px; width: 1920px; height: 600px; }}
.thread path {{ fill: none; stroke: #0a0a0a; stroke-width: 14; stroke-linecap: round; stroke-dasharray: 2000; filter: drop-shadow(0 0 8px rgba(255,214,64,0.6)); }}
.breath, .wind {{ position: absolute; width: 400px; height: 10px; border-radius: 5px; background: rgba(255,255,255,0.7); transform-origin: left; }}
.wind {{ width: 700px; height: 6px; }}
.string {{ position: absolute; left: 958px; top: 0; width: 4px; height: 250px; background: #ddd; }}
.mountains {{ position: absolute; left: 0; right: 0; bottom: 0; height: 520px; background:
   linear-gradient(135deg, transparent 50%, #2b2d52 50%) 0 0/480px 520px no-repeat,
   linear-gradient(225deg, transparent 50%, #2b2d52 50%) 480px 0/480px 520px no-repeat,
   linear-gradient(135deg, transparent 50%, #23264a 50%) 900px 120px/420px 400px no-repeat,
   linear-gradient(225deg, transparent 50%, #23264a 50%) 1320px 120px/420px 400px no-repeat,
   linear-gradient(135deg, transparent 50%, #2b2d52 50%) 1600px 200px/320px 320px no-repeat; }}
.road {{ position: absolute; left: 760px; bottom: 0; width: 400px; height: 520px; transform-origin: bottom;
   background: linear-gradient(0deg,#3d3d5c,#5c5c80); clip-path: polygon(0 100%, 100% 100%, 52% 0, 48% 0); }}
.rays {{ position: absolute; left: 460px; top: -540px; width: 1000px; height: 1000px; border-radius: 50%;
   background: repeating-conic-gradient(rgba(255,255,255,0.35) 0deg 8deg, transparent 8deg 22deg); filter: blur(3px); }}
.lyr {{ display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 120px; z-index: 100; }}
.lyr::before {{ content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 520px;
   background: linear-gradient(0deg, rgba(20,5,25,0.55) 0%, rgba(20,5,25,0) 100%); }}
.row {{ position: relative; font-weight: 800; font-size: 86px; line-height: 1.25; text-align: center; padding: 0 80px; }}
.row {{ display: flex; flex-wrap: wrap; justify-content: center; column-gap: 0.42em; }}
.w {{ display: inline-block; color: rgba(255,255,255,0.5); text-shadow: 0 4px 18px rgba(0,0,0,0.45); transform-origin: 50% 80%; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="1920" data-height="1080" data-fps="30">
<audio id="song" src="assets/song.m4a" data-start="0" data-duration="{DUR}" data-media-start="{T0}" data-track-index="0" data-has-audio="true" data-fade-out="{2 if T1 >= L['duration'] else 0.3}"></audio>
{chr(10).join(scene_html)}
{chr(10).join(lyric_html)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(js)}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
"""
(HERE / "index.html").write_text(page, encoding="utf-8")
print(f"index.html: {DUR}s, {len(scene_html)} scenes, {len(lyric_html)} lyric slides, {len(js)} tweens")
