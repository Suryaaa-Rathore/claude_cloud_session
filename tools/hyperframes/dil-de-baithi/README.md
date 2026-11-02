# Dil De Baithi — lyric video

Kinetic lyric video for *Dil De Baithi* (Dhanda Nyoliwala), built with Hyperframes.

## How it works
1. `slides.json`: the lyrics, slide timings (taken from the reference lyric video) and the **scene** for each slide.
2. `timing.py`: estimates when each line and word is sung from the audio, and writes `lyrics.json`.
3. `build.py`: turns `lyrics.json` into `index.html`. Each word pops gold as it's sung, long notes stretch, and each slide gets its own background and animated objects (heart, globe/moon/clock, rooftop and paper, stars counting, cup, rings, ECG heartbeat, evil eye, black thread, snow and wind, prayer rays, petals…).
4. Render: `npx hyperframes render -o ../../../exports/dil-de-baithi/<name>.mp4`

## Common edits
- **A word is early/late:** change its `"t"` in `lyrics.json`, then run `python3 build.py` (don't re-run `timing.py`, or it will overwrite your fix).
- **Change a scene for a slide:** edit `"scene"` in `slides.json` → `python3 timing.py && python3 build.py`.
- **Quick preview of one part:** `python3 build.py --range 85 110`, then snapshot or render. Run `python3 build.py` again before the full render.

## Restore assets (not in git)
```bash
cp ../../../raw/dil-de-baithi/source.mp4 /tmp/src.mp4 && ffmpeg -i /tmp/src.mp4 -vn -c:a aac -b:a 192k assets/song.m4a
cp /usr/share/fonts/truetype/noto/NotoColorEmoji.ttf assets/fonts/
```
