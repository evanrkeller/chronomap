# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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
