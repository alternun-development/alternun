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

# The milestone PSD stores a transparent contact sheet in one artwork layer.
# Crop each isolated badge in layer-local coordinates (not document coordinates).
from PIL import ImageOps
milestone_sheet = PSDImage.open(SOURCE / 'Links/PSDs/Milestones Alternun 3D.psd')[1].composite()
names = ('10', '50', '100', '500', '1000', '5000', '10000', '50000')
columns = ((0, 470), (538, 1008), (1075, 1546), (1614, 2084), (2151, 2621))
for name in names:
    vector = Image.open(DEST / 'milestones' / f'{name}.webp').convert('RGBA')
    grey = ImageOps.grayscale(vector).convert('RGBA')
    grey.putalpha(vector.getchannel('A'))
    # Already normalized: preserve the exact vector canvas and silhouette.
    target = DEST / 'milestones-locked' / f'{name}.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    grey.save(target, 'WEBP', lossless=True, method=6)

# Square PNGs attach reliably in social apps and include the original metallic art.
from PIL import ImageDraw, ImageFont
font_path = ROOT / 'apps/mobile/assets/fonts/Sculpin-Bold.ttf'
share_font = ImageFont.truetype(str(font_path), 72)
brand_font = ImageFont.truetype(str(font_path), 34)
small_font = ImageFont.truetype(str(font_path), 26)
for index, name in enumerate(names):
    left, right = columns[index % 5]
    top, bottom = (0, 470) if index < 5 else (611, 1082)
    artwork = milestone_sheet.crop((left, top, right, bottom))
    save(artwork, DEST / 'milestones-3d' / f'{name}.webp', 512)
    card = Image.new('RGB', (1080, 1080), '#071d19')
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((24, 24, 1056, 1056), radius=60, outline='#b5985e', width=2)
    draw.text((540, 105), 'AIRS BY ALTERNUN', font=brand_font, fill='#18d9ac', anchor='mt')
    artwork.thumbnail((470, 470), Image.Resampling.LANCZOS)
    card.paste(artwork, ((1080-artwork.width)//2, 230), artwork)
    draw.text((540, 760), f'{int(name):,} AIRS', font=share_font, fill='#f3e8cf', anchor='mt')
    draw.text((540, 955), 'airs.alternun.co', font=small_font, fill='#a9c7bd', anchor='mt')
    target = DEST / 'milestones-share' / f'{name}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    card.save(target, optimize=True)
