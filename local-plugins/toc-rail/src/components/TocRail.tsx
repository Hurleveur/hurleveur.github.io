import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";
// @ts-expect-error - inline script import handled by Quartz bundler
import script from "./scripts/tocRail.inline.ts";
import styles from "./styles/tocRail.scss";

interface TocRailEntry {
  depth: number;
  text: string;
  slug: string;
}

const TocRail: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toc = (fileData as any)?.toc as TocRailEntry[] | undefined;
  // LOCI PATCH: LessWrong only shows its margin ToC for posts with 3+
  // headings — below that a heading list reads as clutter, not navigation.
  if (!toc || toc.length < 3) {
    return null;
  }

  // LOCI PATCH: LessWrong's fixed ToC — a hairline with one tick per heading,
  // the titles faded in only while the pointer is in the left margin. Rows are
  // spaced by their section's length (tocRail.inline.ts sets each flex-grow),
  // so the ticks map the article; the title row heads the list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title = ((fileData as any)?.frontmatter?.title as string | undefined) ?? "";
  return (
    <nav class={classNames(displayClass, "toc-rail")} aria-label="Table of contents" tabindex={-1}>
      <div class="toc-rail-line">
        <div class="toc-rail-progress" />
      </div>
      <ol class="toc-rail-list">
        <li class="toc-rail-item toc-rail-title" data-for="">
          <a href="#">{title}</a>
        </li>
        {toc.map((entry) => (
          <li key={entry.slug} class={`toc-rail-item depth-${entry.depth}`} data-for={entry.slug}>
            <a href={`#${entry.slug}`} data-for={entry.slug}>
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

TocRail.afterDOMLoaded = script;
TocRail.css = styles;

export default (() => TocRail) satisfies QuartzComponentConstructor;
