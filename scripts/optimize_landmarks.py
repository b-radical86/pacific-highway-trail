"""Landmark Postcard Optimizer & Base64 Registry Generator.

Processes raw landmark PNG/JPG illustrations from an input directory,
resizes them to crisp retro dimensions (default 320x200), quantizes to an
8-bit indexed color palette (default 256 colors), and exports a zero-dependency
ES module (`landmark_cards.js`) containing Base64 Data URIs keyed by both
landmark slug and canonical waypoint ID.
"""

from __future__ import annotations

import argparse
import base64
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

# Canonical mapping from file stem -> cartridge waypoint IDs
SLUG_TO_WAYPOINT_IDS: dict[str, list[str]] = {
    "coffs_harbour": ["wp_coffs", "coffs_harbour"],
    "chimney_rock": ["wp_chimney", "chimney_rock"],
    "ballina": ["wp_ballina", "ballina"],
}


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    """Packs a standard PNG chunk with length, type, payload, and CRC32."""
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def _paeth_predictor(a: int, b: int, c: int) -> int:
    """Standard PNG Paeth filter predictor."""
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def _decode_rgb_png(png_bytes: bytes) -> tuple[int, int, list[tuple[int, int, int]]]:
    """Decodes an 8-bit RGB or RGBA PNG into a flat list of (R, G, B) tuples."""
    if png_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid PNG signature")

    pos = 8
    width = 0
    height = 0
    bit_depth = 8
    color_type = 2
    idat_chunks: list[bytes] = []

    while pos < len(png_bytes):
        length = struct.unpack(">I", png_bytes[pos : pos + 4])[0]
        chunk_type = png_bytes[pos + 4 : pos + 8]
        chunk_data = png_bytes[pos + 8 : pos + 8 + length]
        pos += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if bit_depth != 8 or color_type not in (2, 6):
        raise ValueError(f"Unsupported PNG format: bit_depth={bit_depth}, color_type={color_type}")

    bpp = 3 if color_type == 2 else 4
    stride = width * bpp
    raw = zlib.decompress(b"".join(idat_chunks))

    pixels: list[tuple[int, int, int]] = []
    prev_row = bytearray(stride)
    offset = 0

    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        cur_row = bytearray(raw[offset : offset + stride])
        offset += stride

        if filter_type == 1:  # Sub
            for i in range(bpp, stride):
                cur_row[i] = (cur_row[i] + cur_row[i - bpp]) & 0xFF
        elif filter_type == 2:  # Up
            for i in range(stride):
                cur_row[i] = (cur_row[i] + prev_row[i]) & 0xFF
        elif filter_type == 3:  # Average
            for i in range(stride):
                left = cur_row[i - bpp] if i >= bpp else 0
                up = prev_row[i]
                cur_row[i] = (cur_row[i] + ((left + up) >> 1)) & 0xFF
        elif filter_type == 4:  # Paeth
            for i in range(stride):
                left = cur_row[i - bpp] if i >= bpp else 0
                up = prev_row[i]
                up_left = prev_row[i - bpp] if i >= bpp else 0
                cur_row[i] = (cur_row[i] + _paeth_predictor(left, up, up_left)) & 0xFF

        for x in range(width):
            px_idx = x * bpp
            pixels.append((cur_row[px_idx], cur_row[px_idx + 1], cur_row[px_idx + 2]))

        prev_row = cur_row

    return width, height, pixels


def _encode_indexed_png(
    width: int,
    height: int,
    pixels: list[tuple[int, int, int]],
    max_colors: int = 256,
) -> bytes:
    """Quantizes RGB pixels to an 8-bit indexed palette (<= 256 colors) and encodes PNG."""
    max_colors = max(16, min(256, max_colors))

    # Build a 6x7x6 (252-color) uniform retro palette + 4 greyscale anchors = 256 colors
    palette: list[tuple[int, int, int]] = []
    r_levels = [0, 51, 102, 153, 204, 255]
    g_levels = [0, 42, 85, 128, 170, 213, 255]
    b_levels = [0, 51, 102, 153, 204, 255]

    for r in r_levels:
        for g in g_levels:
            for b in b_levels:
                if len(palette) < max_colors:
                    palette.append((r, g, b))

    while len(palette) < max_colors:
        palette.append((0, 0, 0))

    # Map each pixel to its nearest palette entry
    rows = bytearray()
    for y in range(height):
        rows.append(0)  # Filter type 0 (None) for crisp indexed compression
        row_start = y * width
        for x in range(width):
            r, g, b = pixels[row_start + x]
            ri = min(5, (r * 5 + 127) // 255)
            gi = min(6, (g * 6 + 127) // 255)
            bi = min(5, (b * 5 + 127) // 255)
            idx = min(max_colors - 1, ri * 42 + gi * 6 + bi)
            rows.append(idx)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 3, 0, 0, 0)  # color_type=3 (Indexed)
    plte = b"".join(struct.pack("BBB", r, g, b) for r, g, b in palette[:max_colors])
    idat = zlib.compress(bytes(rows), level=9)

    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"PLTE", plte)
        + _png_chunk(b"IDAT", idat)
        + _png_chunk(b"IEND", b"")
    )


