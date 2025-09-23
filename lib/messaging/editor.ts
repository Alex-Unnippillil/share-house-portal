import type { Editor, Extensions } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "tiptap-markdown"

export const messageEditorExtensions: Extensions = [
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
    },
    orderedList: {
      keepMarks: true,
    },
    codeBlock: false,
    heading: false,
    dropcursor: {
      color: "hsl(var(--primary))",
      width: 2,
    },
  }),
  Placeholder.configure({
    placeholder: "Share an update with your roommates…",
  }),
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
]

export function getEditorMarkdown(editor: Editor) {
  const markdown = editor.storage.markdown?.getMarkdown?.()
  return typeof markdown === "string" ? markdown : editor.getText()
}
