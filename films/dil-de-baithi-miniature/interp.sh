#!/bin/sh
# 30 fps 720p plate chunk -> 60 fps 1080p (motion-compensated), one chunk at a time as they finish
O=$(cd "$(dirname "$0")" && pwd)/out
for k in 0 1 2 3; do
  while [ ! -f $O/plate_$k.mp4 ]; do sleep 30; done
  [ -f $O/i60_$k.mp4 ] && continue
  nice -n 5 ffmpeg -v error -y -i $O/plate_$k.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=6,scale=1920:1080:flags=lanczos,unsharp=5:5:0.4" -c:v libx264 -preset medium -crf 15 -pix_fmt yuv420p $O/i60_$k.tmp.mp4 && mv $O/i60_$k.tmp.mp4 $O/i60_$k.mp4
  echo "interp $k done $(date -u +%H:%M)"
done
