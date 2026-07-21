# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Initial city set is now Brisbane, Leeds (home), Cincinnati, Istanbul,
  and New Delhi, plus a UTC card; scoreboard cards order themselves
  west→east to match marker positions on the map (#19)

- City markers are now plain outlined dots — no text labels (#18)
- Day imagery gets brighter, more saturated blues so daylit ocean reads
  clearly against the night side from across a room (#17)

### Added

- Sun icon at the subsolar point and moon icon at the sublunar point,
  the moon drawn with its current phase (#22)

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
