import sanitizeHtml from "sanitize-html"
import TurndownService from "turndown"
import { marked } from "marked"

const BIO_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "code",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
]

const BIO_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
}

const BIO_ALLOWED_SCHEMES: sanitizeHtml.IOptions["allowedSchemes"] = [
  "http",
  "https",
  "mailto",
]

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  bulletListMarker: "-",
})

turndown.keep(["br"])

turndown.addRule("preserveCode", {
  filter: "code",
  replacement: (content) => (content ? "`" + content + "`" : "``"),
})

marked.setOptions({
  gfm: true,
  breaks: true,
  mangle: false,
  headerIds: false,
})

export function sanitizeBioHtml(html: string): string {
  if (!html) {
    return ""
  }

  return sanitizeHtml(html, {
    allowedTags: BIO_ALLOWED_TAGS,
    allowedAttributes: BIO_ALLOWED_ATTRIBUTES,
    allowedSchemes: BIO_ALLOWED_SCHEMES,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { target: "_blank", rel: "noreferrer noopener" },
        true,
      ),
      b: "strong",
      i: "em",
    },
    exclusiveFilter(frame) {
      if (frame.tag === "a") {
        const href = frame.attribs.href
        if (!href) return true
      }
      return false
    },
  })
    .trim()
}

export function bioHtmlToMarkdown(html: string): string {
  const sanitized = sanitizeBioHtml(html)
  if (!sanitized) {
    return ""
  }

  return turndown.turndown(sanitized).trim()
}

export function renderBioMarkdown(markdown: string): string {
  const source = markdown?.trim() ?? ""
  if (!source) {
    return ""
  }

  const html = marked.parse(source, { async: false }) as string
  return sanitizeBioHtml(html)
}
