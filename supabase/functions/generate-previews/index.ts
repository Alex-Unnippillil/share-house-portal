import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for generate-previews function");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const JSON_HEADERS = { "Content-Type": "application/json" };
const IMAGE_MIME_PREFIX = "image/";
const PDF_MIME_TYPE = "application/pdf";

interface StorageRecord {
  id: string;
  bucket_id: string;
  name: string;
  metadata?: {
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    contentType?: string;
  } | null;
}

interface StoragePayload {
  type?: string;
  record?: StorageRecord;
}

function guessMimeType(path: string): string | null {
  const extension = path.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return PDF_MIME_TYPE;
    default:
      return null;
  }
}

function buildPublicUrls(bucket: string, path: string, isImage: boolean) {
  const { data: base } = supabase.storage.from(bucket).getPublicUrl(path);
  const baseUrl = base.publicUrl;

  if (!isImage) {
    return { baseUrl, previewUrl: null, thumbnailUrl: null };
  }

  const { data: thumbnail } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: { width: 160, height: 160, resize: "cover", quality: 75 },
  });
  const { data: preview } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: { width: 960, resize: "contain", quality: 80 },
  });

  return {
    baseUrl,
    thumbnailUrl: thumbnail.publicUrl ?? null,
    previewUrl: preview.publicUrl ?? null,
  };
}

async function updateDocumentMetadata(fileUrl: string | null, updates: Record<string, unknown>) {
  if (!fileUrl) return;

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, metadata")
    .eq("file_url", fileUrl);

  if (error) {
    console.error("generate-previews: failed to load documents", error);
    return;
  }

  if (!documents?.length) {
    return;
  }

  const document = documents[0];
  const existingMetadata = (document.metadata ?? {}) as Record<string, unknown>;
  const nextMetadata = {
    ...existingMetadata,
    ...updates,
    last_generated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("documents")
    .update({ metadata: nextMetadata })
    .eq("id", document.id);

  if (updateError) {
    console.error("generate-previews: failed to update document metadata", updateError);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  let payload: StoragePayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("generate-previews: invalid payload", error);
    return new Response(JSON.stringify({ error: "invalid_payload" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const record = payload.record;

  if (!record || !record.bucket_id || !record.name) {
    return new Response(JSON.stringify({ message: "no_record" }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  if (payload.type && payload.type !== "INSERT" && payload.type !== "UPDATE") {
    return new Response(JSON.stringify({ message: "ignored_event" }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const mimeFromRecord = record.metadata?.mimetype || record.metadata?.contentType;
  const contentType = mimeFromRecord || guessMimeType(record.name);
  const isImage = !!contentType && contentType.startsWith(IMAGE_MIME_PREFIX);

  const urls = buildPublicUrls(record.bucket_id, record.name, isImage);

  const metadataUpdates: Record<string, unknown> = {
    content_type: contentType ?? null,
    size_bytes: record.metadata?.size ?? null,
  };

  if (isImage) {
    metadataUpdates.thumbnail_url = urls.thumbnailUrl;
    metadataUpdates.preview_url = urls.previewUrl;
  } else if (contentType === PDF_MIME_TYPE) {
    metadataUpdates.thumbnail_url = null;
    metadataUpdates.preview_url = null;
  }

  await updateDocumentMetadata(urls.baseUrl, metadataUpdates);

  return new Response(
    JSON.stringify({
      message: "processed",
      bucket: record.bucket_id,
      path: record.name,
    }),
    {
      status: 200,
      headers: JSON_HEADERS,
    }
  );
});
