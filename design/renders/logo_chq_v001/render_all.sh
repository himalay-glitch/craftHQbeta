#!/bin/sh
# Rebuild and re-render the CHQ mark end to end.
#   sh design/renders/logo_chq_v001/render_all.sh [samples]
# Needs Blender 4.4 at /Applications/Blender.app and python3 with fontTools, numpy, OpenCV.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
B=/Applications/Blender.app/Contents/MacOS/Blender
BLEND="$REPO/design/blender/crafthq_logo_chq_v001.blend"
RAW="$HERE/work/raw"
S="${1:-512}"
mkdir -p "$RAW" "$HERE/out"

python3 -I "$HERE/extract_chq.py"                                   # font -> CHQ + slash outlines
"$B" -b --factory-startup --python "$HERE/build_chq.py"            # outlines -> .blend
for shot in front hero; do
  "$B" -b --factory-startup "$BLEND" --python "$HERE/render_chq.py" -- "$shot" "$RAW/$shot.png" 100 "$S"
done
python3 "$HERE/finish_chq.py" "$RAW" "$HERE/out"                   # crop, white, level paper
