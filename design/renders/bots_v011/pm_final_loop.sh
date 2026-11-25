#!/bin/zsh
# The PM (rounded rectangle, open eyes): matching still, sheets, scene; then its 48-frame blink loop.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
t0=$(date +%s)
caffeinate -ims $B -b --factory-startup --python team2.py -- still pm "$PWD/final" 512 256 2>&1 | grep -E "MEASURED|Error|Traceback"
echo "eyes-snug still pm $(( $(date +%s) - t0 ))s" | tee -a render_log.txt
$B -b --factory-startup --python finish2.py -- pm "$PWD/final/pm.png" 2>&1 | grep -E "FINISHED|Error"
node sheet2.mjs
$B -b --factory-startup --python team2.py -- save "$PWD/../../blender/crafthq_team_v002.blend" 2>&1 | grep -E "SAVED|Error|Traceback"
echo "PM_STILL_DONE $(date +%H:%M)" | tee -a render_log.txt
t0=$(date +%s)
caffeinate -ims $B -b --factory-startup --python team2.py -- loop pm "$PWD/loops/pm_idle" 384 192 blink 2>&1 | grep -E "DONE|Error|Traceback"
find loops/pm_idle -name 'frame_*.png' -size 0 -delete
echo "loop pm_idle $(( $(date +%s) - t0 ))s ($(ls loops/pm_idle | wc -l | tr -d ' ') frames)" | tee -a render_log.txt
echo "PM_LOOP_DONE $(date +%H:%M)" | tee -a render_log.txt
