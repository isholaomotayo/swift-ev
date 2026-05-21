"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { isNextImageOptimizable } from "@/lib/remote-image";

export type RemoteImageProps = ImageProps;

/**
 * Renders next/image for configured hosts; falls back to <img> for arbitrary URLs
 * (e.g. example.com placeholders, vendor-provided image links).
 */
export const RemoteImage = ({ src, alt, className, fill, priority, sizes, ...rest }: RemoteImageProps) => {
  const srcString = typeof src === "string" ? src : "";

  if (!srcString) return null;

  if (isNextImageOptimizable(srcString)) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        fill={fill}
        priority={priority}
        sizes={sizes}
        {...rest}
      />
    );
  }

  const imgClassName = cn(fill && "absolute inset-0 h-full w-full", className);

  return (
    <img
      src={srcString}
      alt={alt}
      className={imgClassName}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
};
