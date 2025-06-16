import { useState } from "react";
import { Upload, FileImage, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface MediaProcessorProps {
  onFileProcessed: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

interface ProcessingStatus {
  status: 'idle' | 'processing' | 'success' | 'error';
  progress: number;
  message: string;
}

export default function MediaProcessor({ 
  onFileProcessed, 
  accept = "image/*", 
  maxSizeMB = 10,
  className = ""
}: MediaProcessorProps) {
  const [processing, setProcessing] = useState<ProcessingStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const { toast } = useToast();

  const processImageFile = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }

        // Calculate optimal dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        // Update progress
        setProcessing(prev => ({ ...prev, progress: 25, message: 'Calculating dimensions...' }));

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Update progress
        setProcessing(prev => ({ ...prev, progress: 50, message: 'Resizing image...' }));

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Update progress
        setProcessing(prev => ({ ...prev, progress: 75, message: 'Optimizing quality...' }));

        // Try different quality levels
        let quality = 0.9;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            // Update progress
            setProcessing(prev => ({ ...prev, progress: 90, message: 'Finalizing...' }));

            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              const outputFormat = file.type === 'image/png' && blob.size < file.size ? 'image/png' : 'image/jpeg';
              const extension = outputFormat === 'image/jpeg' ? '.jpg' : '.png';
              
              const processedFile = new File([blob], 
                file.name.replace(/\.[^/.]+$/, '') + extension, 
                { type: outputFormat }
              );

              // Update progress
              setProcessing(prev => ({ 
                ...prev, 
                progress: 100, 
                message: `Optimized from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(blob.size / 1024 / 1024).toFixed(1)}MB`
              }));

              setTimeout(() => {
                setProcessing({ status: 'success', progress: 100, message: 'Image processed successfully!' });
                resolve(processedFile);
              }, 500);
            } else {
              quality -= 0.1;
              setProcessing(prev => ({ 
                ...prev, 
                message: `Compressing... (${Math.round(quality * 100)}% quality)`
              }));
              setTimeout(tryCompress, 100);
            }
          }, 'image/jpeg', quality);
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    setProcessing({ status: 'processing', progress: 0, message: 'Starting processing...' });

    try {
      const processedFile = await processImageFile(file);
      
      setTimeout(() => {
        setProcessing({ status: 'idle', progress: 0, message: '' });
        onFileProcessed(processedFile);
        
        toast({
          title: "Image processed successfully",
          description: `File optimized and ready for upload`,
        });
      }, 1000);
      
    } catch (error: any) {
      setProcessing({ status: 'error', progress: 0, message: error.message });
      
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });

      setTimeout(() => {
        setProcessing({ status: 'idle', progress: 0, message: '' });
      }, 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getStatusIcon = () => {
    switch (processing.status) {
      case 'processing':
        return <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-400" />;
      default:
        return <FileImage className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (processing.status) {
      case 'processing':
        return 'border-blue-400 bg-blue-400/10';
      case 'success':
        return 'border-green-400 bg-green-400/10';
      case 'error':
        return 'border-red-400 bg-red-400/10';
      default:
        return 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${getStatusColor()}
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={processing.status === 'processing'}
        />

        <div className="space-y-4">
          {getStatusIcon()}
          
          <div>
            <h3 className="text-lg font-medium text-white">
              {processing.status === 'processing' ? 'Processing Image...' :
               processing.status === 'success' ? 'Processing Complete!' :
               processing.status === 'error' ? 'Processing Failed' :
               'Upload Image'}
            </h3>
            
            <p className="text-sm text-gray-400 mt-2">
              {processing.message || 
               `Drag and drop an image here, or click to select. Max size: ${maxSizeMB}MB`}
            </p>
          </div>

          {processing.status === 'processing' && (
            <div className="w-full max-w-xs mx-auto">
              <Progress value={processing.progress} className="h-2" />
              <p className="text-xs text-gray-400 mt-1">{processing.progress}% complete</p>
            </div>
          )}

          {processing.status === 'idle' && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          )}
        </div>
      </div>

      {processing.status === 'success' && (
        <div className="text-center text-sm text-green-400">
          ✓ Image ready for upload - optimized for web performance
        </div>
      )}
    </div>
  );
}