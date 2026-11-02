#!/usr/bin/env python3
"""Builds index.html (the Hyperframes composition) from lyrics.json.

Usage:
  python3 build.py                 # full lyric video
  python3 build.py --preview 32    # only the first 32 seconds (quick test render)

lyrics.json format:
  { "title": ..., "credits": ..., "featuring": ..., "songEnd": <seconds>,
    "lines": [ { "start": 21.2, "end": 25.5, "text": "main line", "sub": "optional second line" } ] }
"""
import html
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
data = json.loads((HERE / "lyrics.json").read_text(encoding="utf-8"))

duration = float(data["songEnd"])
if "--preview" in sys.argv:
    duration = min(duration, float(sys.argv[sys.argv.index("--preview") + 1]))

INTRO_END = 11.0  # the original video's own title card appears at ~12s
lines = [l for l in data["lines"] if l["start"] < duration]

esc = html.escape


def words(text):
    return " ".join(f'<span class="w">{esc(w)}</span>' for w in text.split())


line_html, line_js = [], []
for i, l in enumerate(lines):
    start, end = float(l["start"]), min(float(l["end"]), duration)
    length = round(end - start, 3)
    sub = f'<div class="sub">{esc(l["sub"])}</div>' if l.get("sub") else ""
    line_html.append(
        f'      <div id="l{i}" class="clip lyric" data-start="{start}" data-duration="{length}" data-track-index="2">\n'
        f'        <div class="main">{words(l["text"])}</div>\n'
        f'        <div class="rule"></div>{sub}\n'
        f"      </div>"
    )
    out = max(start + 0.4, end - 0.35)
    line_js.append(
        f'      tl.fromTo("#l{i} .w", {{opacity: 0, y: 40, filter: "blur(10px)"}}, '
        f'{{opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, stagger: 0.07, ease: "power3.out"}}, {start});\n'
        f'      tl.fromTo("#l{i} .rule", {{scaleX: 0}}, {{scaleX: 1, duration: 0.6, ease: "power2.out"}}, {start + 0.1});\n'
        f'      tl.fromTo("#l{i} .sub", {{opacity: 0, y: 12}}, {{opacity: 0.85, y: 0, duration: 0.5, ease: "power2.out"}}, {start + 0.25});\n'
        f'      tl.to("#l{i}", {{opacity: 0, y: -24, filter: "blur(6px)", duration: 0.3, ease: "power2.in"}}, {out});'
    )

page = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face {{ font-family: "Yellowtail"; src: url(assets/fonts/yellowtail-latin-400-normal.woff2) format("woff2"); }}
      @font-face {{ font-family: "Poppins"; font-weight: 400; src: url(assets/fonts/poppins-latin-400-normal.woff2) format("woff2"); }}
      @font-face {{ font-family: "Poppins"; font-weight: 600; src: url(assets/fonts/poppins-latin-600-normal.woff2) format("woff2"); }}
      @font-face {{ font-family: "Poppins"; font-weight: 800; src: url(assets/fonts/poppins-latin-800-normal.woff2) format("woff2"); }}
      @font-face {{ font-family: "Noto Sans Malayalam"; font-weight: 500; src: url(assets/fonts/noto-sans-malayalam-malayalam-500-normal.woff2) format("woff2"); }}
      @font-face {{ font-family: "Noto Sans Malayalam"; font-weight: 700; src: url(assets/fonts/noto-sans-malayalam-malayalam-700-normal.woff2) format("woff2"); }}
      :root {{
        --wine: #2a0508;
        --red: #8e1418;
        --gold: #f2c230;
        --ink: #fff7ea;
        --font-title: "Yellowtail", cursive;
        --font-text: "Poppins", "Noto Sans Malayalam", sans-serif;
      }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: var(--wine); }}
      #root {{ position: relative; width: 100%; height: 100%; font-family: var(--font-text); }}
      .clip {{ position: absolute; inset: 0; }}
      #bg {{ width: 100%; height: 100%; object-fit: cover; filter: brightness(0.42) saturate(1.15) blur(3px); transform: scale(1.04); }}
      #shade {{
        background:
          radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(10,0,2,0.75) 100%),
          linear-gradient(180deg, rgba(42,5,8,0.15) 0%, rgba(42,5,8,0.55) 100%);
      }}
      #intro {{ display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }}
      #intro .title {{ font-family: var(--font-title); color: var(--gold); font-size: 260px; line-height: 1; text-shadow: 0 8px 40px rgba(0,0,0,0.6); }}
      #intro .credits {{ margin-top: 36px; color: var(--ink); font-weight: 600; font-size: 40px; letter-spacing: 0.35em; }}
      #intro .feat {{ margin-top: 18px; color: var(--gold); font-weight: 400; font-size: 34px; letter-spacing: 0.12em; }}
      .lyric {{ display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 160px; }}
      .lyric .main {{ color: var(--ink); font-weight: 800; font-size: 96px; line-height: 1.15; text-shadow: 0 6px 30px rgba(0,0,0,0.65); }}
      .lyric .w {{ display: inline-block; }}
      .lyric .rule {{ width: 220px; height: 6px; margin: 34px 0 26px; background: var(--gold); border-radius: 3px; transform-origin: center; }}
      .lyric .sub {{ color: var(--gold); font-weight: 600; font-size: 44px; letter-spacing: 0.02em; text-shadow: 0 4px 20px rgba(0,0,0,0.6); }}
      #bug {{ display: flex; align-items: flex-start; justify-content: flex-end; padding: 48px 64px; }}
      #bug span {{ font-family: var(--font-title); color: var(--gold); font-size: 64px; opacity: 0.85; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{duration}" data-width="1920" data-height="1080" data-fps="24">
      <video id="bg" class="clip" src="assets/source.mp4" data-start="0" data-duration="{duration}" data-track-index="0" data-has-audio="true" data-fade-out="2"></video>
      <div id="shade" class="clip" data-start="0" data-duration="{duration}" data-track-index="1"></div>
      <div id="intro" class="clip" data-start="0" data-duration="{INTRO_END}" data-track-index="2">
        <div class="title">{esc(data["title"])}</div>
        <div class="credits">{esc(data["credits"])}</div>
        <div class="feat">{esc(data.get("featuring", ""))}</div>
      </div>
      <div id="bug" class="clip" data-start="{INTRO_END}" data-duration="{round(duration - INTRO_END, 3)}" data-track-index="3"><span>{esc(data["title"])}</span></div>
{chr(10).join(line_html)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo("#intro .title", {{opacity: 0, scale: 0.85, filter: "blur(14px)"}}, {{opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.4, ease: "power3.out"}}, 2.37);
      tl.fromTo("#intro .credits", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.8, ease: "power2.out"}}, 4.63);
      tl.fromTo("#intro .feat", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.8, ease: "power2.out"}}, 6.88);
      tl.to("#intro", {{opacity: 0, duration: 0.8, ease: "power2.in"}}, {INTRO_END - 0.9});
      tl.fromTo("#bug", {{opacity: 0}}, {{opacity: 1, duration: 1}}, {INTRO_END});
{chr(10).join(line_js)}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""
(HERE / "index.html").write_text(page, encoding="utf-8")
print(f"index.html written: {len(lines)} lyric lines, {duration:.1f}s")
