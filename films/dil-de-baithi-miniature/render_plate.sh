#!/bin/sh
# Renders the 3D picture plate (30 fps, 1280x720) in 4 chunks; skips chunks already done.
LIB=/home/user/lemomo-ai/lemo-opuscar
F=$(cd "$(dirname "$0")" && pwd)
export PLAYWRIGHT_CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
cd "$LIB"
for k in 0 1 2 3; do
  off=$(echo "$k * 60.5" | bc); dur=60.5; [ $k = 3 ] && dur=$(echo "241.8 - $off" | bc)
  [ -f "$F/out/plate_$k.mp4" ] && continue
  node core/render/video.mjs "$F" --fps 30 --workers 2 --size 1280x720 --q "off=$off&dur=$dur" --out "$F/out/plate_$k.tmp.mp4" 2>&1 | grep -v "GL Driver" | grep -E "^w0|error|Error" | tail -n 400
  [ -f "$F/out/plate_$k.tmp.mp4" ] && mv "$F/out/plate_$k.tmp.mp4" "$F/out/plate_$k.mp4"
  echo "chunk $k done $(date +%H:%M)"
done
