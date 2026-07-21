# ChronoMap

A full-screen, real-time day/night world map for a wall TV — inspired by the
Geochron clock and HamClock's gray-line view, without the ham-radio extras.
Static HTML/CSS/JS with zero runtime dependencies, built to run in Chromium
kiosk mode on a Raspberry Pi 3 at 1920×1080.

The map is centered on the meridian of Leeds, Alabama (86.55° W).

**Live site:** https://evanrkeller.github.io/chronomap/

## Imagery credits

Map imagery is public domain, courtesy of NASA:

- **Daytime**: [Blue Marble Next Generation](https://earthobservatory.nasa.gov/collection/1484/blue-marble)
  (July 2004, with topography and bathymetry), NASA Earth Observatory.
- **Nighttime**: [Earth at Night 2012](https://earthobservatory.nasa.gov/images/79803/night-lights-2012-the-black-marble)
  ("Black Marble"), NASA Earth Observatory / NOAA NGDC, Suomi NPP VIIRS.
- **Moon**: [Galileo full-disc color mosaic (PIA00405)](https://images.nasa.gov/details/PIA00405),
  NASA/JPL.

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

## Raspberry Pi kiosk setup

Tested target: Raspberry Pi 3 (1 GB RAM), Raspberry Pi OS with desktop,
Chromium, 1920×1080 TV. The page reloads itself daily at 3:00 AM local
time, so the kiosk picks up deployed changes without intervention.

1. Disable screen blanking: `sudo raspi-config` → Display Options →
   Screen Blanking → No. (On Wayland/labwc images this is the only step
   needed; on X11 it disables DPMS and the screensaver.)

2. Autostart Chromium in kiosk mode. Create
   `~/.config/autostart/chronomap.desktop`:

   ```ini
   [Desktop Entry]
   Type=Application
   Name=ChronoMap
   Exec=chromium-browser --kiosk --noerrdialogs --disable-session-crashed-bubble --disable-infobars https://evanrkeller.github.io/chronomap/
   ```

   (On older Raspberry Pi OS the binary may be `chromium` instead of
   `chromium-browser`.)

   Don't add `--incognito`: settings made through the gear menu live in
   localStorage, and incognito storage evaporates on every browser
   restart — a reboot or crash would silently reset the display to the
   built-in defaults. `--disable-session-crashed-bubble` already keeps
   crash-restore prompts off the screen.

3. Reboot. The map should fill the screen with no cursor, scrollbars,
   or browser chrome. The page itself hides the mouse pointer; if a
   cursor still shows on X11 setups, `sudo apt install unclutter` and
   add `unclutter -idle 1` as a second autostart entry.

Debugging a live kiosk: each terminator redraw logs
`chronomap redraw <timestamp>` to the console, visible via remote
DevTools if you start Chromium with `--remote-debugging-port=9222`.

## Development

No build step. Serve the repo root with any static server and open it:

```sh
python3 -m http.server 8000
```

Run the tests (Node 20+):

```sh
npm test
```
