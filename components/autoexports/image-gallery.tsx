"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  alt: string;
  type?: "hero" | "exterior" | "interior" | "damage" | "document" | "vin_plate";
}

interface ImageGalleryProps {
  images: GalleryImage[];
  vehicleTitle?: string;
  className?: string;
}

export function ImageGallery({
  images,
  vehicleTitle = "Vehicle",
  className,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={cn("relative aspect-[4/3] bg-muted rounded-lg flex items-center justify-center", className)}>
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const totalImages = images.length;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape" && isZoomed) setIsZoomed(false);
  };

  return (
    <>
      <div className={cn("space-y-4", className)} onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Main Image Display */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted group">
          <Image
            src={currentImage.url}
            alt={currentImage.alt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 800px"
          />

          {/* Image Counter */}
          <div className="absolute top-4 right-4 bg-carbon-black/80 text-white px-3 py-1.5 rounded-full text-sm font-mono backdrop-blur-sm">
            {currentIndex + 1} / {totalImages}
          </div>

          {/* Zoom Button */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
            onClick={() => setIsZoomed(true)}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>

          {/* Navigation Arrows (only show if more than 1 image) */}
          {totalImages > 1 && (
            <>
              <Button
                size="icon"
                variant="secondary"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
                onClick={goToPrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
                onClick={goToNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail Strip (only show if more than 1 image) */}
        {totalImages > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={cn(
                  "relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-md overflow-hidden border-2 transition-all",
                  currentIndex === index
                    ? "border-electric-blue ring-2 ring-electric-blue/20"
                    : "border-transparent hover:border-muted-foreground/50"
                )}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
                {/* Image Type Badge */}
                {image.type && (
                  <div className="absolute bottom-1 left-1 bg-carbon-black/80 text-white px-1.5 py-0.5 rounded text-xs font-medium backdrop-blur-sm">
                    {image.type === "hero" && "Main"}
                    {image.type === "exterior" && "Ext"}
                    {image.type === "interior" && "Int"}
                    {image.type === "damage" && "Dmg"}
                    {image.type === "document" && "Doc"}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom Dialog */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-carbon-black/95 border-none">
          <div className="relative w-full h-[95vh]">
            <Image
              src={currentImage.url}
              alt={currentImage.alt}
              fill
              className="object-contain"
              sizes="95vw"
            />

            {/* Close Button */}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4 bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
              onClick={() => setIsZoomed(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-carbon-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm">
              <p className="text-sm font-mono">
                {currentIndex + 1} / {totalImages} - {vehicleTitle}
              </p>
            </div>

            {/* Navigation in Zoom View */}
            {totalImages > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-carbon-black/80 hover:bg-carbon-black text-white backdrop-blur-sm"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
