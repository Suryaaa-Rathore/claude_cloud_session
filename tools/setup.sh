#!/usr/bin/env bash
# Installs/re-installs the studio toolchain. Safe to re-run.
# Cloud sessions start from a fresh container, so run this at the start of a session
# (or paste it into the environment's setup script).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WHISPER_DIR="${WHISPER_DIR:-/opt/tools/whisper.cpp}"
WHISPER_MODEL="${WHISPER_MODEL:-base.en}"

echo "==> FFmpeg";       command -v ffmpeg >/dev/null || (apt-get update && apt-get install -y ffmpeg)
echo "==> yt-dlp";       pip3 install -q -U yt-dlp

echo "==> whisper.cpp"
if [ ! -x "$WHISPER_DIR/build/bin/whisper-cli" ]; then
  mkdir -p "$(dirname "$WHISPER_DIR")"
  [ -d "$WHISPER_DIR" ] || git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$WHISPER_DIR"
  cmake -S "$WHISPER_DIR" -B "$WHISPER_DIR/build" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$WHISPER_DIR/build" -j"$(nproc)" --config Release
fi
ln -sf "$WHISPER_DIR/build/bin/whisper-cli" /usr/local/bin/whisper-cli
if [ ! -f "$WHISPER_DIR/models/ggml-$WHISPER_MODEL.bin" ]; then
  bash "$WHISPER_DIR/models/download-ggml-model.sh" "$WHISPER_MODEL" \
    || echo "!! Could not download Whisper model (needs huggingface.co network access)"
fi

echo "==> Remotion";     (cd "$ROOT/tools/remotion" && npm ci --silent)
echo "==> Hyperframes"
(cd "$ROOT/tools/hyperframes" && npm ci --silent && cp node_modules/gsap/dist/gsap.min.js studio-test/assets/)
echo "Done."
