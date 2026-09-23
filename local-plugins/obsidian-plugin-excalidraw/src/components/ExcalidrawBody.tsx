import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
  QuartzPluginData,
  FullSlug,
  FilePath,
} from "@quartz-community/types";
import {
  resolveRelative,
  slugifyFilePath,
  normalizeHastElement,
} from "@quartz-community/utils/path";
import { toHtml } from "hast-util-to-html";
import type { ExcalidrawData, ExcalidrawPageOptions } from "../types";
import { renderToSvg } from "../renderer";
import type { ResolvedEmbed, RenderContext, EmbedOverlay, RenderResult } from "../renderer";
import style from "./styles/excalidraw.scss";
// @ts-expect-error inline script import handled by bundler
import script from "./scripts/excalidraw.inline.ts";

function stripTranscludes(html: string): string {
  return html
    .replace(/<blockquote[^>]*class="[^"]*transclude[^"]*"[^>]*>[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<div[^>]*class="[^"]*transclude[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
}

function resolveEmbeds(
  data: ExcalidrawData,
  currentSlug: FullSlug,
  allFiles: QuartzPluginData[],
): Record<string, ResolvedEmbed> {
  const result: Record<string, ResolvedEmbed> = {};
  const embeddables = data.elements.filter(
    (el) => el.type === "embeddable" || el.type === "iframe",
  );

  for (const el of embeddables) {
    const link = (el.link as string) ?? "";
    if (!link.startsWith("[[")) continue;

    const target = link.replace(/^\[\[/, "").replace(/\]\]$/, "");

    // LOCI PATCH: match on the SLUGIFIED wikilink, not its lowercased raw text.
    // "[[information inputs]]" lowercases to "information inputs", which never
    // equals the slug "information-inputs", so every multi-word link fell to the
    // "Note not found" fallback and a root-relative href. Folder notes slug to
    // "<folder>/index", so "[[Life structure]]" has to be accepted in that
    // spelling too. Exact slug wins over a trailing-segment match.
    const name = (target.split(/[#|]/)[0] ?? "").trim();
    const wanted = slugifyFilePath(name as FilePath) as string;
    const wantedIndex = wanted.endsWith("/index") ? wanted : `${wanted}/index`;
    const page =
      allFiles.find((f) => f.slug === wanted || f.slug === wantedIndex) ??
      allFiles.find((f) => f.slug?.endsWith(`/${wanted}`) || f.slug?.endsWith(`/${wantedIndex}`));

    const pageSlug = (page?.slug ?? wanted) as FullSlug;
    const href = resolveRelative(currentSlug, pageSlug);

    if (!page || !page.htmlAst) {
      result[el.id] = {
        html: `<a href="${href}" style="color:#228be6;text-decoration:none;font-size:13px;">${target}</a>`,
        href,
      };
      continue;
    }

    const tree = page.htmlAst;
    const rebased = {
      ...tree,
      children: tree.children.map((child: unknown) => {
        if ((child as { type: string }).type === "element") {
          return normalizeHastElement(
            child as Parameters<typeof normalizeHastElement>[0],
            currentSlug,
            pageSlug,
          );
        }
        return child;
      }),
    };

    let html = toHtml(rebased as Parameters<typeof toHtml>[0], { allowDangerousHtml: true });
    html = stripTranscludes(html);
    result[el.id] = { html, href };
  }

  return result;
}

function resolveImages(
  imagePaths: Record<string, string>,
  currentSlug: FullSlug,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [hash, filePath] of Object.entries(imagePaths)) {
    const imageSlug = slugifyFilePath(filePath as FilePath) as FullSlug;
    result[hash] = resolveRelative(currentSlug, imageSlug);
  }

  return result;
}

// LOCI PATCH: overlays sit in the drawing's own coordinates — left/top as a
// percentage of the viewBox, width/height at the element's native px — and
// the stylesheet scales each one by --k (canvas width / viewBox width, set
// by the inline script). Text inside a note box then shrinks and grows with
// the drawing, as it does in Obsidian, in the column and full screen alike.
// The "📄 name" header and "Open note →" link are gone: a note box opens
// maximised on click, and that view's title is the link to the note.
function renderOverlay(overlay: EmbedOverlay, vb: RenderResult["viewBox"]): unknown {
  const label = overlay.link
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/^https?:\/\//, "");
  const truncatedLabel = label.length > 50 ? label.slice(0, 47) + "..." : label;
  const box =
    `left:${((overlay.x + vb.offsetX) / vb.width) * 100}%;` +
    `top:${((overlay.y + vb.offsetY) / vb.height) * 100}%;` +
    `width:${overlay.width}px;height:${overlay.height}px`;

  if (overlay.isWikilink) {
    const [target = "", alias] = label.split("|");
    const title = (alias ?? target.split("#")[0]!.split("/").pop()!).trim();
    return (
      <div
        class="excalidraw-overlay excalidraw-embed-note"
        style={box}
        data-overlay-id={overlay.id}
        data-title={title}
        data-href={overlay.resolved?.href}
        role="button"
        tabindex={0}
        aria-label={`Read ${title}`}
      >
        <div
          class="excalidraw-embed-content"
          dangerouslySetInnerHTML={{
            __html: overlay.resolved
              ? `<div class="excalidraw-embed-body">${overlay.resolved.html}</div>`
              : `<span class="excalidraw-embed-missing">Note not found</span>`,
          }}
        />
      </div>
    );
  }

  return (
    <div class="excalidraw-overlay excalidraw-embed-url" style={box} data-overlay-id={overlay.id}>
      <div class="excalidraw-embed-header">
        <a href={overlay.link} target="_blank" rel="noopener noreferrer">
          {"🔗 " + truncatedLabel}
        </a>
      </div>
      <iframe
        src={overlay.link}
        class="excalidraw-embed-iframe"
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </div>
  );
}

export default ((userOpts?: ExcalidrawPageOptions) => {
  const Component: QuartzComponent = (props: QuartzComponentProps) => {
    const { fileData, allFiles } = props;
    const data = fileData.excalidrawData as ExcalidrawData;
    const options = (fileData.excalidrawOptions as ExcalidrawPageOptions) ?? userOpts ?? {};
    const currentSlug = fileData.slug!;

    const resolvedEmbedMap = allFiles ? resolveEmbeds(data, currentSlug, allFiles) : undefined;
    const imagePaths = (fileData.excalidrawImagePaths as Record<string, string>) ?? {};
    const resolvedImageMap = resolveImages(imagePaths, currentSlug);
    const renderCtx: RenderContext = {
      resolvedEmbeds: resolvedEmbedMap,
      resolvedImages: resolvedImageMap,
    };
    const result = renderToSvg(data, options, renderCtx);
    const label = fileData.frontmatter?.title ?? "Excalidraw drawing";

    // LOCI PATCH: one canvas — the SVG plus its note boxes — sits in the
    // column, drawn like Obsidian draws it. A click on a note box opens that
    // note maximised in .excalidraw-note-dialog without leaving the page; ⤢
    // moves the same canvas into .excalidraw-dialog for full-screen pan/zoom
    // and moves it back on close, so nothing is rendered twice.
    const vb = result.viewBox;
    return (
      <>
        <div class="excalidraw-view">
          <div
            class="excalidraw-canvas"
            style={`aspect-ratio:${vb.width}/${vb.height};--ratio:${vb.width / vb.height}`}
            data-viewbox-w={vb.width}
            role="img"
            aria-label={label}
          >
            <div class="excalidraw-svg" dangerouslySetInnerHTML={{ __html: result.svg }} />
            <div class="excalidraw-overlays">
              {result.overlays.map((o) => renderOverlay(o, vb))}
            </div>
          </div>
          <button type="button" class="excalidraw-expand" aria-label={`Open ${label} full screen`}>
            ⤢
          </button>
        </div>
        <dialog class="excalidraw-dialog" aria-label={label}>
          <button class="excalidraw-dialog-close" type="button" aria-label="Close">
            ✕
          </button>
          <article class="excalidraw-page">
            <div class="excalidraw-controls">
              <button class="excalidraw-zoom-in" type="button" aria-label="Zoom in">
                +
              </button>
              <button class="excalidraw-zoom-out" type="button" aria-label="Zoom out">
                −
              </button>
              <button class="excalidraw-reset" type="button" aria-label="Reset view">
                ⟲
              </button>
            </div>
            <div class="excalidraw-container" />
          </article>
        </dialog>
        <dialog class="excalidraw-note-dialog">
          <button class="excalidraw-dialog-close" type="button" aria-label="Close">
            ✕
          </button>
          <h2 class="excalidraw-note-title" />
          <div class="excalidraw-note-body" />
        </dialog>
        {options.enableInteraction !== false && (
          <script
            type="application/json"
            class="excalidraw-data"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                elements: data.elements,
                appState: data.appState,
                files: data.files,
              }),
            }}
          />
        )}
      </>
    );
  };

  Component.css = style;
  Component.afterDOMLoaded = script;

  return Component;
}) satisfies QuartzComponentConstructor;
