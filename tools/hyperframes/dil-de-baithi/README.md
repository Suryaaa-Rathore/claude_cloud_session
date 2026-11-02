# Dil De Baithi: lyric video (v2)

Kinetic lyric video for *Dil De Baithi* (Dhanda Nyoliwala), built with Hyperframes at 60fps.

## Pipeline
| Step | Script | What it does |
|---|---|---|
| 1 | `separate.py` | Splits the song into `stems/vocals.wav` + `stems/music.wav` (UVR-MDX-NET-Voc_FT via sherpa-onnx) |
| 2 | `timing.py` | Acoustic alignment on the clean vocals → `lyrics_dp.json` (line windows + fallback) |
| 3 | Whisper | `whisper-cli` (ggml-medium, Hindi) on each line clip → `stems/lines/lNN.wav.json` |
| 4 | `align.py` | Matches Whisper's words to the lyrics, snaps each word to the real syllable onset, detects lines sung twice, rejects timings that cross silence → `lyrics.json` |
| 5 | `build.py` | Builds `index.html`: illustrated parallax backgrounds, animated Noto emoji (Lottie) + Fluent 3D images per phrase, karaoke underline per word |
| 6 | render | `npx hyperframes render --fps 60 -o ../../../exports/dil-de-baithi/<name>.mp4` |

## Common edits
- **A word is early/late:** add `{"slide": S, "line": L, "word": W, "t": seconds}` to `"fixes"` in `slides.json`, then `python3 align.py && python3 build.py`.
- **Change a scene:** edit `"scene"` in `slides.json` (scene functions are `sc_<name>` in `build.py`).
- **Quick preview:** `python3 build.py --range 85 110`, then `npx hyperframes snapshot --at 90,95`. Run `python3 build.py` again before the full render.

## Assets
- Animated emoji: Google Noto Emoji animations (`assets/lottie/`, CC BY 4.0), bundled into `assets/lottie-data.js`.
- 3D images: Microsoft Fluent Emoji (`assets/img/`, MIT).
- Not in git (regenerate): `assets/song.m4a`, `stems/`, the emoji font.
