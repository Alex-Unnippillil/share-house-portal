import Image, { type ImageProps } from "next/image"

type MdxImageProps = Omit<ImageProps, "alt"> & {
  alt?: string
}

export function MdxImage({ alt = "", sizes, ...props }: MdxImageProps) {
  if (
    process.env.NODE_ENV !== "production" &&
    props.width == null &&
    props.height == null &&
    !props.fill
  ) {
    const src = typeof props.src === "string" ? props.src : props.src.src
    // eslint-disable-next-line no-console
    console.warn(
      `MdxImage for "${src}" is missing width and height. Provide explicit dimensions or enable the fill layout.`,
    )
  }

  return <Image {...props} alt={alt} sizes={sizes ?? "100vw"} />
}
