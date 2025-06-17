import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PostWithUser } from "@shared/schema";
import EventDateOverlay from "@/components/event-date-overlay";

interface ImageGalleryProps {
  post: PostWithUser;
  selectedImage: string;
  onImageChange: (imageUrl: string) => void;
}

export default function ImageGallery({ post, selectedImage, onImageChange }: ImageGalleryProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const { toast } = useToast();

  // Get all images (primary + additional)
  const allImages = [post.primaryPhotoUrl, ...(post.additionalPhotos || [])];
  const currentIndex = allImages.indexOf(selectedImage);

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
    onImageChange(allImages[newIndex]);
  };

  const goToNext = () => {
    const newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
    onImageChange(allImages[newIndex]);
  };

  const getCurrentPhotoData = () => {
    if (currentIndex === 0) return null; // Primary photo has no additional data
    return post.additionalPhotoData?.[currentIndex - 1];
  };

  const photoData = getCurrentPhotoData();

  return (
    <>
      {/* Main Image Display */}
      <div className="relative group">
        <img
          src={selectedImage}
          alt={post.primaryDescription}
          className="w-full max-h-96 object-cover cursor-pointer"
          onClick={() => setShowFullscreen(true)}
        />
        
        {/* Event Date Overlay */}
        {post.isEvent && post.eventDate && (
          <EventDateOverlay
            eventDate={post.eventDate}
            isRecurring={post.isRecurring}
            recurringType={post.recurringType}
          />
        )}
        
        {/* Navigation Controls */}
        {allImages.length > 1 && (
          <>
            <Button
              onClick={goToPrevious}
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={goToNext}
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            
            {/* Image Counter */}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {currentIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
          {allImages.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl}
              alt={`Image ${index + 1}`}
              onClick={() => onImageChange(imageUrl)}
              className={`w-16 h-16 object-cover rounded cursor-pointer flex-shrink-0 transition-all ${
                selectedImage === imageUrl 
                  ? 'ring-2 ring-pinterest-red opacity-100' 
                  : 'opacity-70 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo Data Display */}
      {photoData && (
        <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
          {photoData.link && (
            <a
              href={photoData.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors inline-flex items-center space-x-1 text-sm mb-2"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{photoData.link}</span>
            </a>
          )}
          
          {photoData.description && (
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              {photoData.description}
            </p>
          )}
          
          {photoData.discountCode && (
            <div className="flex items-center justify-between p-2 bg-green-900/20 border border-green-700 rounded">
              <div>
                <span className="text-green-400 font-medium text-xs">Discount Code:</span>
                <span className="ml-2 font-mono text-green-300 font-bold text-sm">{photoData.discountCode}</span>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(photoData.discountCode || '');
                  toast({ title: "Copied!", description: "Discount code copied to clipboard" });
                }}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-green-400 border-green-600 hover:bg-green-800/20"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-6xl w-full h-full bg-black/95 border-none p-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              onClick={() => setShowFullscreen(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <img
              src={selectedImage}
              alt={post.primaryDescription}
              className="max-w-full max-h-full object-contain"
            />
            
            {allImages.length > 1 && (
              <>
                <Button
                  onClick={goToPrevious}
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  onClick={goToNext}
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}