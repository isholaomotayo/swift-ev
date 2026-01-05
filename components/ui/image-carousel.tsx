"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Car, Armchair, Settings, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VehicleImage {
    url: string;
    type: string;
}

interface ImageCarouselProps {
    images: VehicleImage[];
    vehicleName: string;
}

const categoryConfig = [
    { type: "exterior", label: "Exterior", icon: Car },
    { type: "interior", label: "Interior", icon: Armchair },
    { type: "engine", label: "Engine", icon: Settings },
    { type: "boot", label: "Boot/Trunk", icon: Package },
    { type: "hero", label: "All", icon: Car },
];

export function ImageCarousel({ images, vehicleName }: ImageCarouselProps) {
    const [activeCategory, setActiveCategory] = useState<string>("hero");
    const [currentIndex, setCurrentIndex] = useState(0);

    // Filter images by category (hero shows all)
    const filteredImages = activeCategory === "hero"
        ? images
        : images.filter(img => img.type === activeCategory);

    // Reset index when category changes
    const handleCategoryChange = (type: string) => {
        setActiveCategory(type);
        setCurrentIndex(0);
    };

    const nextImage = () => {
        if (filteredImages.length > 0) {
            setCurrentIndex((prev) => (prev + 1) % filteredImages.length);
        }
    };

    const prevImage = () => {
        if (filteredImages.length > 0) {
            setCurrentIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
        }
    };

    const currentImage = filteredImages[currentIndex];

    // Get counts per category for badges
    const getCategoryCount = (type: string) => {
        if (type === "hero") return images.length;
        return images.filter(img => img.type === type).length;
    };

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-border/50 group">
                {currentImage ? (
                    <Image
                        src={currentImage.url}
                        alt={`${vehicleName} - ${activeCategory}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                        <Car className="h-16 w-16 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm">No images available</p>
                    </div>
                )}

                {/* Navigation Arrows */}
                {filteredImages.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={prevImage}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={nextImage}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </>
                )}

                {/* Image Counter */}
                {filteredImages.length > 0 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                        {currentIndex + 1} / {filteredImages.length}
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm capitalize">
                    {activeCategory === "hero" ? "All Photos" : activeCategory}
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categoryConfig.map(({ type, label, icon: Icon }) => {
                    const count = getCategoryCount(type);
                    if (count === 0 && type !== "hero") return null;

                    return (
                        <button
                            key={type}
                            onClick={() => handleCategoryChange(type)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                activeCategory === type
                                    ? "bg-electric-blue text-white shadow-lg shadow-electric-blue/30"
                                    : "bg-muted hover:bg-muted/80 text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                activeCategory === type ? "bg-white/20" : "bg-background"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Thumbnail Strip */}
            {filteredImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filteredImages.map((img, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={cn(
                                "relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2",
                                currentIndex === index
                                    ? "border-electric-blue ring-2 ring-electric-blue/30"
                                    : "border-transparent opacity-70 hover:opacity-100"
                            )}
                        >
                            <Image
                                src={img.url}
                                alt={`Thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Export category config for use in upload forms
export const IMAGE_CATEGORIES = categoryConfig.filter(c => c.type !== "hero");
