import React, { useState } from 'react';
import { ImagePlus, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

// Simple base64 image conversion
const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export function LocationImageUpload({ images, onChange, maxImages = 5 }: LocationImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  
  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    
    const newImages = [...images];
    const availableSlots = maxImages - newImages.length;
    
    if (availableSlots <= 0) {
      alert(`Maximum of ${maxImages} images allowed`);
      return;
    }
    
    const filesToProcess = Math.min(availableSlots, files.length);
    
    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      try {
        const base64 = await toBase64(file);
        newImages.push(base64);
      } catch (error) {
        console.error('Error converting image to base64:', error);
      }
    }
    
    onChange(newImages);
  };
  
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };
  
  // Drag and drop handlers
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
      handleFileChange(e.dataTransfer.files);
    }
  };
  
  return (
    <div className="space-y-4 w-full">
      {/* Upload area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer min-h-[150px] transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => handleFileChange((e.target as HTMLInputElement).files);
          input.click();
        }}
      >
        <ImagePlus className="h-10 w-10 mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drag images here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          {images.length} of {maxImages} images
        </p>
      </div>
      
      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <img 
                src={image} 
                alt={`Location image ${index + 1}`} 
                className="w-full h-full object-cover rounded-md" 
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}