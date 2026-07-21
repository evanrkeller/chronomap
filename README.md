# ChronoMap

A full-screen, real-time day/night world map for a wall TV — inspired by the
Geochron clock and HamClock's gray-line view, without the ham-radio extras.
Static HTML/CSS/JS with zero runtime dependencies, built to run in Chromium
kiosk mode on a Raspberry Pi 3 at 1920×1080.

The map is centered on the meridian of Leeds, Alabama (86.55° W).

## Imagery credits

Map imagery is public domain, courtesy of NASA:

- **Daytime**: [Blue Marble Next Generation](https://earthobservatory.nasa.gov/collection/1484/blue-marble)
  (July 2004, with topography and bathymetry), NASA Earth Observatory.
- **Nighttime**: [Earth at Night 2012](https://earthobservatory.nasa.gov/images/79803/night-lights-2012-the-black-marble)
  ("Black Marble"), NASA Earth Observatory / NOAA NGDC, Suomi NPP VIIRS.

These are the same NASA products behind the
[GMT earth_day/earth_night remote datasets](https://www.generic-mapping-tools.org/remote-datasets/earth-daynight.html).

## Regenerating the map assets

The processed 2048×1024 images in `assets/` are committed, so the site is
fully static. To regenerate them (requires `curl` and ImageMagick):

```sh
scripts/fetch-assets.sh
```

The script downloads the NASA source mosaics into `assets/raw/` (gitignored),
recenters them on the Leeds meridian, and rewrites `assets/earth-day.jpg`
and `assets/earth-night.jpg`.

## Development

No build step. Serve the repo root with any static server and open it:

```sh
python3 -m http.server 8000
```

Run the tests (Node 20+):

```sh
npm test
```
