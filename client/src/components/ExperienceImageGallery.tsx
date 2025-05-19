import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ExperienceImageGalleryProps {
  images?: string[];
  className?: string;
}

export function ExperienceImageGallery({ images = [], className = "" }: ExperienceImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Default placeholder if no images are provided
  const defaultImage = "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?q=80&w=1470&auto=format&fit=crop";
  
  // Normalize the images array to handle different possible formats
  const normalizeImageArray = (imageInput: any): string[] => {
    // If it's null or undefined, return empty array
    if (!imageInput) return [];
    
    // If it's already an array, use it
    if (Array.isArray(imageInput)) {
      // Filter out any empty or invalid items
      return imageInput.filter(img => !!img && typeof img === 'string');
    }
    
    // If it's a string but not an array (could be JSON string), try to parse it
    if (typeof imageInput === 'string') {
      try {
        const parsed = JSON.parse(imageInput);
        if (Array.isArray(parsed)) {
          return parsed.filter(img => !!img && typeof img === 'string');
        }
      } catch (e) {
        // If it's a single image URL as string, return it as an array
        if (imageInput.match(/^(http|https|data):/) || imageInput.startsWith('/')) {
          return [imageInput];
        }
      }
    }
    
    // Default fallback
    return [];
  };
  
  // Ensure we have at least one image
  const normalizedImages = normalizeImageArray(images).length > 0 
    ? normalizeImageArray(images) 
    : [defaultImage];
  
  // When images prop changes, reset selected index
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [images]);
  
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  
  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % normalizedImages.length);
  };
  
  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, normalizedImages.length]);
  
  if (normalizedImages.length === 0) return null;
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main featured image */}
      <div 
        className="relative w-full rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] cursor-pointer transition-all hover:brightness-90"
        onClick={() => openLightbox(selectedImageIndex)}
      >
        <img 
          src={normalizedImages[selectedImageIndex]} 
          alt="Experience featured image" 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {normalizedImages.slice(0, 4).map((image, index) => (
            <div 
              key={index}
              className={`aspect-square rounded-md overflow-hidden cursor-pointer transition-all hover:opacity-80 ${
                index === selectedImageIndex ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <img 
                src={image} 
                alt={`Experience image ${index + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Image count indicator (if more than 4 images) */}
      {normalizedImages.length > 4 && (
        <div className="text-xs text-right text-gray-500">
          +{normalizedImages.length - 4} more photos
        </div>
      )}
      
      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative h-screen max-h-[80vh] flex items-center justify-center p-4">
            <DialogClose className="absolute top-2 right-2 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={prevImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <img 
              src={normalizedImages[lightboxIndex]} 
              alt="Experience fullscreen image" 
              className="max-h-full max-w-full object-contain"
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {lightboxIndex + 1} / {normalizedImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}