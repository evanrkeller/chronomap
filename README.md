# ChronoMap

A full-screen, real-time day/night world map for a wall TV — inspired by the
Geochron clock and HamClock's gray-line view, without the ham-radio extras.
Static HTML/CSS/JS with zero runtime dependencies, built to run in Chromium
kiosk mode on a Raspberry Pi 3 at 1920×1080.

**Live site:** https://keller-solutions.github.io/chronomap/

## Features

- Real-time day/night terminator with a twilight band, civil-twilight
  contour, sun and moon icons at their overhead points (the moon drawn
  with its current phase), refreshed every minute.
- A scoreboard of live local clocks. A fresh visitor sees just two
  tiles — **home and UTC**. Home is the visitor's detected location
  (browser geolocation, used in memory only and never stored or sent
  anywhere); if the location prompt is declined, home falls back to
  Birmingham, AL.
- A gear menu (bottom-right) for settings, persisted in localStorage
  with no server side:
  - **Home location** — label, latitude, longitude, IANA timezone. A
    saved home overrides detection and gets the yellow scoreboard label.
  - **Up to 4 additional locations**, for at most six tiles (home, UTC,
    and the additions), each with a matching map marker.
  - **Find buttons** that look up a place name via the free, keyless
    Open-Meteo geocoder and fill in coordinates and timezone — the only
    network call the app ever makes, and only when you click Find.
  - **Map centering** — home-centered (default) keeps home mid-screen;
    sun-centered keeps the subsolar point mid-screen so the map rolls
    beneath a fixed day-night outline through the day.
- Keller Solutions attribution badge, bottom-left, with a
  self-updating copyright year.

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
recenters them on the meridian of Leeds, Alabama (86.55° W), and rewrites
`assets/earth-day.jpg` and `assets/earth-night.jpg`. The pre-roll is only a
storage detail: at render time the display rolls the imagery to whatever
center the active mode calls for (the home longitude, or the subsolar
longitude in sun-centered mode).

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
   Exec=chromium-browser --kiosk --noerrdialogs --disable-session-crashed-bubble --disable-infobars https://keller-solutions.github.io/chronomap/
   ```

   (On older Raspberry Pi OS the binary may be `chromium` instead of
   `chromium-browser`.)

   Don't add `--incognito`: settings made through the gear menu live in
   localStorage, and incognito storage evaporates on every browser
   restart — a reboot or crash would silently reset the display to the
   built-in defaults. `--disable-session-crashed-bubble` already keeps
   crash-restore prompts off the screen.

   With no home configured, ChronoMap asks the browser for the
   visitor's location on load. On an unattended kiosk that prompt has
   no one to answer it and reappears after the daily reload — so during
   setup either configure a home in the gear menu (no prompt is made
   once a home is saved) or answer the location prompt once; Chromium
   remembers the decision for the origin.

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
