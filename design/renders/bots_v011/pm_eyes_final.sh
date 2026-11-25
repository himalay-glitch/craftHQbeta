#!/bin/zsh
# The PM with the big set-in eyes and plush lids: the still (matching loop frame 1), sheets, scene; then the loop.
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
: ${PLAYWRIGHT_CORE:?set PLAYWRIGHT_CORE to a playwright-core folder (see README.txt, sheet2.mjs)}
t0=$(date +%s)
caffeinate -ims $B -b --factory-startup --python team2.py -- still pm "$PWD/final" 512 256 2>&1 | grep -E "MEASURED|Error|Traceback"
echo "lids still pm $(( $(date +%s) - t0 ))s" | tee -a render_log.txt
$B -b --factory-startup --python finish2.py -- pm "$PWD/final/pm.png" 2>&1 | grep -E "FINISHED|Error"
node sheet2.mjs
$B -b --factory-startup --python team2.py -- save "$PWD/../../blender/crafthq_team_v002.blend" 2>&1 | grep -E "SAVED|Error|Traceback"
$B -b --factory-startup --python eyecheck.py -- "$PWD/final/pm.png" "$PWD/tests/pm_face_check.png" 2>&1 | grep -E "EYECHECK|Error"
echo "PM_STILL_DONE $(date +%H:%M)" | tee -a render_log.txt
./pm_loop.sh
