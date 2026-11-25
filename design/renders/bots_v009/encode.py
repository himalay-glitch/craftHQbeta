# Composite rendered RGBA frames onto white (what the login page shows), grade the blues, and encode them like
# the originals: VP9 WebM + H.264 MP4, 24 fps, through Blender's own sequencer (no ffmpeg on this machine).
#   Blender -b --factory-startup --python encode.py -- <frames_dir> <out_basename_without_ext> [poster.webp]
import bpy, sys, os, glob, shutil
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from huefix import grade   # hue-vs-hue on the blues: removes the lavender face highlight
HUEFIX = os.environ.get("HUEFIX", "1") == "1"

args = sys.argv[sys.argv.index("--") + 1:]
frames_dir, out_base = args[0], args[1]
poster = args[2] if len(args) > 2 else None

# 1. Straight-alpha PNGs over white, in sRGB, the way a browser composites.
white_dir = frames_dir.rstrip("/") + "_white"
os.makedirs(white_dir, exist_ok=True)
files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
assert files, f"no frames in {frames_dir}"
for i, f in enumerate(files):
    img = bpy.data.images.load(f)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    if img.is_float:   # 16-bit renders load as linear floats: encode to sRGB first
        c = np.clip(px[:, :3], 0, 1)
        px[:, :3] = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    a = px[:, 3:4]
    px[:, :3] = px[:, :3] * a + (1.0 - a)      # over white, in sRGB, like the browser
    if HUEFIX:
        px[:, :3] = grade(px[:, :3])
    px[:, 3] = 1.0
    out = bpy.data.images.new(f"w{i}", w, h, alpha=False, float_buffer=False)   # byte image: values stored as-is
    out.pixels[:] = px.ravel()
    out.filepath_raw = os.path.join(white_dir, f"frame_{i + 1:04d}.png")
    out.file_format = "PNG"
    out.save()
    if i == 0 and poster:
        out.filepath_raw = poster
        out.file_format = "WEBP"
        out.save(quality=90)
    bpy.data.images.remove(img)
    bpy.data.images.remove(out)
print("COMPOSITED", len(files), "frames ->", white_dir)

# 2. One image strip in the sequencer, rendered straight through (no AgX/Filmic on the PNGs).
sc = bpy.context.scene
sc.sequence_editor_create()
white = sorted(glob.glob(os.path.join(white_dir, "frame_*.png")))
strip = sc.sequence_editor.strips.new_image("frames", white[0], channel=1, frame_start=1)
for f in white[1:]:
    strip.elements.append(os.path.basename(f))
sc.frame_start, sc.frame_end = 1, len(white)
r = sc.render
r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
r.fps, r.fps_base = 24, 1.0
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.sequencer_colorspace_settings.name = "sRGB"
r.use_sequencer = True
r.use_compositing = False

tmp = os.path.join(os.path.dirname(out_base), "_enc")
for fmt, codec, ext in (("WEBM", "WEBM", ".webm"), ("MPEG4", "H264", ".mp4")):
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    r.image_settings.file_format = "FFMPEG"
    r.image_settings.color_mode = "RGB"
    r.ffmpeg.format = fmt
    r.ffmpeg.codec = codec
    r.ffmpeg.constant_rate_factor = "HIGH"
    r.ffmpeg.ffmpeg_preset = "BEST"
    r.ffmpeg.gopsize = 24
    r.ffmpeg.audio_codec = "NONE"
    r.filepath = os.path.join(tmp, "clip")
    bpy.ops.render.render(animation=True)
    made = glob.glob(os.path.join(tmp, "clip*"))
    assert made, f"no {ext} written"
    shutil.move(made[0], out_base + ext)
    print("ENCODED", out_base + ext, os.path.getsize(out_base + ext), "bytes")
shutil.rmtree(tmp, ignore_errors=True)
