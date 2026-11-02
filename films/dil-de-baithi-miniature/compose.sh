#!/bin/sh
# 60 fps 1080p chunks (interp.sh) -> + lyric/HUD overlays -> + original song
set -e
F=$(cd "$(dirname "$0")" && pwd); O=$F/out
SONG=/home/user/claude_cloud_session/tools/hyperframes/dil-de-baithi/assets/song.m4a
printf "file '%s'\n" $O/i60_0.mp4 $O/i60_1.mp4 $O/i60_2.mp4 $O/i60_3.mp4 > $O/i60.txt
OUT=${1:-/home/user/claude_cloud_session/exports/dil-de-baithi/dil-de-baithi-lyrics_v3_miniature_60fps.mp4}
ffmpeg -v error -stats -y -f concat -safe 0 -i $O/i60.txt -i $O/ov_lyrics.mov -i $O/ov_hud.mov -i "$SONG" -filter_complex \
 "[0:v]setpts=N/60/TB,fps=60[bg];[bg][1:v]overlay=0:H-h:eof_action=pass[a];[a][2:v]overlay=40:36:eof_action=pass,format=yuv420p[v]" \
 -map "[v]" -map 3:a -c:v libx264 -preset medium -crf 17 -r 60 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
