import { describe, expect, it } from "vitest"
import { Editor } from "@tiptap/core"

import { getEditorMarkdown, messageEditorExtensions } from "@/lib/messaging/editor"

describe("message editor", () => {
  const createEditor = () =>
    new Editor({
      extensions: messageEditorExtensions,
      content: "",
    })

  it("applies inline markdown shortcuts for bold, italic, and code", () => {
    const editor = createEditor()

    editor.chain().focus().insertContent("**bold** ").run()
    expect(editor.getHTML()).toContain("<strong>bold</strong>")

    editor.commands.clearContent()
    editor.chain().focus().insertContent("_italic_ ").run()
    expect(editor.getHTML()).toContain("<em>italic</em>")

    editor.commands.clearContent()
    editor.chain().focus().insertContent("`code` ").run()
    expect(editor.getHTML()).toContain("<code>code</code>")

    editor.destroy()
  })

  it("serializes markdown used when persisting to Supabase", () => {
    const editor = createEditor()

    editor.chain().focus().insertContent("**bold** and _italic_ with `code`").run()
    const markdown = getEditorMarkdown(editor)

    expect(markdown).toContain("**bold**")
    expect(markdown).toMatch(/(\*|_)italic(\*|_)/)
    expect(markdown).toContain("`code`")

    editor.destroy()
  })
})
