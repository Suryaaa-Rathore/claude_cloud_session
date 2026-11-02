#!/bin/sh
# 60 fps 1080p chunks (interp.sh) -> + lyric/HUD overlays -> + original song
set -e
F=$(cd "$(dirname "$0")" && pwd); O=$F/out
SONG=/home/user/claude_cloud_session/tools/hyperframes/dil-de-baithi/assets/song.m4a
OUT=${1:-/home/user/claude_cloud_session/exports/dil-de-baithi/dil-de-baithi-lyrics_v3_miniature_60fps.mp4}
ffmpeg -v error -stats -y -i $O/i60_0.mp4 -i $O/i60_1.mp4 -i $O/i60_2.mp4 -i $O/i60_3.mp4 -i $O/ov_lyrics.mov -i $O/ov_hud.mov -i "$SONG" -i $O/fix60.mp4 -filter_complex \
 "[0:v]tpad=stop_mode=clone:stop=3,trim=end_frame=3630[c0];[1:v]tpad=stop_mode=clone:stop=3,trim=end_frame=3630[c1];[2:v]tpad=stop_mode=clone:stop=3,trim=end_frame=3630[c2];[3:v]tpad=stop_mode=clone:stop=6[c3];[c0][c1][c2][c3]concat=n=4:v=1:a=0,setpts=N/60/TB[bg0];[7:v]setpts=PTS-STARTPTS+189.7/TB[fx];[bg0][fx]overlay=0:0:eof_action=pass:enable='between(t,189.7,198.09)'[bg];[bg][4:v]overlay=0:H-h:eof_action=pass[a];[a][5:v]overlay=40:36:eof_action=pass,format=yuv420p[v]" \
 -map "[v]" -map 6:a -c:v libx264 -preset medium -crf 17 -r 60 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
