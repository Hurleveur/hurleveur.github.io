# @quartz-community/toc-rail

A table of contents that stays out of the way while you read. A hairline runs
down the free margin left of the text, with one tick per heading placed where
that heading falls in the article and a darker segment for the part on screen.
Moving the pointer into the margin fades the heading titles in beside their
ticks; the section being read is drawn darker. Where the margin is narrow (the
explorer open beside the text, or a phone's gutter) the titles open over the
text instead, on hover or, on a phone, on a tap of the gutter; picking a heading
there closes the list. Pages with fewer than three headings get no rail.

## Installation

```bash
npx quartz plugin add github:quartz-community/toc-rail
```

## Usage

Requires a heading-extraction transformer that sets `file.data.toc` (e.g.
`@quartz-community/table-of-contents`) to already be enabled — this plugin
only renders that data, it does not extract headings itself.

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/toc-rail
    enabled: true
    layout:
      position: left
      priority: 60
```

## Configuration

This plugin has no configuration options.

## License

MIT
