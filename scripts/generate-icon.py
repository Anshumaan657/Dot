from pathlib import Path
from PIL import Image, ImageDraw
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
ICONSET = BUILD / "icon.iconset"
BUILD.mkdir(parents=True, exist_ok=True)
OLD_MASTER = BUILD / "icon-master.png"
if OLD_MASTER.exists():
    OLD_MASTER.unlink()
if ICONSET.exists():
    shutil.rmtree(ICONSET)
ICONSET.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    scale = size / 128
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def rect(box, fill, outline=None, width=1):
        scaled = tuple(round(v * scale) for v in box)
        draw.rectangle(scaled, fill=fill, outline=outline, width=max(1, round(width * scale)))

    ink = (36, 38, 43, 255)
    fur = (247, 239, 225, 255)
    patch = (38, 42, 49, 255)
    accent = (255, 122, 89, 255)
    blush = (242, 163, 160, 255)

    draw.rounded_rectangle((8 * scale, 8 * scale, 120 * scale, 120 * scale), radius=24 * scale, fill=(255, 253, 247, 255))
    draw.rounded_rectangle((8 * scale, 8 * scale, 120 * scale, 120 * scale), radius=24 * scale, outline=ink, width=max(2, round(4 * scale)))

    draw.polygon([(35 * scale, 44 * scale), (43 * scale, 20 * scale), (59 * scale, 42 * scale)], fill=patch, outline=ink)
    draw.polygon([(72 * scale, 42 * scale), (88 * scale, 20 * scale), (96 * scale, 44 * scale)], fill=fur, outline=ink)
    rect((31, 43, 98, 90), fur, ink, 3)
    rect((31, 43, 53, 70), patch)
    rect((47, 56, 58, 66), ink)
    rect((72, 56, 83, 66), ink)
    rect((50, 58, 54, 62), (255, 253, 247, 255))
    rect((75, 58, 79, 62), (255, 253, 247, 255))
    rect((63, 72, 69, 76), accent)
    rect((45, 73, 51, 77), blush)
    rect((81, 73, 87, 77), blush)
    rect((29, 72, 49, 74), ink)
    rect((79, 72, 99, 74), ink)
    rect((39, 90, 90, 104), fur, ink, 3)
    rect((31, 102, 50, 108), ink)
    rect((78, 102, 97, 108), ink)

    return image


MASTER = BUILD / "icon.png"
draw_icon(1024).save(MASTER)

SIZES = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]

for size, name in SIZES:
    subprocess.run(
        ["sips", "-z", str(size), str(size), str(MASTER), "--out", str(ICONSET / name)],
        check=True,
        stdout=subprocess.DEVNULL,
    )

subprocess.run(["xattr", "-cr", str(ICONSET)], check=False)
try:
    subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET), "-o", str(BUILD / "icon.icns")],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(BUILD / "icon.icns")
except subprocess.CalledProcessError:
    print("iconutil could not create build/icon.icns on this machine.")
    print(f"Generated fallback icon PNG: {MASTER}")
