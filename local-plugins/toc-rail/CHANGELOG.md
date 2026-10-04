# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rebuilt as a LessWrong-style margin ToC: a plain heading list in the left margin (desktop only, 3+ headings, explorer closed), quiet until the section being read lights up (scrollspy), no dash ticks, no hover-expand box, no open animation. Click-to-scroll is a plain anchor link relying on `scroll-padding-top`.

### Added

- Left-edge table-of-contents rail: fixed strip, expands on hover/tap, renders the current page's `file.data.toc`.
