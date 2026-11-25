#!/bin/sh
# Rebuild and re-render the v002 logo end to end.
#   sh design/renders/logo_glass_v002/render_all.sh [samples]
# Needs Blender 4.4 at /Applications/Blender.app and python3 with numpy + OpenCV.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
B=/Applications/Blender.app/Contents/MacOS/Blender
BLEND="$REPO/design/blender/crafthq_logo_glass_v002.blend"
RAW="$HERE/work/raw"
S="${1:-512}"
mkdir -p "$RAW" "$HERE/out"

python3 "$HERE/trace_wordmark.py"                                   # artwork -> Bezier outlines
"$B" -b --factory-startup --python "$HERE/build_logo.py"           # outlines -> .blend
for shot in front mark mark_boldC hero; do
  "$B" -b --factory-startup "$BLEND" --python "$HERE/render_logo.py" -- "$shot" "$RAW/$shot.png" 100 "$S"
done
python3 "$HERE/finish_logo.py" "$RAW" "$HERE/out"                  # crop, white, level paper
