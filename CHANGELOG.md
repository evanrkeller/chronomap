# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Settings panel behind a corner gear icon: set a home location (label,
  latitude, longitude, IANA timezone) that recenters the map, replaces
  the default home on the scoreboard with a yellow label, and persists
  in localStorage — corrupt or invalid stored settings fall back to the
  built-in defaults (#26)
- Map centering toggle in settings: home-centered (default) keeps home
  mid-screen; sun-centered keeps the subsolar longitude mid-screen so
  the imagery rolls beneath a fixed day-night outline (#27)
- Up to four additional locations in settings, each with label,
  coordinates, and timezone — home + UTC + the additions give at most
  six scoreboard tiles and map markers; a curated list replaces the
  default city set, and clearing it back to nothing restores the
  defaults (#28)
- Keller Solutions attribution badge in the bottom-left corner — the
  RampScope logo mark plus a copyright line whose year updates itself
  (#29)
- Find button on every location row: searches the label text against
  the free, keyless Open-Meteo geocoder and fills latitude, longitude,
  and timezone from the picked match — requests happen only when the
  user searches, so the display stays fully static (#33)
- First-visit auto-home: with no home configured, the browser asks for
  the visitor's location and the map recenters on it (browser timezone,
  in-memory only — never stored or sent anywhere); denial or failure
  keeps the defaults, and a configured home always wins without any
  prompt (#35)

### Changed

- ChronoMap moved to the keller-solutions GitHub org; the live site is
  now https://keller-solutions.github.io/chronomap/ (the old
  evanrkeller.github.io URL no longer serves — kiosks pointed at it
  need their autostart URL updated) (#40)
- A brand-new visitor now sees only two scoreboard tiles — home and
  UTC. Home is their detected location, or Birmingham, AL when
  detection is denied or unavailable; the old pre-populated city set
  (Brisbane, Leeds, Cincinnati, Istanbul, New Delhi) is gone, and
  extra cities appear only when added in settings (#37)
- Map centering moved from asset time to render time: the projection
  takes a center meridian and the pre-rolled imagery is drawn with a
  wrapped offset, so any longitude can sit mid-screen (#26)

- Display is resolution-aware: 4096×2048 assets, canvas sized to the
  screen's native pixels (retina/4K crisp, lighter than before on the
  Pi), sun and moon at 15 px, and a responsive layout that keeps the
  scoreboard visible at any window shape (#25)
- Fill-first layout: the map always spans the full width — 16:9 shows
  it uncropped, shorter windows crop up to 10% off the top and bottom,
  and beyond that the map stretches vertically to fit (#25)

- Scoreboard cards order themselves west→east to match marker
  positions on the map (#19; the curated initial city set that
  shipped with this change was later replaced by the home + UTC
  defaults, #37)

- City markers are now plain outlined dots — no text labels (#18)
- Day imagery gets brighter, more saturated blues so daylit ocean reads
  clearly against the night side from across a room (#17)

### Added

- Sun icon at the subsolar point and moon icon at the sublunar point,
  the moon drawn with its current phase (#22)
- Moon icon now composites NASA Galileo moon photography — full-moon
  photo revealed over a darkened copy by the phase mask — and is
  drawn smaller (#24)

- Subtle grey-blue contour on the night side marking the end of civil
  twilight (sun 6° below the horizon) (#21)

- Day-part indicator on each city card — sun, twilight half-disc, or
  moon, driven by the actual solar altitude at that city (#20)

- Kiosk hardening: daily self-reload at 3:00 AM local, hidden cursor,
  redraw breadcrumbs in the console, and Raspberry Pi 3 kiosk setup
  documentation (#11)
- Zero-cost hosting on GitHub Pages, serving the repo root from `main`
  with no build step; total page weight ~650 KB (#10)
- Scoreboard bar across the top showing live local time and weekday for
  each configured city, with cities on a different calendar day than
  Leeds highlighted (#9)
- Configurable city markers from `config/cities.json`, drawn on an
  overlay with labels readable over day and night (#8)
- Real-time day/night terminator: night-lights imagery blended over the
  day map along the computed solar terminator with a smooth twilight
  band, refreshed every minute (#7)
- Full-screen page shell rendering the daytime world map on a canvas,
  centered on the Leeds, AL meridian, with a reserved top bar (#6)
- Asset pipeline: `scripts/fetch-assets.sh` downloads NASA Blue Marble (day)
  and Earth at Night (night) mosaics, recenters them on the Leeds, AL
  meridian, and produces the committed 2048×1024 map images (#5)
