import type {
  QuartzComponentConstructor,
  QuartzComponentProps,
  QuartzPluginData,
  ValidDateType,
} from "@quartz-community/types";
import readingTime from "reading-time";
import { classNames } from "../util/lang";
import { i18n } from "../i18n";
import { DateComponent, getDate } from "../util/date";
import type { JSX } from "preact";
import style from "./styles/contentMeta.scss";

export interface ContentMetaOptions {
  /**
   * Whether to display reading time
   */
  showReadingTime: boolean;
  showComma: boolean;
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: true,
  showComma: true,
};

export default ((opts?: Partial<ContentMetaOptions>) => {
  // Merge options with defaults
  const options: ContentMetaOptions = { ...defaultOptions, ...opts };

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const text = fileData.text;

    if (text) {
      const segments: (string | JSX.Element)[] = [];

      if (fileData.dates) {
        const locale = cfg.locale || "en-US";
        const defaultDateType =
          (fileData.defaultDateType as ValidDateType | undefined) ??
          (cfg.defaultDateType as ValidDateType | undefined);
        if (defaultDateType) {
          const dataWithDefaultDateType: QuartzPluginData = {
            ...(fileData as QuartzPluginData),
            defaultDateType,
          };
          const date = getDate(dataWithDefaultDateType);
          if (date) {
            segments.push(<DateComponent date={date} locale={locale} />);
          }
        }
      }

      // Display reading time if enabled
      if (options.showReadingTime) {
        const { minutes, words: _words } = readingTime(text as string);
        const locale = cfg.locale || "en-US";
        const i18nData = i18n(locale);
        const displayedTime = i18nData.components.contentMeta.readingTime({
          minutes: Math.ceil(minutes),
        });
        segments.push(<span>{displayedTime}</span>);
      }

      // LOCI PATCH: a clipping's `url:` is its source — show it instead of hiding it with the
      // rest of the frontmatter. Empty strings are common in the vault and must render nothing.
      const sourceUrl = fileData.frontmatter?.url;
      if (typeof sourceUrl === "string" && sourceUrl.trim() !== "") {
        const href = sourceUrl.trim();
        let label = href;
        try {
          label = new URL(href).hostname.replace(/^www\./, "") || href;
        } catch {
          // not a parseable URL — show it verbatim rather than breaking the build
        }
        segments.push(
          <span>
            source:{" "}
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          </span>,
        );
      }

      // LOCI PATCH: `author:` frontmatter is inconsistent across the vault (a plain string, a
      // YAML list, or empty/blank) — normalize every shape here instead of trusting one upstream.
      const rawAuthor = fileData.frontmatter?.author;
      const authors = (Array.isArray(rawAuthor) ? rawAuthor : [rawAuthor])
        .filter((a): a is string => typeof a === "string")
        // a vault author is often written as a wikilink; frontmatter is never
        // link-resolved, so show the name rather than the raw brackets
        .map((a) =>
          a
            .trim()
            .replace(/^\[\[(.*)\]\]$/, "$1")
            .split("|")
            .pop()!
            .trim(),
        )
        .filter((a) => a !== "");
      if (authors.length > 0) {
        segments.push(<span>author: {authors.join(", ")}</span>);
      }

      return (
        <p show-comma={options.showComma} class={classNames(displayClass, "content-meta")}>
          {segments}
        </p>
      );
    } else {
      return null;
    }
  }

  ContentMetadata.css = style;

  return ContentMetadata;
}) satisfies QuartzComponentConstructor;
