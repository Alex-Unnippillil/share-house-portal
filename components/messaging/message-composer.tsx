"use client"

import { type FormEvent, useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Editor } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import { Bold, Code, Italic } from "lucide-react"

import { saveMessage } from "@/app/messaging/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useLocalStorage } from "@/lib/hooks/use-local-storage"
import { getEditorMarkdown, messageEditorExtensions } from "@/lib/messaging/editor"
import { cn } from "@/lib/utils"

const MARKDOWN_HINTS_STORAGE_KEY = "messaging.markdownHints"

type MessageComposerProps = {
  threadId: string
  authorId: string
  authorName: string
}

type ToolbarItem = {
  id: string
  icon: typeof Bold
  label: string
  command: (editor: Editor | null) => void
  isActive: (editor: Editor | null) => boolean
  shortcut: string
}

const toolbarItems: ToolbarItem[] = [
  {
    id: "bold",
    icon: Bold,
    label: "Bold",
    command: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive("bold") ?? false,
    shortcut: "**text**",
  },
  {
    id: "italic",
    icon: Italic,
    label: "Italic",
    command: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive("italic") ?? false,
    shortcut: "_text_",
  },
  {
    id: "code",
    icon: Code,
    label: "Code",
    command: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive("code") ?? false,
    shortcut: "`text`",
  },
] as const satisfies ToolbarItem[]

export function MessageComposer({ threadId, authorId, authorName }: MessageComposerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const hintSwitchId = useId()
  const [showMarkdownHints, setShowMarkdownHints] = useLocalStorage<boolean>(
    MARKDOWN_HINTS_STORAGE_KEY,
    true
  )

  const editor = useEditor({
    extensions: messageEditorExtensions,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none min-h-[140px] rounded-b-lg bg-background px-4 py-3 text-sm text-foreground focus:outline-none",
          "focus-visible:ring-1 focus-visible:ring-ring"
        ),
      },
    },
    onUpdate: () => {
      if (error) {
        setError(null)
      }
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) {
      return
    }

    const contentHtml = editor.getHTML()
    const contentMarkdown = getEditorMarkdown(editor).trim()

    if (!contentMarkdown) {
      setError("Add a message before sending.")
      return
    }

    startTransition(async () => {
      try {
        const result = await saveMessage({
          threadId,
          authorId,
          contentHtml,
          contentMarkdown,
        })

        if (!result?.success) {
          setError(result?.error ?? "Unable to save your message right now.")
          return
        }

        editor.chain().clearContent(true).run()
        setError(null)
        router.refresh()
      } catch (caughtError) {
        console.error("message-composer", caughtError)
        setError("Unable to save your message right now.")
      }
    })
  }

  const isSubmitDisabled = !editor || editor.isEmpty || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Message composer">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-foreground">Post as {authorName}</span>
          <span className="text-xs text-muted-foreground">
            Formatting shortcuts apply automatically as you type.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={hintSwitchId}
            checked={showMarkdownHints}
            onCheckedChange={setShowMarkdownHints}
            aria-describedby={`${hintSwitchId}-description`}
          />
          <Label htmlFor={hintSwitchId} className="text-xs text-muted-foreground">
            Show markdown hints
          </Label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
          {toolbarItems.map((item) => {
            const Icon = item.icon
            const active = item.isActive(editor)
            return (
              <Button
                key={item.id}
                type="button"
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => item.command(editor)}
                className={cn(
                  "h-8 px-2 text-xs",
                  active && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                aria-label={`${item.label} (${item.shortcut})`}
              >
                <Icon className="mr-1 size-3.5" aria-hidden />
                {item.label}
              </Button>
            )
          })}
        </div>
        <EditorContent editor={editor} />
      </div>

      {showMarkdownHints ? (
        <div
          id={`${hintSwitchId}-description`}
          className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          Try **bold**, _italic_, or `code` to format in-line without leaving the keyboard.
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitDisabled} isLoading={isPending}>
          Send message
        </Button>
      </div>
    </form>
  )
}

export default MessageComposer
