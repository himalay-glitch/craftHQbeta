#!/bin/zsh
# The new Builder's two login loops: 384 px, 192 adaptive samples, fixed seed, transparent PNGs. Resumable.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
for kind in idle work; do
  t0=$(date +%s)
  caffeinate -ims $B -b --factory-startup --python team2.py -- loop builder "$PWD/loops/builder_$kind" 384 192 $kind 2>&1 | grep -E "DONE|Error|Traceback"
  find "loops/builder_$kind" -name 'frame_*.png' -size 0 -delete
  echo "loop builder_$kind $(( $(date +%s) - t0 ))s ($(ls loops/builder_$kind | wc -l | tr -d ' ') frames)" | tee -a render_log.txt
done
echo "LOOPS_DONE $(date +%H:%M)" | tee -a render_log.txt
