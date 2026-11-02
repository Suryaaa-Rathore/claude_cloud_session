# Tools

The editing toolchain. Run `bash tools/setup.sh` to install or restore everything.

| Tool | What it's for | How to run |
|---|---|---|
| FFmpeg | Cutting, joining, converting, audio, burning in captions | `ffmpeg ...` |
| whisper.cpp | Speech-to-text transcripts and timed captions | `whisper-cli -m /opt/tools/whisper.cpp/models/ggml-base.en.bin -f audio.wav -osrt` |
| yt-dlp | Downloading reference videos | `yt-dlp -o "references/%(title)s.%(ext)s" <url>` |
| Remotion (`remotion/`) | Motion graphics / templates written in React | `cd tools/remotion && npx remotion render src/index.ts TitleCard out.mp4 --browser-executable=/opt/pw-browsers/chromium` |
| Hyperframes (`hyperframes/`) | Motion graphics / compositions written in HTML | `cd tools/hyperframes/studio-test && npx hyperframes render -o out.mp4` |

Notes:
- Whisper needs audio as 16 kHz mono WAV: `ffmpeg -i clip.mp4 -ar 16000 -ac 1 clip.wav`.
- In this cloud environment, CDNs like jsdelivr are blocked, so Hyperframes projects load GSAP from a local `assets/gsap.min.js` instead.
