import { QuartzTransformerPlugin } from "../types"
import { stripObsidianComments } from "../../util/obsidianComments"

// remark-obsidian (the OFM dependency that parses `%%` comments) only treats
// an unclosed `%%` as hiding-to-end-of-file when it opens a block — the
// start of a line after a blank line. One opened mid-paragraph falls through
// as literal text instead of hiding the rest of the note, unlike Obsidian
// itself. Running this on the raw file text, before anything parses
// markdown, makes both forms agree with Obsidian regardless of where the
// opening `%%` sits. The closed-pair case is handled correctly downstream by
// remark-obsidian already; stripping it here too is harmless (there is
// nothing left for it to find).
export const HideCommentTail: QuartzTransformerPlugin = () => ({
  name: "HideCommentTail",
  textTransform(_ctx, src) {
    return stripObsidianComments(src)
  },
})
