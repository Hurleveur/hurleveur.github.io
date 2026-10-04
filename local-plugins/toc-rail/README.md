# @quartz-community/toc-rail

A LessWrong-style table-of-contents rail: a plain heading list sitting in the
left margin beside the article on wide desktop screens (3+ headings, and only
while the explorer is closed), quiet until the section being read is
scrollspied into view. Hidden everywhere else — no rail ever overlaps the
text.

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
