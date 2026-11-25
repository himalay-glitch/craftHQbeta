#!/bin/zsh
# Touch-ups after approval: recalibrate + re-render only the PM and the Fixer; sheets and the scene again.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
BOTS="pm fixer" ./calibrate.sh 2>&1 | grep -E "FINAL|CAL_DONE|lost|Error"
for bot in pm fixer; do
  t0=$(date +%s)
  caffeinate -ims $B -b --factory-startup --python team2.py -- still $bot "$PWD/final" 512 256 2>&1 | grep -E "MEASURED|Error|Traceback"
  echo "touch-up still $bot $(( $(date +%s) - t0 ))s" | tee -a render_log.txt
  $B -b --factory-startup --python finish2.py -- $bot "$PWD/final/$bot.png" 2>&1 | grep -E "FINISHED|Error"
done
node sheet2.mjs
$B -b --factory-startup --python team2.py -- save "$PWD/../../blender/crafthq_team_v002.blend" 2>&1 | grep -E "SAVED|Error|Traceback"
echo "TOUCHUP_DONE $(date +%H:%M)" | tee -a render_log.txt
