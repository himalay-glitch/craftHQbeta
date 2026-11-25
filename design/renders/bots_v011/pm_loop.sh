#!/bin/zsh
# The PM's 48-frame blink loop (transparent, 384 px, 192 samples, fixed seed). Starts clean.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
rm -f loops/pm_idle/frame_*.png
t0=$(date +%s)
caffeinate -ims $B -b --factory-startup --python team2.py -- loop pm "$PWD/loops/pm_idle" 384 192 blink 2>&1 | grep -E "DONE|Error|Traceback"
find loops/pm_idle -name 'frame_*.png' -size 0 -delete
echo "new-eyes loop pm_idle $(( $(date +%s) - t0 ))s ($(ls loops/pm_idle | wc -l | tr -d ' ') frames)" | tee -a render_log.txt
echo "PM_LOOP_DONE $(date +%H:%M)" | tee -a render_log.txt
