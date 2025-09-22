"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { createActionClient } from "@/utils/supabase/actions"

const MESSAGING_PATH = "/messaging"

function sanitizeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-")
  return normalized.length > 0 ? normalized.toLowerCase() : `attachment-${Date.now()}`
}

type ActionResult =
  | { status: "success" }
  | { status: "error"; message: string }
  | { status: "partial"; message: string }

export async function createThreadAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createActionClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: "error", message: "You must be signed in to start a thread." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, household_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { status: "error", message: "We couldn't find your profile record." }
  }

  if (!profile.household_id) {
    return { status: "error", message: "Join or create a household before posting." }
  }

  const title = formData.get("title")?.toString().trim() ?? ""
  const topic = formData.get("topic")?.toString().trim() ?? ""
  const summaryValue = formData.get("summary")?.toString().trim() ?? ""
  const parentThreadIdValue = formData.get("parentThreadId")?.toString().trim() ?? ""
  const tagsValue = formData.get("tags")?.toString().trim() ?? ""
  const priorityValue = formData.get("priority")?.toString().trim() ?? ""

  if (!title) {
    return { status: "error", message: "A thread title is required." }
  }

  if (!topic) {
    return { status: "error", message: "Choose a topic to help roommates understand the thread context." }
  }

  const metadata: Record<string, unknown> = {}

  if (tagsValue) {
    const tags = tagsValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (tags.length > 0) {
      metadata.tags = tags
    }
  }

  if (priorityValue) {
    metadata.priority = priorityValue
  }

  const summary = summaryValue.length > 0 ? summaryValue : null
  const parentThreadId = parentThreadIdValue.length > 0 ? parentThreadIdValue : null
  const metadataPayload = Object.keys(metadata).length > 0 ? metadata : null

  const { error: insertError } = await supabase.from("threads").insert({
    created_by: profile.id,
    household_id: profile.household_id,
    parent_thread_id: parentThreadId,
    title,
    topic,
    summary,
    metadata: metadataPayload,
  })

  if (insertError) {
    return { status: "error", message: "Something went wrong while creating the thread." }
  }

  revalidatePath(MESSAGING_PATH)
  return { status: "success" }
}

export async function postMessageAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createActionClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: "error", message: "You must be signed in to send a message." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, household_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { status: "error", message: "We couldn't find your profile record." }
  }

  if (!profile.household_id) {
    return { status: "error", message: "Join or create a household before messaging." }
  }

  const threadId = formData.get("threadId")?.toString().trim() ?? ""
  const content = formData.get("content")?.toString().trim() ?? ""
  const replyToValue = formData.get("replyTo")?.toString().trim() ?? ""

  if (!threadId) {
    return { status: "error", message: "Choose a thread before posting." }
  }

  if (!content) {
    return { status: "error", message: "Add a message before sending." }
  }

  const parentMessageId = replyToValue.length > 0 ? replyToValue : null

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      content,
      parent_message_id: parentMessageId,
      sender_id: profile.id,
      thread_id: threadId,
    })
    .select("id")
    .single()

  if (messageError || !message) {
    return { status: "error", message: "Unable to post your message right now." }
  }

  const files = formData
    .getAll("attachments")
    .filter((file): file is File => file instanceof File && file.size > 0)

  let hadAttachmentError = false

  for (const file of files) {
    const sanitizedName = sanitizeFileName(file.name)
    const storagePath = `${profile.household_id}/threads/${threadId}/${message.id}/${randomUUID()}-${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from("docs")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      })

    if (uploadError) {
      hadAttachmentError = true
      continue
    }

    const { error: attachmentError } = await supabase.from("message_attachments").insert({
      bucket_id: "docs",
      content_type: file.type || null,
      file_name: file.name,
      file_size: file.size,
      message_id: message.id,
      storage_path: storagePath,
    })

    if (attachmentError) {
      hadAttachmentError = true
      await supabase.storage.from("docs").remove([storagePath])
    }
  }

  revalidatePath(MESSAGING_PATH)

  if (hadAttachmentError) {
    return {
      status: "partial",
      message: "Message sent, but one or more attachments could not be uploaded.",
    }
  }

  return { status: "success" }
}
