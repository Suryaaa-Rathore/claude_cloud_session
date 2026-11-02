#!/usr/bin/env python3
"""60 fps 2D layer: lyrics on a green road-sign panel (word-by-word karaoke) + time-lapse clock + end card.

Writes two alpha videos (qtrle .mov) that compose.sh lays over the 3D plate:
  out/ov_lyrics.mov  1920x360 strip for the bottom of the frame
  out/ov_hud.mov     460x150 clock for the top-left corner
  python3 overlay.py [--preview T0 T1] [--still T --out file.png]
"""
import json
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FPS, DUR = 60, 241.8
L = json.loads((HERE / "data/lyrics.json").read_text())
SHOTS = json.loads((HERE / "data/shots.json").read_text())
BEATS = json.loads((HERE / "data/beats.json").read_text())["beats"]
B = 60 / 130.1
G0, SR = BEATS[0], 4 / B

SANS = str(HERE / "fonts/Overpass-var.ttf")
MONO = str(HERE / "fonts/OverpassMono-var.ttf")


def font(path, size, weight):
    f = ImageFont.truetype(path, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


F_LYR = font(SANS, 58, 700)
F_CLK = font(MONO, 64, 600)
F_SEC = font(MONO, 30, 600)
F_TAG = font(MONO, 24, 700)
F_END = font(SANS, 96, 800)
F_END2 = font(SANS, 40, 600)

GREEN, KEY, WHITE, YEL, AMBER, LGREEN = (15, 94, 60), (240, 245, 240), (255, 255, 255), (255, 214, 10), (255, 176, 32), (90, 230, 120)
SW, SH_ = 1920, 360   # lyric strip size (bottom of frame)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


# —— lyric slides ——
slides = {}
for ln in L["lines"]:
    slides.setdefault(ln["slide"], []).append(ln)
SL = []
for si, lines in sorted(slides.items()):
    s = L["slides"][si]
    first = min(w["t"] for l in lines for w in l["words"])
    last = max(w["e"] for l in lines for w in l["words"])
    nxt = L["slides"][si + 1]["s"] if si + 1 < len(L["slides"]) else DUR
    show = min(s["s"], first - .45)
    hide = min(max(s["e"], last + .3), nxt + .2)
    rows = [l for l in lines if l.get("rep", 0) == 0]
    SL.append({"si": si, "show": show, "hide": hide, "rows": rows, "all": lines})


def word_state(sl, line_idx, k, t):
    """returns (lit 0..1 yellow, sung bool, sweep 0..1) considering repeats"""
    best = None
    for l in sl["all"]:
        if l["line"] != line_idx:
            continue
        w = l["words"][k]
        if t >= w["t"] - .02:
            best = w
    if best is None:
        return 0.0, False, 0.0
    w = best
    if t < w["e"]:
        return 1.0, True, clamp((t - w["t"]) / max(.1, w["e"] - w["t"]))
    # dim back before a repeat pass begins
    for l in sl["all"]:
        if l["line"] == line_idx and l.get("rep", 0) > 0 and l["words"][0]["t"] - .35 <= t and w["t"] < l["words"][0]["t"]:
            return 0.0, False, 0.0
    return clamp(1 - (t - w["e"]) / .25), True, 0.0


def draw_lyrics(t):
    im = Image.new("RGBA", (SW, SH_), (0, 0, 0, 0))
    sl = next((s for s in SL if s["show"] <= t < s["hide"]), None)
    if sl is None:
        return im
    a_in, a_out = ease((t - sl["show"]) / .3), ease((sl["hide"] - t) / .25)
    alpha = min(a_in, a_out)
    dy = int((1 - a_in) * 40)
    d = ImageDraw.Draw(im)
    rows = sl["rows"]
    # measure
    space = d.textlength(" ", font=F_LYR)
    widths = [[d.textlength(w["w"], font=F_LYR) for w in r["words"]] for r in rows]
    roww = [sum(ws) + space * (len(ws) - 1) for ws in widths]
    pw = int(max(roww) + 150)
    ph = 78 * len(rows) + 44
    x0, y0 = (SW - pw) // 2, SH_ - 118 - ph + dy
    layer = Image.new("RGBA", (SW, SH_), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([x0 + 6, y0 + 10, x0 + pw + 6, y0 + ph + 10], 22, fill=(0, 0, 0, 70))      # soft drop shadow
    ld.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], 22, fill=GREEN + (255,))
    ld.rounded_rectangle([x0 + 9, y0 + 9, x0 + pw - 9, y0 + ph - 9], 15, outline=KEY + (255,), width=4)
    # little heart pictogram on the left (the sign's symbol)
    hx, hy = x0 + 46, y0 + ph // 2
    ld.ellipse([hx - 17, hy - 13, hx + 1, hy + 5], fill=WHITE + (255,)); ld.ellipse([hx - 1, hy - 13, hx + 17, hy + 5], fill=WHITE + (255,))
    ld.polygon([(hx - 17, hy - 2), (hx + 17, hy - 2), (hx, hy + 18)], fill=WHITE + (255,))
    for ri, r in enumerate(rows):
        x = x0 + 90 + (pw - 120 - roww[ri]) / 2
        y = y0 + 26 + ri * 78
        for k, w in enumerate(r["words"]):
            lit, sung, sweep = word_state(sl, r["line"], k, t)
            if lit > 0:
                c = tuple(int(WHITE[i] + (YEL[i] - WHITE[i]) * lit) for i in range(3)) + (255,)
            elif sung:
                c = WHITE + (255,)
            else:
                c = WHITE + (140,)
            ld.text((x, y), w["w"], font=F_LYR, fill=c)
            if sweep > 0:
                ld.rounded_rectangle([x, y + 66, x + widths[ri][k] * sweep, y + 72], 3, fill=YEL + (255,))
            x += widths[ri][k] + space
    if alpha < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
    im.alpha_composite(layer)
    return im


