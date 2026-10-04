# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rebuilt as a margin hairline with one tick per heading, spaced by section length, and a progress segment; titles fade in while the pointer is in the margin, the current section drawn darker. A narrow margin (explorer open, phone gutter) opens the titles over the text on hover or tap. The rail is moved to `body` so the phone's hiding top bar cannot carry it away.

### Added

- Left-edge table-of-contents rail: fixed strip, expands on hover/tap, renders the current page's `file.data.toc`.
