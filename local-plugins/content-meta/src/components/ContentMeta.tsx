import type {
  QuartzComponentConstructor,
  QuartzComponentProps,
  QuartzPluginData,
  ValidDateType,
} from "@quartz-community/types";
import readingTime from "reading-time";
import { classNames } from "../util/lang";
import { resolveRelative, type SimpleSlug } from "@quartz-community/utils/path";
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
      // The whole link is shown, not just its hostname: a repo or a page path is the point.
      const sourceUrl = fileData.frontmatter?.url;
      if (typeof sourceUrl === "string" && sourceUrl.trim() !== "") {
        const href = sourceUrl.trim();
        segments.push(
          <span>
            source:{" "}
            <a href={href} target="_blank" rel="noopener noreferrer">
              {href}
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

      // LOCI PATCH: tags used to only show in the collapsible Properties table; the owner
      // wants them on this line instead. `tags` frontmatter is a string, a list, empty, or
      // missing depending on the note, so normalize every shape rather than trusting one.
      // By the time this runs, obsidian-flavored-markdown has already slugified every tag
      // (see slugTag in its transformer), so the same string is both the display text and
      // the tag page's slug — same assumption TagList.tsx makes for its tag links.
      const rawTags = fileData.frontmatter?.tags;
      const tags = (Array.isArray(rawTags) ? rawTags : [rawTags]).filter(
        (t): t is string => typeof t === "string" && t.trim() !== "",
      );
      if (tags.length > 0) {
        segments.push(
          <span>
            {tags.map((tag, i) => (
              <>
                {i > 0 ? " " : ""}
                <a
                  href={resolveRelative(fileData.slug!, `tags/${tag}` as SimpleSlug)}
                  class="internal tag-link"
                >
                  #{tag}
                </a>
              </>
            ))}
          </span>,
        );
      }

      // LOCI PATCH: `description` and `aliases` used to sit in the collapsible
      // Properties table (note-properties, now disabled). A description is the note's
      // standfirst — it reads as one, right under the title — and an alias is a name,
      // not a table row. Frontmatter is never link-resolved, so a wikilink is shown
      // as its display text, the same normalization the author line above does.
      const plain = (s: string) =>
        s
          .trim()
          .replace(/\[\[([^\]]*)\]\]/g, (_m, inner: string) => inner.split("|").pop()!.trim());

      const rawDescription = fileData.frontmatter?.description;
      const description =
        typeof rawDescription === "string" && rawDescription.trim() !== ""
          ? plain(rawDescription)
          : undefined;

      const rawAliases = fileData.frontmatter?.aliases;
      const aliases = (Array.isArray(rawAliases) ? rawAliases : [rawAliases])
        .filter((a): a is string => typeof a === "string" && a.trim() !== "")
        .map(plain);

      return (
        <>
          {description && <p class={classNames(displayClass, "note-description")}>{description}</p>}
          {aliases.length > 0 && (
            <p class={classNames(displayClass, "note-aliases")}>
              also known as {aliases.join(", ")}
            </p>
          )}
          <p show-comma={options.showComma} class={classNames(displayClass, "content-meta")}>
            {segments}
          </p>
        </>
      );
    } else {
      return null;
    }
  }

  ContentMetadata.css = style;

  return ContentMetadata;
}) satisfies QuartzComponentConstructor;
