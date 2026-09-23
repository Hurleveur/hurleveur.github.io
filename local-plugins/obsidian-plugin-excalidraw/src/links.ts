import type { QuartzPluginData, FullSlug, FilePath, SimpleSlug } from "@quartz-community/types";
import { slugifyFilePath, simplifySlug } from "@quartz-community/utils/path";
import type { ExcalidrawData } from "./types";

// LOCI PATCH: match on the SLUGIFIED wikilink, not its lowercased raw text.
// "[[information inputs]]" lowercases to "information inputs", which never
// equals the slug "information-inputs", so every multi-word link fell to the
// "Note not found" fallback and a root-relative href. Folder notes slug to
// "<folder>/index", so "[[Life structure]]" has to be accepted in that
// spelling too. Exact slug wins over a trailing-segment match.
export function findPage(target: string, allFiles: QuartzPluginData[]) {
  const name = (target.split(/[#|]/)[0] ?? "").trim();
  const wanted = slugifyFilePath(name as FilePath) as string;
  const wantedIndex = wanted.endsWith("/index") ? wanted : `${wanted}/index`;
  const page =
    allFiles.find((f) => f.slug === wanted || f.slug === wantedIndex) ??
    allFiles.find((f) => f.slug?.endsWith(`/${wanted}`) || f.slug?.endsWith(`/${wantedIndex}`));
  return { page, wanted };
}

// LOCI PATCH: a drawing is a virtual page, so no markdown pass ever fills its
// `links` and the content index (hence the graph) saw it as unconnected. Every
// wikilink in an element's link or text counts, but only when it lands on a
// published page — `content` is the gated list, so a private note's name
// never reaches the public index.
export function drawingLinks(data: ExcalidrawData, published: QuartzPluginData[]): SimpleSlug[] {
  const links = new Set<SimpleSlug>();
  for (const el of data.elements) {
    const source = `${(el.link as string) ?? ""} ${(el.rawText as string) ?? ""}`;
    for (const [, target] of source.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const { page } = findPage(target!, published);
      if (page?.slug) links.add(simplifySlug(page.slug as FullSlug));
    }
  }
  return [...links];
}
