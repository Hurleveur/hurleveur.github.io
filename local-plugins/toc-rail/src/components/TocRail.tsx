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

  return (
    <nav class={classNames(displayClass, "toc-rail")} aria-label="Table of contents">
      <ul class="toc-rail-list">
        {toc.map((entry) => (
          <li key={entry.slug} class={`toc-rail-item depth-${entry.depth}`}>
            <a href={`#${entry.slug}`} data-for={entry.slug}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

TocRail.afterDOMLoaded = script;
TocRail.css = styles;

export default (() => TocRail) satisfies QuartzComponentConstructor;
