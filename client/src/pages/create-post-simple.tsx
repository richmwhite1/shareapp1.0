import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, ExternalLink, Plus, FolderPlus, Download, LinkIcon, Hash, Users, Lock, Globe, Calendar, CheckSquare, Repeat, CalendarPlus } from "lucide-react";
import { DayPicker } from 'react-day-picker';

import MediaProcessor from "@/components/media-processor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuthToken } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";
import 'react-day-picker/dist/style.css';

export default function CreatePostPage() {
  const [formData, setFormData] = useState({
    primaryLink: "",
    primaryDescription: "",
    discountCode: "",
    categoryId: "", // Will be set when categories load
    spotifyUrl: "",
    youtubeUrl: "",
    hashtags: "",
    privacy: "public"
  });

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [taggedUsers, setTaggedUsers] = useState<number[]>([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);

  // Event functionality state
  const [isEvent, setIsEvent] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("12:00");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reminders, setReminders] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<"weekly" | "monthly" | "annually" | "">("");
  const [taskList, setTaskList] = useState<{id: string, text: string, completed: boolean, completedBy?: number}[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [allowRsvp, setAllowRsvp] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Calendar integration functions
  const generateCalendarUrl = (type: 'google' | 'apple') => {
    if (!selectedDate || !eventTime) return '';
    
    const eventDateTime = new Date(selectedDate);
    const [hours, minutes] = eventTime.split(':');
    eventDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const startDate = eventDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(eventDateTime.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const title = encodeURIComponent(formData.primaryDescription.substring(0, 50));
    const details = encodeURIComponent(formData.primaryDescription);
    
    if (type === 'google') {
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
    } else {
      // Apple Calendar (webcal format)
      return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${formData.primaryDescription.substring(0, 50)}
DESCRIPTION:${formData.primaryDescription}
END:VEVENT
END:VCALENDAR`;
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const eventDateTime = new Date(date);
      const [hours, minutes] = eventTime.split(':');
      eventDateTime.setHours(parseInt(hours), parseInt(minutes));
      setEventDate(eventDateTime.toISOString());
    } else {
      setEventDate('');
    }
  };

  // Hashtag handling functions
  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').toLowerCase().trim();
    if (cleanTag && !hashtags.includes(cleanTag) && hashtags.length < 10) {
      setHashtags(prev => [...prev, cleanTag]);
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const handleHashtagInputChange = (value: string) => {
    setHashtagInput(value);
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hashtagInput.trim()) {
        addHashtag(hashtagInput.trim());
        setHashtagInput('');
      }
    }
  };

  // Event handling functions
  const toggleReminder = (reminder: string) => {
    setReminders(prev => 
      prev.includes(reminder) 
        ? prev.filter(r => r !== reminder)
        : [...prev, reminder]
    );
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false
      };
      setTaskList(prev => [...prev, newTask]);
      setNewTaskText("");
    }
  };

  const removeTask = (taskId: string) => {
    setTaskList(prev => prev.filter(task => task.id !== taskId));
  };

  const toggleTaskComplete = (taskId: string) => {
    setTaskList(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  // Privacy and friend tagging functions
  const handlePrivacyChange = (privacy: string) => {
    setFormData(prev => ({ ...prev, privacy }));
    if (privacy !== 'private') {
      setTaggedUsers([]);
    }
  };

  const toggleFriendTag = (friendId: number) => {
    setTaggedUsers(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const getTaggedFriendNames = () => {
    return taggedUsers
      .map(id => friends.find((friend: any) => friend.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const parseHashtagsFromText = (text: string) => {
    // Auto-recognize hashtags from a string of words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (cleanWord && !hashtags.includes(cleanWord) && hashtags.length < 10) {
        addHashtag(cleanWord);
      }
    });
  };

  // Image processing utilities
  const resizeImage = (file: File, maxSizeMB: number = 5): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      const img = document.createElement('img');
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxDimension = 2048; // Maximum width or height
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with high quality and reduce if needed
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }
            
            const sizeMB = blob.size / (1024 * 1024);
            
            if (sizeMB <= maxSizeMB || quality <= 0.1) {
              // Convert to appropriate format
              const extension = file.name.split('.').pop()?.toLowerCase();
              const outputFormat = ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '') ? 
                `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg';
              
              const processedFile = new File([blob], 
                file.name.replace(/\.[^/.]+$/, '') + (outputFormat === 'image/jpeg' ? '.jpg' : '.png'), 
                { type: outputFormat }
              );
              
              resolve(processedFile);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processImageFile = async (file: File): Promise<File> => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      // Try to process as image anyway for web images
      try {
        return await resizeImage(file);
      } catch {
        throw new Error('Please upload a valid image file (PNG, JPEG, GIF, WebP)');
      }
    }
    
    const sizeMB = file.size / (1024 * 1024);
    
    // If image is under 5MB and in a standard format, return as-is
    if (sizeMB <= 5 && ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      return file;
    }
    
    // Resize/compress the image
    return await resizeImage(file);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null
        })
      });
      
      if (response.ok) {
        const newCategory = await response.json();
        setFormData(prev => ({ ...prev, categoryId: newCategory.id.toString() }));
        setNewCategoryName('');
        setNewCategoryDescription('');
        setShowNewCategoryDialog(false);
        // Refetch categories
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };
  
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<{ file: File; link: string; description: string; discountCode: string }[]>([]);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [additionalPhotoPreviews, setAdditionalPhotoPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  
  const primaryFileRef = useRef<HTMLInputElement>(null);
  const additionalFileRef = useRef<HTMLInputElement>(null);
  
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Fetch user's friends for privacy tagging
  const { data: friends = [] } = useQuery({
    queryKey: ['/api/friends'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Set default category to user's "General" category when categories load
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0 && !formData.categoryId) {
      const generalCategory = categories.find((cat: any) => cat.name === 'General');
      if (generalCategory) {
        setFormData(prev => ({ ...prev, categoryId: generalCategory.id.toString() }));
      } else if (categories.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: categories[0].id.toString() }));
      }
    }
  }, [categories, formData.categoryId]);

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: typeof newCategoryData) => {
      const token = getAuthToken();
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create category');
      }

      return response.json();
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setFormData(prev => ({ ...prev, categoryId: newCategory.id.toString() }));
      setNewCategoryData({ name: "", description: "", isPublic: false });
      setShowNewCategoryDialog(false);
      toast({
        title: "Category Created",
        description: `${newCategory.name} category has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle primary photo selection
  const handlePrimaryPhotoChange = async (file: File | null) => {
    if (!file) return;

    try {
      const processedFile = await processImageFile(file);
      setPrimaryPhoto(processedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedFile);

      // Show success message if image was processed
      const originalSizeMB = file.size / (1024 * 1024);
      const processedSizeMB = processedFile.size / (1024 * 1024);
      
      if (originalSizeMB > 5 || file.name !== processedFile.name) {
        toast({
          title: "Image processed",
          description: `Image optimized from ${originalSizeMB.toFixed(1)}MB to ${processedSizeMB.toFixed(1)}MB`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error processing image",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle additional photos selection
  const handleAdditionalPhotosChange = async (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      
      for (const file of newFiles) {
        if (additionalPhotos.length >= 4) break;
        
        try {
          const processedFile = await processImageFile(file);
          
          const newPhoto = {
            file: processedFile,
            link: '',
            description: '',
            discountCode: ''
          };
          
          setAdditionalPhotos(prev => [...prev, newPhoto]);
          
          // Generate preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setAdditionalPhotoPreviews(prev => [...prev, e.target?.result as string]);
          };
          reader.readAsDataURL(processedFile);

          // Show success message if image was processed
          const originalSizeMB = file.size / (1024 * 1024);
          const processedSizeMB = processedFile.size / (1024 * 1024);
          
          if (originalSizeMB > 5 || file.name !== processedFile.name) {
            toast({
              title: "Image processed",
              description: `Additional image optimized from ${originalSizeMB.toFixed(1)}MB to ${processedSizeMB.toFixed(1)}MB`,
            });
          }
        } catch (error: any) {
          toast({
            title: "Error processing image",
            description: `Failed to process ${file.name}: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    }
  };

  // Update additional photo data
  const updateAdditionalPhotoData = (index: number, field: 'link' | 'description' | 'discountCode', value: string) => {
    const updatedPhotos = [...additionalPhotos];
    updatedPhotos[index] = { ...updatedPhotos[index], [field]: value };
    setAdditionalPhotos(updatedPhotos);
  };

  // Fetch image from URL for additional photos
  const fetchImageForAdditionalPhoto = async (index: number, url: string) => {
    if (!url.trim()) return;

    try {
      const response = await fetch('/api/scrape-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      // Get the image blob directly from the response
      const blob = await response.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: blob.type });
      
      // Update the photo at the specific index
      const updatedPhotos = [...additionalPhotos];
      updatedPhotos[index] = { ...updatedPhotos[index], file };
      setAdditionalPhotos(updatedPhotos);
      
      // Update preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const updatedPreviews = [...additionalPhotoPreviews];
        updatedPreviews[index] = e.target?.result as string;
        setAdditionalPhotoPreviews(updatedPreviews);
      };
      reader.readAsDataURL(file);

      toast({
        title: "Image fetched!",
        description: "The image has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error fetching image",
        description: "Could not fetch the image from the URL. Please try uploading manually.",
        variant: "destructive",
      });
    }
  };

  // Handle URL paste detection for additional photos (no auto-fetch)
  const handleAdditionalPhotoUrlPaste = (index: number, value: string) => {
    updateAdditionalPhotoData(index, 'link', value);
  };

  // Add new photo entry with empty fields
  const addNewPhotoEntry = () => {
    if (additionalPhotos.length >= 4) return; // Max 4 additional photos
    
    const placeholderFile = new File([''], 'placeholder.jpg', { type: 'image/jpeg' });
    const newPhotoData = { file: placeholderFile, link: '', description: '', discountCode: '' };
    const updatedPhotos = [...additionalPhotos, newPhotoData];
    setAdditionalPhotos(updatedPhotos);
    
    // Add placeholder preview
    const placeholderPreview = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiPk5vIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
    const newPreviews = [...additionalPhotoPreviews, placeholderPreview];
    setAdditionalPhotoPreviews(newPreviews);
  };

  // Remove additional photo
  const removeAdditionalPhoto = (index: number) => {
    const newFiles = additionalPhotos.filter((_, i) => i !== index);
    const newPreviews = additionalPhotoPreviews.filter((_, i) => i !== index);
    setAdditionalPhotos(newFiles);
    setAdditionalPhotoPreviews(newPreviews);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePrimaryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePrimaryPhotoChange(files[0]);
    }
  };

  const handleAdditionalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAdditionalPhotosChange(files);
    }
  };

  // Auto-fetch image from media URLs
  const fetchImageFromMediaUrl = async (url: string, type: 'spotify' | 'youtube') => {
    if (!url.trim()) return;

    setIsFetchingImage(true);
    try {
      let imageUrls: string[] = [];
      
      if (type === 'youtube') {
        // Extract YouTube video ID from various formats including Shorts
        const videoMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (videoMatch) {
          const videoId = videoMatch[1];
          // Try different YouTube thumbnail qualities
          imageUrls = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/default.jpg`
          ];
        }
      } else if (type === 'spotify') {
        // For Spotify, use web scraping to get album artwork
        // We'll let the backend handle this since it can bypass CORS
        imageUrls = [url]; // Pass the Spotify URL directly to backend for scraping
      }

      if (imageUrls.length > 0) {
        setAvailableImages(imageUrls);
        setCurrentImageIndex(0);
        
        // Try to fetch the first working image
        let successfulFetch = false;
        for (const imageUrl of imageUrls) {
          try {
            const response = await fetch('/api/scrape-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
              },
              body: JSON.stringify({ url: imageUrl }),
            });

            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], `${type}-thumbnail.jpg`, { type: blob.type });
              
              handlePrimaryPhotoChange(file);
              
              toast({
                title: "Media thumbnail fetched",
                description: `The ${type} thumbnail has been loaded as your primary image`,
              });
              successfulFetch = true;
              break;
            }
          } catch (err) {
            // Try next image URL
            continue;
          }
        }
        
        if (!successfulFetch) {
          throw new Error(`Could not fetch any thumbnail from ${type} URL`);
        }
      } else {
        throw new Error(`Invalid ${type} URL format`);
      }
    } catch (error: any) {
      toast({
        title: "Failed to fetch media thumbnail",
        description: error.message || `Could not fetch thumbnail from ${type} URL`,
        variant: "destructive",
      });
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Cycle through available images for current URL
  const cycleToNextImage = async () => {
    if (availableImages.length <= 1) return;
    
    const nextIndex = (currentImageIndex + 1) % availableImages.length;
    setCurrentImageIndex(nextIndex);
    
    setIsFetchingImage(true);
    try {
      const response = await fetch('/api/scrape-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ url: availableImages[nextIndex] }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch next image');
      }

      const blob = await response.blob();
      const file = new File([blob], 'cycled-image.jpg', { type: blob.type });
      
      handlePrimaryPhotoChange(file);
      
      toast({
        title: "Image updated",
        description: `Showing image ${nextIndex + 1} of ${availableImages.length}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to fetch next image",
        description: error.message || "Could not fetch the next available image",
        variant: "destructive",
      });
    } finally {
      setIsFetchingImage(false);
    }
  };

  // URL scraping functionality
  const fetchImageFromUrl = async () => {
    if (!formData.primaryLink.trim()) {
      toast({
        title: "No URL provided",
        description: "Please enter a URL first",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingImage(true);
    try {
      const response = await fetch('/api/scrape-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ url: formData.primaryLink }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }

      const blob = await response.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: blob.type });
      
      handlePrimaryPhotoChange(file);
      
      toast({
        title: "Image fetched successfully",
        description: "The main image from the URL has been loaded",
      });
    } catch (error: any) {
      toast({
        title: "Failed to fetch image",
        description: error.message || "Could not fetch image from the provided URL",
        variant: "destructive",
      });
    } finally {
      setIsFetchingImage(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Validate that at least one URL is provided
      if (!formData.primaryLink && !formData.spotifyUrl && !formData.youtubeUrl) {
        throw new Error("At least one URL (Primary Link, Spotify, or YouTube) is required");
      }

      // The backend will auto-fetch media thumbnails if no primary photo is uploaded

      const formDataToSend = new FormData();
      if (formData.primaryLink) {
        formDataToSend.append('primaryLink', formData.primaryLink);
      }
      formDataToSend.append('primaryDescription', formData.primaryDescription);
      if (formData.discountCode) {
        formDataToSend.append('discountCode', formData.discountCode);
      }
      if (formData.spotifyUrl) {
        formDataToSend.append('spotifyUrl', formData.spotifyUrl);
      }
      if (formData.youtubeUrl) {
        formDataToSend.append('youtubeUrl', formData.youtubeUrl);
      }
      // Add hashtags as a formatted string
      if (hashtags.length > 0) {
        const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
        formDataToSend.append('hashtags', hashtagString);
      }
      if (primaryPhoto) {
        formDataToSend.append('primaryPhoto', primaryPhoto);
      }
      formDataToSend.append('categoryId', formData.categoryId);
      
      // Add privacy settings
      formDataToSend.append('privacy', formData.privacy);
      
      // Add tagged users for private posts
      if (formData.privacy === 'private' && taggedUsers.length > 0) {
        formDataToSend.append('taggedUsers', JSON.stringify(taggedUsers));
      }

      // Add event data
      formDataToSend.append('isEvent', isEvent.toString());
      if (isEvent) {
        if (eventDate) {
          formDataToSend.append('eventDate', eventDate);
        }
        if (reminders.length > 0) {
          formDataToSend.append('reminders', JSON.stringify(reminders));
        }
        formDataToSend.append('isRecurring', isRecurring.toString());
        if (isRecurring && recurringType) {
          formDataToSend.append('recurringType', recurringType);
        }
        if (taskList.length > 0) {
          formDataToSend.append('taskList', JSON.stringify(taskList));
        }
        formDataToSend.append('allowRsvp', allowRsvp.toString());
      }
      
      additionalPhotos.forEach((photoData, index) => {
        formDataToSend.append('additionalPhotos', photoData.file);
        formDataToSend.append(`additionalPhotoLink_${index}`, photoData.link);
        formDataToSend.append(`additionalPhotoDescription_${index}`, photoData.description);
        formDataToSend.append(`additionalPhotoDiscountCode_${index}`, photoData.discountCode);
      });

      const token = getAuthToken();
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Created!",
        description: "Your post has been shared successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one URL type is provided
    const hasAnyUrl = formData.primaryLink || formData.spotifyUrl || formData.youtubeUrl;
    
    if (!hasAnyUrl) {
      toast({
        title: "Missing Required Fields",
        description: "At least one URL (Primary Link, Spotify, or YouTube) is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.primaryDescription) {
      toast({
        title: "Missing Required Fields",
        description: "Please provide a description for your post.",
        variant: "destructive",
      });
      return;
    }

    // For media-only posts (Spotify/YouTube), photo will be auto-fetched by backend
    // For primary link posts, require either uploaded photo or auto-fetch
    if (formData.primaryLink && !primaryPhoto && !formData.spotifyUrl && !formData.youtubeUrl) {
      toast({
        title: "Missing Required Fields",
        description: "Please upload a primary photo or use the fetch button for your link.",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation for primary link if provided
    if (formData.primaryLink) {
      try {
        new URL(formData.primaryLink);
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL for the primary link.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    mutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full bg-black px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-center text-pinterest-gray">
                Please sign in to create a post.
              </p>
              <Button 
                onClick={() => setLocation('/auth')}
                className="w-full mt-4 bg-pinterest-red hover:bg-red-700"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black">
      <div className="w-full px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-card border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-pinterest-red flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Create New Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Primary Link */}
              <div>
                <Label htmlFor="primaryLink">Link URL (Optional if Spotify/YouTube provided)</Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="primaryLink"
                    type="url"
                    placeholder="https://example.com"
                    className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                    value={formData.primaryLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryLink: e.target.value }))}
                  />
                  <div className="absolute right-2 top-1.5 flex space-x-1">
                    <Button
                      type="button"
                      onClick={fetchImageFromUrl}
                      disabled={isFetchingImage || !formData.primaryLink.trim()}
                      className="h-8 w-8 p-0 bg-pinterest-red hover:bg-red-600"
                      title="Fetch image from URL"
                    >
                      <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                    </Button>
                    {availableImages.length > 1 && (
                      <Button
                        type="button"
                        onClick={cycleToNextImage}
                        disabled={isFetchingImage}
                        className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                        title={`Next image (${currentImageIndex + 1}/${availableImages.length})`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the download icon to automatically fetch the main image from the URL
                </p>
              </div>

              {/* Primary Description */}
              <div>
                <Label htmlFor="primaryDescription">Description *</Label>
                <Textarea
                  id="primaryDescription"
                  placeholder="Describe what you're sharing..."
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent bg-input text-foreground border-border"
                  rows={3}
                  value={formData.primaryDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryDescription: e.target.value }))}
                  required
                />
              </div>

              {/* Hashtags */}
              <div>
                <Label htmlFor="hashtags">Hashtags ({hashtags.length}/10)</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="hashtags"
                      type="text"
                      placeholder="Type hashtags and press Enter or Space (travel food style)"
                      className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent pl-10"
                      value={hashtagInput}
                      onChange={(e) => handleHashtagInputChange(e.target.value)}
                      onKeyDown={handleHashtagKeyDown}
                      disabled={hashtags.length >= 10}
                    />
                  </div>
                  
                  {/* Hashtag Chips */}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                      {hashtags.map((tag, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-pinterest-red text-white px-2 py-1 rounded-full text-sm"
                        >
                          <Hash className="h-3 w-3" />
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeHashtag(tag)}
                            className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  

                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type hashtags individually (with or without #) and press Enter/Space to add them
                </p>
              </div>

              {/* Privacy Settings & Category - More Discreet */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Label htmlFor="privacy" className="text-sm">Privacy</Label>
                    <Select
                      value={formData.privacy}
                      onValueChange={(value) => handlePrivacyChange(value as 'public' | 'friends' | 'private')}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="friends">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            Friends
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-3 w-3" />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm">Category</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                      >
                        <SelectTrigger className="w-40 h-8 text-sm bg-input border-border">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {Array.isArray(categories) && categories.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <FolderPlus className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Create New Category</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="categoryName">Category Name *</Label>
                              <Input
                                id="categoryName"
                                placeholder="e.g., Christmas, Travel, Recipes"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="bg-input border-border"
                              />
                            </div>
                            <div>
                              <Label htmlFor="categoryDescription">Description (Optional)</Label>
                              <Textarea
                                id="categoryDescription"
                                placeholder="Describe this category..."
                                value={newCategoryDescription}
                                onChange={(e) => setNewCategoryDescription(e.target.value)}
                                className="bg-input border-border"
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewCategoryDialog(false)}
                                className="border-border"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleCreateCategory}
                                disabled={!newCategoryName.trim() || mutation.isPending}
                                className="bg-pinterest-red hover:bg-red-700 text-white"
                              >
                                {mutation.isPending ? 'Creating...' : 'Create Category'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {formData.privacy === 'private' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFriendSelector(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Tag Friends
                    </Button>
                  )}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEvent(!isEvent)}
                  className={`flex items-center space-x-2 text-xs ${isEvent ? 'bg-purple-50 border-purple-300 text-purple-700' : ''}`}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{isEvent ? 'Event Mode' : 'Make Event'}</span>
                </Button>
              </div>
              
              {formData.privacy === 'private' && taggedUsers.length > 0 && (
                <div className="text-xs text-gray-600">
                  Tagged: {getTaggedFriendNames()}
                </div>
              )}

              {/* Event Configuration */}
              {isEvent && (
                <div className="mt-6 p-4 bg-black border border-purple-400 rounded-lg space-y-4">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Event Configuration
                    </h3>

                    {/* Interactive Calendar Date Picker */}
                    <div className="space-y-3">
                      <Label className="text-white">Event Date & Time</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-black text-white border-purple-300 hover:bg-gray-800"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {selectedDate ? selectedDate.toDateString() : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-black border-purple-400" align="start">
                              <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                                className="bg-black text-white"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Input
                            type="time"
                            value={eventTime}
                            onChange={(e) => {
                              setEventTime(e.target.value);
                              if (selectedDate) {
                                const eventDateTime = new Date(selectedDate);
                                const [hours, minutes] = e.target.value.split(':');
                                eventDateTime.setHours(parseInt(hours), parseInt(minutes));
                                setEventDate(eventDateTime.toISOString());
                              }
                            }}
                            className="bg-black text-white border-purple-300 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      {/* Calendar Integration Buttons */}
                      {selectedDate && eventTime && formData.primaryDescription && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(generateCalendarUrl('google'), '_blank')}
                            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                          >
                            <CalendarPlus className="h-4 w-4 mr-1" />
                            Add to Google Calendar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const url = generateCalendarUrl('apple');
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = 'event.ics';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="bg-gray-600 text-white hover:bg-gray-700 border-gray-600"
                          >
                            <CalendarPlus className="h-4 w-4 mr-1" />
                            Download for Apple Calendar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Reminders */}
                    <div>
                      <Label className="text-white">Reminder Notifications</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          { value: "2_weeks", label: "2 weeks before" },
                          { value: "1_week", label: "1 week before" },
                          { value: "2_days", label: "2 days before" },
                          { value: "1_day", label: "1 day before" }
                        ].map((reminder) => (
                          <div key={reminder.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={reminder.value}
                              checked={reminders.includes(reminder.value)}
                              onChange={() => toggleReminder(reminder.value)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <Label htmlFor={reminder.value} className="text-sm text-white">
                              {reminder.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recurring Event */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          id="isRecurring"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor="isRecurring" className="flex items-center gap-2 text-white">
                          <Repeat className="h-4 w-4" />
                          Recurring Event
                        </Label>
                      </div>
                      {isRecurring && (
                        <Select value={recurringType} onValueChange={(value: "weekly" | "monthly" | "annually") => setRecurringType(value)}>
                          <SelectTrigger className="focus:ring-2 focus:ring-purple-500 bg-white">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {isRecurring && formData.privacy === 'public' && (
                        <p className="text-sm text-amber-300 mt-1">
                          Note: Recurring events won't appear in public feed to prevent clutter
                        </p>
                      )}
                    </div>

                    {/* RSVP Option */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowRsvp"
                          checked={allowRsvp}
                          onChange={(e) => setAllowRsvp(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor="allowRsvp" className="flex items-center gap-2 text-white">
                          <Users className="h-4 w-4" />
                          Allow RSVPs
                        </Label>
                      </div>
                      {allowRsvp && (
                        <p className="text-sm text-purple-300 mt-1">
                          People can respond with Going, Maybe, or Not Going
                        </p>
                      )}
                    </div>

                    {/* Task List */}
                    <div>
                      <Label className="text-white">Event Task List</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a task for this event..."
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                            className="focus:ring-2 focus:ring-purple-500 bg-black text-white border-purple-300 placeholder:text-gray-400 dark:bg-black dark:text-white dark:border-purple-300"
                          />
                          <Button
                            type="button"
                            onClick={addTask}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {taskList.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {taskList.map((task) => (
                              <div key={task.id} className="flex items-center gap-2 p-2 bg-black border border-purple-300 rounded">
                                <CheckSquare className="h-4 w-4 text-purple-600" />
                                <span className={`flex-1 text-sm text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>
                                  {task.text}
                                </span>
                                <Button
                                  type="button"
                                  onClick={() => removeTask(task.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Spotify & YouTube URLs side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spotify URL */}
                <div>
                  <Label htmlFor="spotifyUrl">Spotify URL (Optional)</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-3 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <Input
                      id="spotifyUrl"
                      type="url"
                      placeholder="https://open.spotify.com/..."
                      className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                      value={formData.spotifyUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                    />
                    <div className="absolute right-2 top-1.5 flex space-x-1">
                      <Button
                        type="button"
                        onClick={() => fetchImageFromMediaUrl(formData.spotifyUrl, 'spotify')}
                        disabled={isFetchingImage || !formData.spotifyUrl.trim()}
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                        title="Fetch Spotify image"
                      >
                        <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share a Spotify track, album, or playlist
                  </p>
                </div>

                {/* YouTube URL */}
                <div>
                  <Label htmlFor="youtubeUrl">YouTube URL (Optional)</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-3 h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <Input
                      id="youtubeUrl"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    />
                    <div className="absolute right-2 top-1.5 flex space-x-1">
                      <Button
                        type="button"
                        onClick={() => fetchImageFromMediaUrl(formData.youtubeUrl, 'youtube')}
                        disabled={isFetchingImage || !formData.youtubeUrl.trim()}
                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        title="Fetch YouTube thumbnail"
                      >
                        <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share a YouTube video or music
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || mutation.isPending}
                className="w-full bg-pinterest-red hover:bg-red-700 text-white py-3"
              >
                {isLoading || mutation.isPending ? 'Creating Post...' : 'Create Post'}
              </Button>
            </form>

            {/* Friend Selector Dialog */}
              <Dialog open={showFriendSelector} onOpenChange={setShowFriendSelector}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tag Friends</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Array.isArray(friends) && friends.length > 0 ? (
                      friends.map((friend: any) => (
                        <div
                          key={friend.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleFriendTag(friend.id)}
                        >
                          <div className={`w-4 h-4 rounded border-2 ${
                            taggedUsers.includes(friend.id)
                              ? 'bg-pinterest-red border-pinterest-red'
                              : 'border-gray-300'
                          }`}>
                            {taggedUsers.includes(friend.id) && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{friend.name}</div>
                            <div className="text-sm text-gray-500">@{friend.username}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No friends to tag. Add friends first!
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFriendSelector(false)}
                    >
                      Done
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Discount Code */}
              <div>
                <Label htmlFor="discountCode">Discount Code (Optional)</Label>
                <Input
                  id="discountCode"
                  type="text"
                  placeholder="Enter discount code (e.g., SAVE20)"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={formData.discountCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Users can click to copy this code when viewing your post
                </p>
              </div>

              {/* Media URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spotify URL */}
                <div>
                  <Label htmlFor="spotifyUrl">Spotify URL (Optional)</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-3 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.599 0-.36.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.32 11.28-1.08 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <Input
                      id="spotifyUrl"
                      type="url"
                      placeholder="https://open.spotify.com/track/..."
                      className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                      value={formData.spotifyUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                    />
                    <div className="absolute right-2 top-1.5 flex space-x-1">
                      <Button
                        type="button"
                        onClick={() => fetchImageFromMediaUrl(formData.spotifyUrl, 'spotify')}
                        disabled={isFetchingImage || !formData.spotifyUrl.trim()}
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                        title="Fetch Spotify thumbnail"
                      >
                        <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                      </Button>
                      {availableImages.length > 1 && (
                        <Button
                          type="button"
                          onClick={cycleToNextImage}
                          disabled={isFetchingImage}
                          className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                          title={`Next image (${currentImageIndex + 1}/${availableImages.length})`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share a Spotify track, album, or playlist
                  </p>
                </div>

                {/* YouTube URL */}
                <div>
                  <Label htmlFor="youtubeUrl">YouTube URL (Optional)</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-3 h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <Input
                      id="youtubeUrl"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    />
                    <div className="absolute right-2 top-1.5 flex space-x-1">
                      <Button
                        type="button"
                        onClick={() => fetchImageFromMediaUrl(formData.youtubeUrl, 'youtube')}
                        disabled={isFetchingImage || !formData.youtubeUrl.trim()}
                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        title="Fetch YouTube thumbnail"
                      >
                        <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                      </Button>
                      {availableImages.length > 1 && (
                        <Button
                          type="button"
                          onClick={cycleToNextImage}
                          disabled={isFetchingImage}
                          className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                          title={`Next image (${currentImageIndex + 1}/${availableImages.length})`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share a YouTube video or music
                  </p>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger className="flex-1 bg-input border-border">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {Array.isArray(categories) && categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} ({category.postCount} posts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-border hover:bg-accent"
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border" aria-describedby="category-dialog-description">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Create New Category</DialogTitle>
                        <p id="category-dialog-description" className="text-sm text-muted-foreground">
                          Create a new category to organize your posts
                        </p>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="categoryName">Category Name *</Label>
                          <Input
                            id="categoryName"
                            placeholder="e.g., Christmas, Travel, Recipes"
                            className="bg-input border-border"
                            value={newCategoryData.name}
                            onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="categoryDescription">Description (Optional)</Label>
                          <Textarea
                            id="categoryDescription"
                            placeholder="Brief description of this category"
                            className="bg-input border-border"
                            rows={2}
                            value={newCategoryData.description}
                            onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isPublic"
                            checked={newCategoryData.isPublic}
                            onChange={(e) => setNewCategoryData(prev => ({ ...prev, isPublic: e.target.checked }))}
                            className="rounded border-border"
                          />
                          <Label htmlFor="isPublic" className="text-sm">Make this category public (others can see it)</Label>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewCategoryDialog(false)}
                            className="border-border"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => createCategoryMutation.mutate(newCategoryData)}
                            disabled={!newCategoryData.name || createCategoryMutation.isPending}
                            className="bg-pinterest-red hover:bg-red-700"
                          >
                            {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a category to organize your posts. Create custom categories like "Christmas" or "Travel".
                </p>
              </div>

              {/* Primary Photo Upload */}
              <div>
                <Label>Primary Photo *</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pinterest-red transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handlePrimaryDrop}
                  onClick={() => primaryFileRef.current?.click()}
                >
                  {primaryPhotoPreview ? (
                    <div className="relative">
                      <img
                        src={primaryPhotoPreview}
                        alt="Primary preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryPhoto(null);
                          setPrimaryPhotoPreview(null);
                          if (primaryFileRef.current) {
                            primaryFileRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">
                        Click to upload or drag and drop your primary photo
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        All image formats supported - automatically optimized if needed
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={primaryFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePrimaryPhotoChange(e.target.files?.[0] || null)}
                />
              </div>

              {/* Additional Photos */}
              <div>
                <Label>Additional Photos (Optional)</Label>
                <div className="space-y-4 mt-2">
                  {/* Display existing additional photos */}
                  {additionalPhotoPreviews.map((preview, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={preview}
                            alt={`Additional preview ${index + 1}`}
                            className="h-20 w-20 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAdditionalPhoto(index);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <Label className="text-xs">Link (optional)</Label>
                            <div className="relative">
                              <Input
                                type="url"
                                placeholder="https://example.com"
                                value={additionalPhotos[index]?.link || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleAdditionalPhotoUrlPaste(index, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 text-xs pr-12"
                              />
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchImageForAdditionalPhoto(index, additionalPhotos[index]?.link || '');
                                }}
                                disabled={!additionalPhotos[index]?.link?.trim()}
                                className="absolute right-1 top-0.5 h-7 w-7 p-0 bg-pinterest-red hover:bg-red-600"
                                title="Fetch image from URL"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Description (optional)</Label>
                            <Textarea
                              placeholder="Describe this item..."
                              value={additionalPhotos[index]?.description || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateAdditionalPhotoData(index, 'description', e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-16 text-xs resize-none"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Discount Code (optional)</Label>
                            <Input
                              type="text"
                              placeholder="SAVE20"
                              value={additionalPhotos[index]?.discountCode || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateAdditionalPhotoData(index, 'discountCode', e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add photo button */}
                  {additionalPhotos.length < 4 && (
                    <div>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pinterest-red transition-colors cursor-pointer"
                        onDragOver={handleDragOver}
                        onDrop={handleAdditionalDrop}
                        onClick={() => additionalFileRef.current?.click()}
                      >
                        <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          Add additional photo ({additionalPhotos.length}/4)
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          All formats supported - auto-optimized
                        </p>
                      </div>
                      
                      {/* Add Photo option */}
                      <div className="mt-3 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addNewPhotoEntry}
                          disabled={additionalPhotos.length >= 4}
                          className="text-pinterest-red border-pinterest-red hover:bg-red-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={additionalFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAdditionalPhotosChange(e.target.files)}
                />
              </div>


          </CardContent>
        </Card>
      </div>
    </div>
  );
}