/**
 * Safely gets the first image from an experience's images property,
 * handling different possible data formats
 */
export function getFirstImage(images: any): string | undefined {
  // If images is null or undefined
  if (!images) return undefined;
  
  // If images is an array with at least one item
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }
  
  // If images is a JSON string
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    } catch (e) {
      // If it's a single image URL as string
      if (images.match(/^(http|https|data):/) || images.startsWith('/')) {
        return images;
      }
    }
  }
  
  return undefined;
}

/**
 * Safely converts any type of image data into a normalized array of image URLs
 */
export function normalizeImageArray(imageInput: any): string[] {
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
}