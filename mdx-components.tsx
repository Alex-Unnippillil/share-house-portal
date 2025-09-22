import type { ComponentProps } from "react"

import type { MDXComponents } from "mdx/types"

import { MdxImage } from "@/components/mdx/image"

type MdxImageProps = ComponentProps<typeof MdxImage>

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    img: (props) => <MdxImage {...(props as MdxImageProps)} />,
    Image: (props) => <MdxImage {...(props as MdxImageProps)} />,
  }
}
