# @quartz-community/toc-rail

A LessWrong-style table-of-contents rail: a narrow strip fixed to the left
edge of the viewport that expands into the current page's headings on hover
(tap on touch devices), rather than an always-open sidebar list.

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