def optimize_single_image(src_path: Path, width: int, height: int, colors: int) -> bytes:
    """Resizes and quantizes an image to an indexed PNG byte buffer."""
    # Prefer Pillow if available in the environment
    try:
        from PIL import Image  # type: ignore[import-not-found]

        with Image.open(src_path) as img:
            rgb_img = img.convert("RGB")
            resized = rgb_img.resize((width, height), Image.Resampling.NEAREST)
            quantized = resized.quantize(colors=colors)
            with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
                quantized.save(tmp.name, format="PNG", optimize=True)
                return Path(tmp.name).read_bytes()
    except ImportError:
        pass

    # Fallback: macOS `sips` resize + pure-Python 8-bit PLTE quantizer
    with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
        tmp_path = Path(tmp.name)
        subprocess.run(
            [
                "/usr/bin/sips",
                "-z",
                str(height),
                str(width),
                "-s",
                "format",
                "png",
                str(src_path),
                "--out",
                str(tmp_path),
            ],
            check=True,
            capture_output=True,
        )
        resized_bytes = tmp_path.read_bytes()

    try:
        w, h, pixels = _decode_rgb_png(resized_bytes)
        return _encode_indexed_png(w, h, pixels, max_colors=colors)
    except ValueError:
        return resized_bytes


def build_landmark_registry(
    input_dir: Path,
    output_js: Path,
    width: int,
    height: int,
    colors: int,
) -> dict[str, int]:
    """Processes all images in input_dir and writes the ES module output_js."""
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    image_files = sorted(
        p for p in input_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
    )
    if not image_files:
        raise ValueError(f"No landmark images found in {input_dir}")

    entries: dict[str, str] = {}
    stats: dict[str, int] = {}

    for img_path in image_files:
        slug = img_path.stem.lower()
        optimized_png = optimize_single_image(img_path, width=width, height=height, colors=colors)
        b64_str = base64.b64encode(optimized_png).decode("ascii")
        data_uri = f"data:image/png;base64,{b64_str}"

        stats[slug] = len(optimized_png)
        mapped_keys = SLUG_TO_WAYPOINT_IDS.get(slug, [slug])
        for key in mapped_keys:
            entries[key] = data_uri

    output_js.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "/**",
        " * Auto-generated Retro Landmark Postcard Registry (320x200 8-bit Indexed PNGs).",
        " * Generated by scripts/optimize_landmarks.py — DO NOT EDIT MANUALLY.",
        " */",
        "",
        "export const LANDMARK_CARDS = {",
    ]
    for key, uri in entries.items():
        lines.append(f"  {key}: '{uri}',")
    lines.extend(
        [
            "};",
            "",
            "/**",
            " * Returns the Base64 PNG Data URI for a waypoint ID or landmark slug, if available.",
            " * @param {string} idOrSlug Waypoint ID (e.g. 'wp_coffs') or slug ('coffs_harbour')",
            " * @returns {string|null}",
            " */",
            "export function getLandmarkCardDataUri(idOrSlug) {",
            "  if (!idOrSlug) return null;",
            "  return LANDMARK_CARDS[idOrSlug] || null;",
            "}",
            "",
        ]
    )

    output_js.write_text("\n".join(lines), encoding="utf-8")
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Optimize retro landmark postcards into JS.")
    parser.add_argument("--input", required=True, help="Input directory containing raw images")
    parser.add_argument("--output", required=True, help="Output ES module path (.js)")
    parser.add_argument("--width", type=int, default=320, help="Target width (default: 320)")
    parser.add_argument("--height", type=int, default=200, help="Target height (default: 200)")
    parser.add_argument("--colors", type=int, default=256, help="Palette colors (default: 256)")
    args = parser.parse_args()

    stats = build_landmark_registry(
        input_dir=Path(args.input),
        output_js=Path(args.output),
        width=args.width,
        height=args.height,
        colors=args.colors,
    )
    for slug, byte_len in stats.items():
        print(
            f"Optimized {slug}: {args.width}x{args.height} ({args.colors} colors) -> "
            f"{byte_len / 1024:.1f} KB"
        )
    print(f"Exported landmark registry to {args.output}")


if __name__ == "__main__":
    main()
