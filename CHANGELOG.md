# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Full-screen page shell rendering the daytime world map on a canvas,
  centered on the Leeds, AL meridian, with a reserved top bar (#6)
- Asset pipeline: `scripts/fetch-assets.sh` downloads NASA Blue Marble (day)
  and Earth at Night (night) mosaics, recenters them on the Leeds, AL
  meridian, and produces the committed 2048×1024 map images (#5)
