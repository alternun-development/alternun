"""Export supplied AIRS artwork. Requires pymupdf==1.28.2, pillow==12.3.0, psd-tools==1.19.0."""
from pathlib import Path
import pymupdf
from PIL import Image
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'assets/Badges AIRS V-1 Assets'
DEST = ROOT / 'apps/mobile/assets/badges'


def save(image, target, size):
    image = image.convert('RGBA')
    image = image.crop(image.getbbox())
    image.thumbnail((size - 8, size - 8), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, 'WEBP', lossless=True, method=6)


with pymupdf.open(SOURCE / 'Badges AIRS V-1 copy.pdf') as document:
    # Bounds in the reference previews (1500px wide); exclude labels and adjacent artwork.
    regions = {
        'status/gold': (2, (145, 198, 328, 380)),
        'status/silver': (2, (365, 198, 548, 380)),
        'status/bronze': (2, (586, 198, 769, 380)),
    }
    for name, x in zip(('10', '50', '100', '500', '1000'), (153, 398, 643, 886, 1131)):
        regions[f'milestones/{name}'] = (3, (x, 228, x + 216, 444))
    for name, x in zip(('5000', '10000', '50000', 'locked'), (153, 398, 643, 880)):
        regions[f'milestones/{name}'] = (3, (x, 506, x + 216, 722))
    for name, (page_index, bounds) in regions.items():
        page = document[page_index]
        clip = pymupdf.Rect(*(v * page.rect.width / 1500 for v in bounds))
        pixels = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=clip, alpha=True)
        save(Image.frombytes('RGBA', (pixels.width, pixels.height), pixels.samples), DEST / f'{name}.webp', 256)

psd = PSDImage.open(SOURCE / 'Links/PSDs/Status Alternun 3D.psd')
for layer in psd:
    if layer.name in ('GOLD 3D', 'SILVER 3D', 'BRONZE 3D'):
        save(layer.composite(), DEST / 'status-3d' / f'{layer.name.split()[0].lower()}.webp', 512)
