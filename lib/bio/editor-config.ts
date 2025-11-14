import type { Extensions } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"

export function createBioEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      codeBlock: false,
      dropcursor: true,
      heading: false,
      horizontalRule: false,
      orderedList: false,
      strike: false,
    }),
    Placeholder.configure({
      placeholder,
      showOnlyCurrent: true,
      includeChildren: true,
    }),
  ]
}
