#!/usr/bin/env bash
#
# One-time asset pipeline for ChronoMap.
#
# Downloads NASA's public-domain global mosaics — Blue Marble Next
# Generation (July 2004, with topography and bathymetry) for daytime and
# the Earth at Night 2012 VIIRS composite for nighttime — recenters them
# on the Leeds, AL meridian (86.5497 W), and writes Pi-friendly
# 2048x1024 JPEGs into assets/.
#
# These are the same NASA products the GMT earth_day/earth_night remote
# datasets are derived from:
# https://www.generic-mapping-tools.org/remote-datasets/earth-daynight.html
#
# Requires: curl, ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."

RAW_DIR="assets/raw"
OUT_DIR="assets"
mkdir -p "$RAW_DIR"

DAY_URL="https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg"
NIGHT_URL="https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.13500x6750.jpg"
# Galileo full-disc color mosaic of the nearside (NASA/JPL, PIA00405).
MOON_URL="https://images-assets.nasa.gov/image/PIA00405/PIA00405~orig.jpg"

# Recentering: the sources span longitude -180..180 with 0 in the middle.
# To put 86.5497 W in the middle, the new left edge is 93.4503 E, which
# sits (93.4503 + 180) / 360 = 75.958% of the way across the source.
ROLL_FRACTION="273.4503/360"

fetch() {
  local url="$1" raw="$2"
  if [ -s "$raw" ]; then
    echo "already downloaded: $raw"
    return
  fi
  echo "downloading $url"
  curl -fL --retry 3 -o "$raw" "$url"
}

process() {
  local raw="$1" out="$2"
  shift 2
  local width roll
  width=$(magick identify -format "%w" "$raw")
  roll=$(awk "BEGIN { printf \"%d\", $width * $ROLL_FRACTION + 0.5 }")
  echo "processing $raw (width $width, roll -$roll) -> $out"
  magick "$raw" -roll -"$roll"+0 -resize 4096x2048\! "$@" -strip -quality 84 "$out"
}

# The moon icon composites a full-moon photo over a darkened copy, the
# same way the earth blends day into night. 128px covers the on-screen
# icon at 2x.
process_moon() {
  local raw="$1"
  echo "processing $raw -> $OUT_DIR/moon-full.png + moon-new.png"
  magick "$raw" -resize 128x128 \
    \( -size 128x128 xc:none -fill white -draw "circle 64,64 64,3" \) \
    -compose CopyOpacity -composite "$OUT_DIR/moon-full.png"
  magick "$OUT_DIR/moon-full.png" -modulate 13,45 "$OUT_DIR/moon-new.png"
}

fetch "$DAY_URL" "$RAW_DIR/blue-marble-day.jpg"
fetch "$NIGHT_URL" "$RAW_DIR/earth-at-night.jpg"
fetch "$MOON_URL" "$RAW_DIR/moon-galileo.jpg"
process_moon "$RAW_DIR/moon-galileo.jpg"
# Day gets brighter, more saturated blues so daylit ocean reads clearly
# against the near-black night side from across a room.
process "$RAW_DIR/blue-marble-day.jpg" "$OUT_DIR/earth-day.jpg" -modulate 110,142,100
process "$RAW_DIR/earth-at-night.jpg" "$OUT_DIR/earth-night.jpg"

echo "done:"
ls -lh "$OUT_DIR"/earth-*.jpg
