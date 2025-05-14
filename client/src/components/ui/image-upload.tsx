import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ 
  images, 
  onChange, 
  maxImages = 5 
}: ImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  
  const handleDragLeave = () => {
    setDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    if (images.length >= maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }
    
    const newImagesCount = Math.min(files.length, maxImages - images.length);
    const newImages: string[] = [];
    
    for (let i = 0; i < newImagesCount; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result.toString());
            
            // If we've processed all files, update the state
            if (newImages.length === newImagesCount) {
              onChange([...images, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };
  
  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-gray-300 bg-gray-50/50",
          images.length >= maxImages && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center">
          <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm font-medium mb-1">
            {images.length >= maxImages ? (
              <span className="text-muted-foreground">Maximum images reached</span>
            ) : (
              <span>
                Drag &amp; drop images here or <span className="text-primary">browse</span>
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {images.length} of {maxImages} images
          </p>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={images.length >= maxImages}
        />
      </div>
      
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div 
              key={index} 
              className="relative group aspect-square overflow-hidden rounded-md border"
            >
              <img 
                src={img} 
                alt={`Uploaded image ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}