#!/bin/zsh
# Blue Builder, final: 512 px, 384 samples, fur (0.00326, 0.21105, 0.74963) linear, fur-only fill 8, no cheeks.
# Resumable: rerun after an interruption and it skips finished frames. Keeps the Mac awake while it runs.
set -e
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
BLEND=../../blender/crafthq_bots_v001.blend   # opened read-only: the script never saves it
FUR=0.00326,0.21105,0.74963
find idle work -name 'frame_*.png' -size 0 -delete 2>/dev/null || true   # placeholders from an interrupted frame
for clip in "idle 1 60" "work 101 148"; do
  set -- ${=clip}
  t0=$(date +%s)
  FUR_FILL=8 caffeinate -ims $B -b $BLEND --python look_v2_final.py -- anim "$PWD/$1" $FUR 512 384 $2 $3 | grep -E "^Fra:.*Finished|DONE|Error|Traceback" || true
  echo "builder $1 $(( $(date +%s) - t0 ))s ($(ls $1/frame_*.png | wc -l | tr -d ' ') frames)" | tee -a render_log.txt
done
echo DONE | tee -a render_log.txt
