import { readFileSync } from "fs";

// .canvas files are JSON — can't carry `publish: true` frontmatter, so they
// publish only if listed here. Mirrors quartz/plugins/emitters/assets.ts.
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
