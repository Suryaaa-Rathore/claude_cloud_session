# Dil De Baithi: Tilt-Shift Miniature (v3)

A lyric film in the **Tilt-Shift Miniature** style from [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT / CC BY 4.0). A Haryana village is rendered as a tabletop model in three.js, with a tilt-shift lens, time-lapse stepping on the 16th-note grid and a smooth camera.

| File | What it is |
|---|---|
| `TREATMENT.md` | Story, structure and beat map |
| `village.js` | The procedural village: havelis, lanes, fields, pond, peepal, temple, props, lamps, field title |
| `people.js` | The two heroes (articulated), villagers, Bullet, tractor, bullock cart, buffaloes, kites |
| `main.js` | Shots keyed to the lyric slides, clock → sun, effects (stars, rain, smoke, light string, trails), lens |
| `post.js`, `sky.js`, `geo.js`, `city.js` | Engine from the style's demo (lens/grade, sky, geometry, facade shader) |
| `overlay.py` | 60 fps lyrics on a green road-sign panel + time-lapse clock + end card |
| `render_plate.sh` | Renders the 3D plate (30 fps, 1280×720) in 4 resumable chunks |
| `compose.sh` | Interpolates to 60 fps, upscales to 1080p, composites the overlays, muxes the song |

The library is cloned at `/home/user/lemomo-ai/lemo-opuscar` (`npm install` there). Lyric timings come from `tools/hyperframes/dil-de-baithi/lyrics.json` (Whisper + vocal alignment).

**Render time without a GPU:** about 2 s per frame (software WebGL), so the full plate takes about 4 h.
