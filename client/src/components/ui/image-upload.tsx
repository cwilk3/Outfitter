import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ImagePlus, Image, UploadCloud } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ 
  images = [], 
  onChange,
  maxImages = 5
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  // Process files (convert to base64)
  const processFiles = (files: FileList) => {
    if (!files || files.length === 0) return;
    
    // Check if we'd exceed the max images
    if (images.length + files.length > maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images`);
      return;
    }
    
    // Convert to array to iterate
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          onChange([...images, event.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Handlers for drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };
  
  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };
  
  // Remove an image
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image, i) => (
            <div 
              key={i} 
              className="relative group aspect-square rounded-md overflow-hidden border"
            >
              <img 
                src={image} 
                alt={`Uploaded image ${i+1}`}
                className="w-full h-full object-cover" 
              />
              <button
                type="button" 
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload area */}
      {images.length < maxImages && (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 transition-all
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50/50'}
          flex flex-col items-center justify-center text-center`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mb-3">
            {images.length === 0 ? (
              <ImagePlus className="mx-auto h-10 w-10 text-gray-400" />
            ) : (
              <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
            )}
          </div>
          
          <div className="mb-4 space-y-1">
            <p className="text-sm font-medium text-gray-600">
              {images.length === 0 ? 'Add Photos' : 'Add More Photos'}
            </p>
            <p className="text-xs text-gray-500">
              Drag and drop, or click to select files
            </p>
            <p className="text-xs text-gray-500">
              {images.length} of {maxImages} images
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Image className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
          
          <input 
            id="image-upload"
            type="file" 
            multiple 
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}