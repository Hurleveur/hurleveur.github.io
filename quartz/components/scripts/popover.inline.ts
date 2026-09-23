import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const p = new DOMParser()
// what the pending popover belongs to: a link, or a virtual element standing in
// for a star in the side brain. A fetch that resolves after the pointer moved
// on to something else must not open.
let activeRef: object | null = null

type Ref = Element | { getBoundingClientRect(): DOMRect; getClientRects(): DOMRect[] }

async function openPopover(ref: Ref, targetUrl: URL, clientX: number, clientY: number) {
  activeRef = ref

  async function setPosition(popoverElement: HTMLElement) {
    const { x, y } = await computePosition(ref, popoverElement, {
      strategy: "fixed",
      middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
    })
    Object.assign(popoverElement.style, {
      transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
    })
  }

  function showPopover(popoverElement: HTMLElement) {
    clearActivePopover()
    popoverElement.classList.add("active-popover")
    setPosition(popoverElement as HTMLElement)

    if (hash !== "") {
      const inner = popoverElement.querySelector(".popover-inner") as HTMLElement | null
      if (inner) {
        const targetAnchor = `#popover-internal-${hash.slice(1)}`
        const heading = inner.querySelector(targetAnchor) as HTMLElement | null
        if (heading) {
          // leave ~12px of buffer when scrolling to a heading
          inner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
        }
      }
    }
  }

  const hash = decodeURIComponent(targetUrl.hash)
  targetUrl.hash = ""
  targetUrl.search = ""
  const popoverId = `popover-${targetUrl.pathname}`
  const prevPopoverElement = document.getElementById(popoverId)

  // dont refetch if there's already a popover
  if (!!document.getElementById(popoverId)) {
    showPopover(prevPopoverElement as HTMLElement)
    return
  }

  const response = await fetchCanonical(targetUrl).catch((err) => {
    console.error(err)
  })

  if (!response) return
  const rawContentType = response.headers.get("Content-Type")
  if (!rawContentType) return
  const [contentType] = rawContentType.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  const popoverElement = document.createElement("div")
  popoverElement.id = popoverId
  popoverElement.classList.add("popover")
  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverInner.dataset.contentType = contentType ?? undefined
  popoverElement.appendChild(popoverInner)

  switch (contentTypeCategory) {
    case "image":
      const img = document.createElement("img")
      img.src = targetUrl.toString()
      img.alt = targetUrl.pathname

      popoverInner.appendChild(img)
      break
    case "application":
      switch (typeInfo) {
        case "pdf":
          const pdf = document.createElement("iframe")
          pdf.src = targetUrl.toString()
          popoverInner.appendChild(pdf)
          break
        default:
          break
      }
      break
    default:
      const contents = await response.text()
      const html = p.parseFromString(contents, "text/html")
      normalizeRelativeURLs(html, targetUrl)
      // prepend all IDs inside popovers to prevent duplicates
      html.querySelectorAll("[id]").forEach((el) => {
        const targetID = `popover-internal-${el.id}`
        el.id = targetID
      })
      const elts = [...html.getElementsByClassName("popover-hint")]
      if (elts.length === 0) return

      elts.forEach((elt) => popoverInner.appendChild(elt))
  }

  if (!!document.getElementById(popoverId)) {
    return
  }

  document.body.appendChild(popoverElement)
  if (activeRef !== ref) {
    return
  }

  showPopover(popoverElement)
}

function clearActivePopover() {
  activeRef = null
  const allPopoverElements = document.querySelectorAll(".popover")
  allPopoverElements.forEach((popoverElement) => popoverElement.classList.remove("active-popover"))
}

// One listener on the document instead of one per link: the explorer and
// vaultbrain.js build their links after "nav", so a scan of the page at nav
// time missed them. A frieze word is an SVG <a>, whose href is not a string,
// hence getAttribute. Links inside an open popover don't open another one.
const POPOVER_LINKS = "a.internal, a.frieze-word, .explorer a"
function linkOf(t: EventTarget | null): HTMLElement | SVGElement | null {
  if (!(t instanceof Element) || t.closest(".popover")) return null
  return t.closest<HTMLElement | SVGElement>(POPOVER_LINKS)
}

document.addEventListener("mouseover", (e: MouseEvent) => {
  const link = linkOf(e.target)
  if (!link || link === linkOf(e.relatedTarget)) return
  const href = link.getAttribute("href")
  if (!href || link.dataset.noPopover === "true") return
  openPopover(link, new URL(href, location.href), e.clientX, e.clientY)
})
document.addEventListener("mouseout", (e: MouseEvent) => {
  const link = linkOf(e.target)
  if (link && link !== linkOf(e.relatedTarget)) clearActivePopover()
})

// the side brain's stars are canvas, not links: vaultbrain.js opens their
// preview through this, anchored on a box around the star
window.quartzPopover = {
  open: (rect: DOMRect, href: string) => {
    const ref = { getBoundingClientRect: () => rect, getClientRects: () => [rect] }
    openPopover(ref, new URL(href, location.href), rect.x, rect.y)
  },
  close: clearActivePopover,
}
