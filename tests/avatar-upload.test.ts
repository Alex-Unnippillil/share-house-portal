import { describe, expect, it, vi } from "vitest"

import { buildVariantPathSet, uploadAvatarVariants } from "@/app/account/avatar-helpers"

describe("avatar storage helpers", () => {
  it("uploads cropped avatar variants with predictable file names", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "uploaded" }, error: null })
    const storageFrom = vi.fn(() => ({ upload }))
    const supabase = {
      storage: {
        from: storageFrom,
      },
    } as unknown as Parameters<typeof uploadAvatarVariants>[0]

    const blobs = {
      sm: new Blob(["small"]),
      md: new Blob(["medium"]),
      lg: new Blob(["large"]),
    }

    const result = await uploadAvatarVariants(supabase, "user-123", blobs, "jpg", 1700000000000)

    expect(storageFrom).toHaveBeenCalledWith("avatars")
    expect(upload).toHaveBeenCalledTimes(3)
    expect(upload).toHaveBeenNthCalledWith(
      1,
      "user-123/avatar-1700000000000-sm.jpg",
      blobs.sm,
      expect.objectContaining({ contentType: "image/jpeg", cacheControl: "3600" }),
    )
    expect(upload).toHaveBeenNthCalledWith(
      2,
      "user-123/avatar-1700000000000-md.jpg",
      blobs.md,
      expect.objectContaining({ contentType: "image/jpeg", cacheControl: "3600" }),
    )
    expect(upload).toHaveBeenNthCalledWith(
      3,
      "user-123/avatar-1700000000000-lg.jpg",
      blobs.lg,
      expect.objectContaining({ contentType: "image/jpeg", cacheControl: "3600" }),
    )

    expect(result.defaultPath).toBe("user-123/avatar-1700000000000-md.jpg")
    expect(result.paths).toMatchObject({
      sm: "user-123/avatar-1700000000000-sm.jpg",
      md: "user-123/avatar-1700000000000-md.jpg",
      lg: "user-123/avatar-1700000000000-lg.jpg",
    })
  })

  it("derives sibling variant paths for responsive previews", () => {
    expect(buildVariantPathSet("tenant/avatar-99-md.jpg")).toEqual({
      sm: "tenant/avatar-99-sm.jpg",
      md: "tenant/avatar-99-md.jpg",
      lg: "tenant/avatar-99-lg.jpg",
    })
  })

  it("preserves original extension casing when matching variants", () => {
    expect(buildVariantPathSet("tenant/avatar-01-md.JPG")).toEqual({
      sm: "tenant/avatar-01-sm.JPG",
      md: "tenant/avatar-01-md.JPG",
      lg: "tenant/avatar-01-lg.JPG",
    })
  })

  it("falls back to the provided path for legacy avatars", () => {
    expect(buildVariantPathSet("legacy-avatar.png")).toEqual({
      sm: null,
      md: "legacy-avatar.png",
      lg: null,
    })
  })
})
