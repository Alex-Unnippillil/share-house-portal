import { z } from "zod";

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const optionalTrimmedString = (maxMessage?: string, maxLength?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
      }
      return value ?? undefined;
    },
    maxLength
      ? z
          .string()
          .max(maxLength, maxMessage ?? `Must be ${maxLength} characters or fewer.`)
          .optional()
      : z.string().optional(),
  );

const optionalUuidString = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value ?? undefined;
  },
  z.string().uuid("Select a valid tenant.").optional(),
);

const optionalDateInput = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return undefined;
  },
  z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: "Enter a valid expiration date.",
    })
    .optional(),
);

export const documentUploadSchema = z.object({
  file: z
    .any()
    .refine((file): file is File => file instanceof File, {
      message: "Add a file before uploading.",
    })
    .refine(
      (file) =>
        !(file instanceof File) || DOCUMENT_ALLOWED_MIME_TYPES.includes(file.type),
      {
        message: "Please upload a PDF, Word, or image file.",
      },
    )
    .refine((file) => !(file instanceof File) || file.size <= MAX_DOCUMENT_FILE_SIZE, {
      message: "File size must be 10MB or less.",
    }),
  title: z
    .string({ required_error: "Give your document a title." })
    .trim()
    .min(1, "Give your document a title."),
  description: optionalTrimmedString("Description must be 1000 characters or fewer.", 1000),
  document_type: z.enum(["lease", "addendum", "insurance", "maintenance", "other"], {
    required_error: "Choose a document type.",
  }),
  tenant_id: optionalUuidString,
  unit_id: optionalTrimmedString(),
  requires_signature: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        return value === "true";
      }
      if (typeof value === "boolean") {
        return value;
      }
      return false;
    },
    z.boolean(),
  ),
  expires_at: optionalDateInput,
});

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;
