#!/bin/zsh
# Final stills for approval: 512 px, 256 samples; then transparent PNG + WebP on white, both team sheets, the scene.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
for bot in pm builder designer checker fixer; do
  t0=$(date +%s)
  caffeinate -ims $B -b --factory-startup --python team2.py -- still $bot "$PWD/final" 512 256 2>&1 | grep -E "MEASURED|Error|Traceback"
  echo "still $bot $(( $(date +%s) - t0 ))s" | tee -a render_log.txt
  $B -b --factory-startup --python finish2.py -- $bot "$PWD/final/$bot.png" 2>&1 | grep -E "FINISHED|Error"
done
node sheet2.mjs
$B -b --factory-startup --python team2.py -- save "$PWD/../../blender/crafthq_team_v002.blend" 2>&1 | grep -E "SAVED|Error|Traceback"
echo "FINAL_DONE $(date +%H:%M)" | tee -a render_log.txt
