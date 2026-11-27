#!/bin/zsh
cd "${0:A:h}"
B=/Applications/Blender.app/Contents/MacOS/Blender
for bot in ${=BOTS:-pm builder designer checker fixer}; do
  $B -b --factory-startup --python team2.py -- calibrate $bot "$PWD/cal" 2>&1 | grep -E "^(CAL|FINAL)|Error|Traceback"
done
echo CAL_DONE
