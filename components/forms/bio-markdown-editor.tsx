"use client"

import { useEffect } from "react"

import { useEditor, EditorContent } from "@tiptap/react"

import { cn } from "@/lib/utils"
import { bioHtmlToMarkdown, renderBioMarkdown, sanitizeBioHtml } from "@/lib/bio"
import { createBioEditorExtensions } from "@/lib/bio/editor-config"

interface BioMarkdownEditorProps {
  value: string
  onChange: (payload: { html: string; markdown: string }) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

const editorClassName =
  "min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

const contentClassName =
  "focus:outline-none [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-sm [&_.is-editor-empty:first-child::before]:leading-6 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:opacity-70 [&_.is-editor-empty:first-child::before]:pl-3 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_strong]:font-semibold [&_em]:italic"

export function BioMarkdownEditor({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Tell us a little bit about yourself",
}: BioMarkdownEditorProps) {
  const editor = useEditor({
    extensions: createBioEditorExtensions(placeholder),
    content: value || "<p></p>",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(editorClassName, className),
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor }) {
      const sanitizedHtml = sanitizeBioHtml(editor.getHTML())
      const markdown = bioHtmlToMarkdown(sanitizedHtml)
      const normalizedHtml = renderBioMarkdown(markdown)
      onChange({ html: normalizedHtml, markdown })
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) {
      return
    }

    const sanitizedIncoming = sanitizeBioHtml(value)
    const current = sanitizeBioHtml(editor.getHTML())

    if (sanitizedIncoming && sanitizedIncoming !== current) {
      editor.commands.setContent(sanitizedIncoming)
      return
    }

    if (!sanitizedIncoming && current) {
      editor.commands.setContent("<p></p>")
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div className={cn(editorClassName, className)} aria-busy>
        <div className="animate-pulse text-sm text-muted-foreground">Loading editor…</div>
      </div>
    )
  }

  return (
    <div className="group/editor">
      <EditorContent editor={editor} className={contentClassName} />
    </div>
  )
}
