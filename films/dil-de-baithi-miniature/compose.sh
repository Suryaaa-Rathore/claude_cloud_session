#!/bin/sh
# plate (30 fps, 720p, 4 chunks) -> motion-interpolated 60 fps -> 1080p -> + lyric/HUD overlays -> + original song
set -e
F=$(cd "$(dirname "$0")" && pwd); O=$F/out
SONG=/home/user/claude_cloud_session/tools/hyperframes/dil-de-baithi/assets/song.m4a
[ -f "$SONG" ] || ffmpeg -v error -y -i /home/user/claude_cloud_session/raw/dil-de-baithi/source.mp4 -vn -c:a aac -b:a 192k "$SONG"
printf "file '%s'\n" $O/plate_0.mp4 $O/plate_1.mp4 $O/plate_2.mp4 $O/plate_3.mp4 > $O/plates.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/plates.txt -c copy $O/plate.mp4
OUT=${1:-/home/user/claude_cloud_session/exports/dil-de-baithi/dil-de-baithi-lyrics_v3_miniature_60fps.mp4}
ffmpeg -v error -stats -y -i $O/plate.mp4 -i $O/ov_lyrics.mov -i $O/ov_hud.mov -i "$SONG" -filter_complex \
 "[0:v]minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=6,scale=1920:1080:flags=lanczos,unsharp=5:5:0.4[bg];[bg][1:v]overlay=0:H-h:eof_action=pass[a];[a][2:v]overlay=40:36:eof_action=pass,format=yuv420p[v]" \
 -map "[v]" -map 3:a -c:v libx264 -preset medium -crf 17 -r 60 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
