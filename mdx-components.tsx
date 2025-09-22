import type { MDXComponents } from "mdx/types"

import { MdxImage } from "@/components/media/mdx-image"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    img: MdxImage,
  }
}
