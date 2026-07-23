import { readFileSync } from "fs";

// .excalidraw.md carries frontmatter but the parser never reads a publish
// flag from it, so gate the same way as non-frontmatter assets: an explicit
// allowlist. Mirrors quartz/plugins/emitters/assets.ts.
const EXCEPTIONS_FILE = "publish-exceptions.txt";

export function loadPublishAllowlist(): string[] {
  try {
    return readFileSync(EXCEPTIONS_FILE, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}
