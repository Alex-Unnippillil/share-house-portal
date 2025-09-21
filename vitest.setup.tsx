import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
import React from "react"

vi.mock("next/image", () => {
  return {
    default: ({ src, alt, onLoadingComplete, fill: _fill, priority: _priority, sizes: _sizes, ...props }: any) => (
      <img
        {...props}
        src={typeof src === "string" ? src : src?.src ?? ""}
        alt={alt}
        onLoad={(event) => {
          if (typeof onLoadingComplete === "function") {
            onLoadingComplete(event.currentTarget as HTMLImageElement)
          }
          if (typeof props.onLoad === "function") {
            props.onLoad(event)
          }
        }}
      />
    ),
  }
})
