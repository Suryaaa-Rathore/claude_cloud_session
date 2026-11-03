# How a UPI payment works (60 s explainer, 9:16)

| File | What it is |
|---|---|
| `TREATMENT.md`, `FACTS.md` | Story, structure and sourced facts |
| `lines.json` → `voice/` | Narration (Kokoro TTS, checked word by word with Whisper) |
| `timeline.json` | Voice line starts and per-word timings, which drive picture, captions and sound |
| `main.js`, `engine.js`, `index.html` | The isometric diorama, `render(t)` (Canvas 2D) |
| `mix.py` | Score (kalimba, hang, nylon guitar, bass, synth shaker), foley, voice, ducking → `out/mix.wav` |

Render (from `/home/user/lemomo-ai/lemo-opuscar`):
```bash
node core/render/video.mjs <this folder> --fps 60 --workers 3 --size 1080x1920 --out <this folder>/out/video.mp4
```
Then run `python3 mix.py` and mux with loudnorm to −14 LUFS. Output: `exports/upi-explainer/how-upi-works_60s_9x16.mp4`.
