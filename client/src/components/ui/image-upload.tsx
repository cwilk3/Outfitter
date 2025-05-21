import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  onImageSelected: (imageUrl: string) => void;
  currentImageUrl?: string;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

export function ImageUpload({
  onImageSelected,
  currentImageUrl,
  maxSizeMB = 1,
  maxWidthOrHeight = 1024
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file (JPEG, PNG, etc.)');
        return;
      }

      // Compress image
      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      // Convert to data URL for preview and storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        onImageSelected(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      setErrorMessage('Failed to process image. Please try again.');
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageSelected('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        {previewUrl ? (
          <div className="relative w-full">
            <div className="relative rounded-md overflow-hidden border border-border w-full h-48">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-70 hover:opacity-100"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center w-full h-48 cursor-pointer hover:border-primary transition-colors"
          >
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Click to upload an image
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF (max: {maxSizeMB}MB)
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        
        {!previewUrl && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1"
          >
            <Upload className="h-4 w-4 mr-1" />
            Select Image
          </Button>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive mt-2">{errorMessage}</p>
      )}
      
      {isUploading && (
        <p className="text-sm text-muted-foreground">Processing image...</p>
      )}
    </div>
  );
}