# —— clock (hours + speed) replicating the picture's clock ——
def shot_at(t):
    for s in SHOTS:
        if s["t0"] <= t < s["t1"]:
            return s
    return SHOTS[-1]


def clock_at(t):
    s = shot_at(t)
    speed = (s["clock"][1] - s["clock"][0]) * 3600 / (s["t1"] - s["t0"])
    step = (not s["rt"]) and speed > 2
    tq = G0 + math.floor((t - G0) * SR) / SR if step else t
    u = clamp((tq - s["t0"]) / (s["t1"] - s["t0"]))
    h = s["clock"][0] + (s["clock"][1] - s["clock"][0]) * u
    if s["flip"] and s["flip"][0] < tq < s["flip"][1]:
        h += 48 * clamp((tq - s["flip"][0]) / (s["flip"][1] - s["flip"][0]))
        speed = 48 * 3600 / (s["flip"][1] - s["flip"][0])
    return h, (speed if step else 1)


def draw_hud(t):
    im = Image.new("RGBA", (460, 150), (0, 0, 0, 0))
    a = clamp((t - 27.0) / .5) * clamp((DUR - 4 - t) / .5)   # appears with the first chorus
    if a <= 0:
        return im
    h, sp = clock_at(t)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([4, 4, 300, 132], 16, fill=(10, 20, 16, int(170 * a)), outline=(255, 255, 255, int(70 * a)), width=2)
    hh = int(h % 24); mm = int((h * 60) % 60); ss = int((h * 3600) % 60)
    d.text((22, 12), f"{hh:02d}:{mm:02d}", font=F_CLK, fill=(255, 255, 255, int(255 * a)))
    d.text((232, 38), f"{ss:02d}", font=F_SEC, fill=(255, 255, 255, int(200 * a)))
    if sp > 1.5:
        tag, col = f"×{int(round(sp)):d} TIME-LAPSE", AMBER
        if sp >= 1000:
            tag = f"×{int(round(sp / 100) * 100):,} TIME-LAPSE"
    else:
        tag, col = "×1 REAL TIME", LGREEN
    d.text((22, 92), tag, font=F_TAG, fill=col + (int(255 * a),))
    return im


def draw_end(t, im):
    """end card in the road-sign language (last seconds), drawn into the lyric strip."""
    a = clamp((t - (DUR - 5.5)) / .6) * clamp((DUR - .3 - t) / .5)
    if a <= 0:
        return
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    t1, t2 = "Dil De Baithi", "Dhanda Nyoliwala"
    w1, w2 = d.textlength(t1, font=F_END), d.textlength(t2, font=F_END2)
    pw = int(max(w1, w2) + 140); ph = 190
    x0, y0 = (SW - pw) // 2, SH_ - 118 - ph
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], 26, fill=GREEN + (255,))
    d.rounded_rectangle([x0 + 10, y0 + 10, x0 + pw - 10, y0 + ph - 10], 18, outline=KEY + (255,), width=5)
    d.text(((SW - w1) / 2, y0 + 18), t1, font=F_END, fill=WHITE + (255,))
    d.text(((SW - w2) / 2, y0 + 128), t2, font=F_END2, fill=YEL + (255,))
    layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    im.alpha_composite(layer)


def frame(t):
    lyr = draw_lyrics(t)
    draw_end(t, lyr)
    return lyr, draw_hud(t)


if __name__ == "__main__":
    if "--still" in sys.argv:
        t = float(sys.argv[sys.argv.index("--still") + 1]); out = sys.argv[sys.argv.index("--out") + 1]
        lyr, hud = frame(t)
        bg = Image.new("RGBA", (1920, 1080), (90, 110, 90, 255)); bg.alpha_composite(lyr, (0, 1080 - SH_)); bg.alpha_composite(hud, (40, 36)); bg.convert("RGB").save(out)
        sys.exit()
    t0, t1 = 0.0, DUR
    if "--preview" in sys.argv:
        i = sys.argv.index("--preview"); t0, t1 = float(sys.argv[i + 1]), float(sys.argv[i + 2])
    n = int(round((t1 - t0) * FPS))
    out = HERE / "out"; out.mkdir(exist_ok=True)
    enc = lambda w, h, f: subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                                             "-c:v", "qtrle", str(out / f)], stdin=subprocess.PIPE)
    pl, ph_ = enc(SW, SH_, "ov_lyrics.mov"), enc(460, 150, "ov_hud.mov")
    for i in range(n):
        lyr, hud = frame(t0 + i / FPS)
        pl.stdin.write(lyr.tobytes()); ph_.stdin.write(hud.tobytes())
        if i % 1200 == 0:
            print(f"{i}/{n}", flush=True)
    pl.stdin.close(); ph_.stdin.close(); pl.wait(); ph_.wait()
    print("overlay done")
