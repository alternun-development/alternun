#!/usr/bin/env python3
"""
Generate branded PWA icon assets from the Alternun logo.
Creates the Expo app icon files, web manifest icons, favicon assets,
and the social preview image.
"""

import sys
from pathlib import Path

from PIL import Image

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_ROOT / "public"

# Source icon
SOURCE_ICON = PROJECT_ROOT / "assets" / "images" / "alternun-logo.png"

# Output icons
OUTPUT_APP_ICON = PROJECT_ROOT / "assets" / "images" / "icon.png"
OUTPUT_ADAPTIVE_ICON = PROJECT_ROOT / "assets" / "images" / "adaptive-icon.png"
OUTPUT_FAVICON = PROJECT_ROOT / "assets" / "images" / "favicon.png"
OUTPUT_SPLASH_ICON = PROJECT_ROOT / "assets" / "images" / "splash-icon.png"
OUTPUT_ICON_1024 = PUBLIC_DIR / "icon-1024.png"
OUTPUT_ICON_512 = PUBLIC_DIR / "icon-512.png"
OUTPUT_ICON_192 = PUBLIC_DIR / "icon-192.png"
OUTPUT_ICON_MASKABLE_1024 = PUBLIC_DIR / "icon-maskable-1024.png"
OUTPUT_APPLE_TOUCH = PUBLIC_DIR / "apple-touch-icon.png"
OUTPUT_FAVICON_48 = PUBLIC_DIR / "favicon-48x48.png"
OUTPUT_FAVICON_ICO = PUBLIC_DIR / "favicon.ico"
OUTPUT_OG_IMAGE = PUBLIC_DIR / "og-image.png"

# Brand colors
BRAND_BG_COLOR = "#050510"


def render_square_icon(source: Image.Image, size: int, background: str = BRAND_BG_COLOR) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    fitted = source.copy()
    fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def render_transparent_icon(source: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fitted = source.copy()
    fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def generate_icons() -> int:
    """Generate all icon variants from the branded source image."""

    if not SOURCE_ICON.exists():
        print(f"❌ Source icon not found: {SOURCE_ICON}", file=sys.stderr)
        return 1

    try:
        source = Image.open(SOURCE_ICON).convert("RGBA")
        print(f"✓ Loaded source icon: {SOURCE_ICON.name} ({source.size[0]}x{source.size[1]})")

        render_square_icon(source, 1024).save(OUTPUT_APP_ICON, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_APP_ICON.name}")

        render_transparent_icon(source, 1024).save(OUTPUT_ADAPTIVE_ICON, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ADAPTIVE_ICON.name}")

        render_square_icon(source, 48).save(OUTPUT_FAVICON, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_FAVICON.name} (48x48)")

        render_transparent_icon(source, 1024).save(OUTPUT_SPLASH_ICON, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_SPLASH_ICON.name}")

        render_square_icon(source, 1024).save(OUTPUT_ICON_1024, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_1024.name}")

        render_square_icon(source, 512).save(OUTPUT_ICON_512, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_512.name}")

        render_square_icon(source, 192).save(OUTPUT_ICON_192, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_192.name}")

        render_square_icon(source, 1024).save(OUTPUT_ICON_MASKABLE_1024, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_MASKABLE_1024.name}")

        render_square_icon(source, 180).save(OUTPUT_APPLE_TOUCH, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_APPLE_TOUCH.name} (180×180)")

        render_square_icon(source, 48).save(OUTPUT_FAVICON_48, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_FAVICON_48.name} (48x48)")

        icon = render_square_icon(source, 256)
        icon.save(
            OUTPUT_FAVICON_ICO,
            format="ICO",
            sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
        )
        print(f"✓ Created {OUTPUT_FAVICON_ICO.name}")

        og_image = Image.new("RGBA", (1200, 630), BRAND_BG_COLOR)
        og_icon = render_square_icon(source, 400)
        x = (1200 - og_icon.size[0]) // 2
        y = (630 - og_icon.size[1]) // 2
        og_image.paste(og_icon, (x, y), og_icon)
        og_image.convert("RGB").save(OUTPUT_OG_IMAGE, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_OG_IMAGE.name} (1200x630)")

        print("\n✅ All PWA icons generated successfully!")
        return 0

    except Exception as exc:
        print(f"❌ Error generating icons: {exc}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(generate_icons())
