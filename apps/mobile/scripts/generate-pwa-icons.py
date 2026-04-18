#!/usr/bin/env python3
"""
Generate PWA icon assets from a source image using Python Pillow.
Generates icon sizes for web and creates a social media preview image.
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_ROOT / "public"

# Source icon
SOURCE_ICON = PUBLIC_DIR / "icon-maskable-1024.png"

# Output icons
OUTPUT_ICON_1024 = PUBLIC_DIR / "icon-1024.png"
OUTPUT_ICON_512 = PUBLIC_DIR / "icon-512.png"
OUTPUT_ICON_192 = PUBLIC_DIR / "icon-192.png"
OUTPUT_APPLE_TOUCH = PUBLIC_DIR / "apple-touch-icon.png"
OUTPUT_OG_IMAGE = PUBLIC_DIR / "og-image.png"

# Brand colors
BRAND_BG_COLOR = "#050510"  # Teal-dark background from theme
BRAND_ACCENT = "#004646"


def generate_icons():
    """Generate all icon variants from source image."""

    # Check source exists
    if not SOURCE_ICON.exists():
        print(f"❌ Source icon not found: {SOURCE_ICON}", file=sys.stderr)
        sys.exit(1)

    try:
        # Load source image
        source = Image.open(SOURCE_ICON)
        source = source.convert("RGBA")  # Ensure RGBA
        print(f"✓ Loaded source icon: {SOURCE_ICON.name} ({source.size})")

        # 1. Create icon-1024.png (copy of source, purpose: "any")
        output_1024 = source.copy()
        output_1024.save(OUTPUT_ICON_1024, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_1024.name}")

        # 2. Create icon-512.png
        icon_512 = source.resize((512, 512), Image.Resampling.LANCZOS)
        icon_512.save(OUTPUT_ICON_512, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_512.name}")

        # 3. Create icon-192.png
        icon_192 = source.resize((192, 192), Image.Resampling.LANCZOS)
        icon_192.save(OUTPUT_ICON_192, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_ICON_192.name}")

        # 4. Create apple-touch-icon.png (180x180, standard for iOS)
        apple_icon = source.resize((180, 180), Image.Resampling.LANCZOS)
        apple_icon.save(OUTPUT_APPLE_TOUCH, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_APPLE_TOUCH.name} (180×180)")

        # 5. Create og-image.png (1200x630 social preview)
        og_image = Image.new("RGB", (1200, 630), BRAND_BG_COLOR)

        # Resize icon to fit in OG image (aim for ~400px width, centered)
        og_icon_size = 400
        og_icon = source.resize((og_icon_size, og_icon_size), Image.Resampling.LANCZOS)

        # Center icon on canvas
        x = (1200 - og_icon_size) // 2  # ~400px from left
        y = (630 - og_icon_size) // 2  # ~115px from top

        # Convert og_icon to RGB to paste on RGB background
        og_icon_rgb = Image.new("RGB", og_icon.size, BRAND_BG_COLOR)
        og_icon_rgb.paste(og_icon, (0, 0), og_icon)  # Paste with transparency mask
        og_image.paste(og_icon_rgb, (x, y))

        og_image.save(OUTPUT_OG_IMAGE, "PNG", optimize=True)
        print(f"✓ Created {OUTPUT_OG_IMAGE.name} (1200×630)")

        print("\n✅ All PWA icons generated successfully!")
        return 0

    except Exception as e:
        print(f"❌ Error generating icons: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    sys.exit(generate_icons())
