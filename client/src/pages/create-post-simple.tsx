import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, ExternalLink, Plus, FolderPlus, Download, LinkIcon, Hash, Users, Lock, Globe, Calendar, CheckSquare, Repeat, CalendarPlus, UserPlus } from "lucide-react";
import { DayPicker } from 'react-day-picker';

import MediaProcessor from "@/components/media-processor";
import { ListCollaborators } from "@/components/list-collaborators";
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
    listId: "", 
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
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPrivacy, setNewListPrivacy] = useState("public");
  const [newListCollaborators, setNewListCollaborators] = useState<Array<{
    userId: number;
    username: string;
    name: string;
    role: "collaborator" | "viewer";
  }>>([]);

  // Photo state
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<{ file: File; link: string; description: string; discountCode: string }[]>([]);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const additionalFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user's default privacy setting
  const { data: userPrivacy } = useQuery({
    queryKey: ['/api/user', user?.id, 'privacy'],
    enabled: !!user?.id
  });

  // Update form data privacy when user privacy loads
  useEffect(() => {
    if (userPrivacy?.defaultPrivacy && formData.privacy === "public") {
      setFormData(prev => ({
        ...prev,
        privacy: userPrivacy.defaultPrivacy === 'connections' ? 'friends' : userPrivacy.defaultPrivacy
      }));
    }
  }, [userPrivacy]);

  // Media thumbnail functions
  const getYouTubeVideoId = (url: string) => {
    // Handle various YouTube URL formats including shorts
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^#&?\/\s]{11})/,
      /youtube\.com\/watch\?.*v=([^#&?\/\s]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const getSpotifyTrackId = (url: string) => {
    const regExp = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const fetchYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const fetchSpotifyThumbnail = async (trackId: string) => {
    try {
      // Use oEmbed API to get Spotify track info
      const response = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
      const data = await response.json();
      return data.thumbnail_url || null;
    } catch (error) {
      console.error('Failed to fetch Spotify thumbnail:', error);
      return null;
    }
  };

  // Auto-fetch thumbnails when URLs change
  useEffect(() => {
    console.log('Auto-fetch effect triggered:', {
      youtubeUrl: formData.youtubeUrl,
      spotifyUrl: formData.spotifyUrl
    });

    const fetchThumbnail = async () => {
      // Clear previous auto thumbnail
      setAutoThumbnailUrl(null);
      
      if (formData.youtubeUrl.trim()) {
        console.log('Processing YouTube URL:', formData.youtubeUrl);
        const videoId = getYouTubeVideoId(formData.youtubeUrl);
        console.log('Extracted video ID:', videoId);
        
        if (videoId) {
          const thumbnailUrl = fetchYouTubeThumbnail(videoId);
          console.log('YouTube thumbnail URL:', thumbnailUrl);
          setAutoThumbnailUrl(thumbnailUrl);
          setPrimaryPhotoPreview(thumbnailUrl);
          // Clear manual photo selection since we have auto thumbnail
          setPrimaryPhoto(null);
        } else {
          console.log('No valid YouTube video ID found');
        }
      } else if (formData.spotifyUrl.trim()) {
        console.log('Processing Spotify URL:', formData.spotifyUrl);
        const trackId = getSpotifyTrackId(formData.spotifyUrl);
        console.log('Extracted track ID:', trackId);
        
        if (trackId) {
          try {
            const thumbnailUrl = await fetchSpotifyThumbnail(trackId);
            if (thumbnailUrl) {
              console.log('Spotify thumbnail URL:', thumbnailUrl);
              setAutoThumbnailUrl(thumbnailUrl);
              setPrimaryPhotoPreview(thumbnailUrl);
              // Clear manual photo selection since we have auto thumbnail
              setPrimaryPhoto(null);
            }
          } catch (error) {
            console.error('Failed to fetch Spotify thumbnail:', error);
          }
        }
      } else {
        console.log('No media URLs provided, clearing thumbnails');
        // No media URLs, clear auto thumbnail but preserve manual photo
        if (!primaryPhoto) {
          setPrimaryPhotoPreview(null);
        }
      }
    };

    // Debounce the fetch to avoid excessive API calls
    const timeoutId = setTimeout(fetchThumbnail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.youtubeUrl, formData.spotifyUrl]);

  // Image processing functions
  const resizeImage = (file: File, maxSizeMB: number = 5): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let { width, height } = img;
        const maxDimension = 1920;
        
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
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob && (blob.size / (1024 * 1024)) <= maxSizeMB) {
              const processedFile = new File(
                [blob], 
                file.name.replace(/\.[^/.]+$/, outputFormat === 'image/png' ? '.png' : '.jpg'),
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
    if (!file.type.startsWith('image/')) {
      try {
        return await resizeImage(file);
      } catch {
        throw new Error('Please upload a valid image file (PNG, JPEG, GIF, WebP)');
      }
    }
    
    const sizeMB = file.size / (1024 * 1024);
    
    if (sizeMB <= 5 && ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      return file;
    }
    
    return await resizeImage(file);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No authentication token');
        return;
      }

      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || "",
          privacyLevel: newListPrivacy
        })
      });
      
      if (response.ok) {
        const newList = await response.json();
        
        // Add collaborators if this is a private list and collaborators were specified
        if (newListPrivacy === 'private' && newListCollaborators.length > 0) {
          for (const collaborator of newListCollaborators) {
            try {
              await fetch(`/api/lists/${newList.id}/collaborators`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                  userId: collaborator.userId,
                  role: collaborator.role
                })
              });
            } catch (error) {
              console.error('Failed to add collaborator:', error);
            }
          }
        }
        
        setFormData(prev => ({ ...prev, listId: newList.id.toString() }));
        setNewListName('');
        setNewListDescription('');
        setNewListPrivacy('public');
        setNewListCollaborators([]);
        setShowNewListDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        
        toast({
          title: "Success",
          description: "List created successfully!"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to create list",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to create list:', error);
      toast({
        title: "Error",
        description: "Failed to create list. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Calendar integration functions
  const generateCalendarUrl = (type: 'google' | 'apple') => {
    if (!selectedDate || !eventTime) return '';
    
    const eventDateTime = new Date(selectedDate);
    const [hours, minutes] = eventTime.split(':');
    eventDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const startDate = eventDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(eventDateTime.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const title = encodeURIComponent(formData.primaryDescription || 'Event');
    const details = encodeURIComponent(`Check out this event: ${formData.primaryLink}`);
    
    if (type === 'google') {
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
    } else {
      return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${title}
DESCRIPTION:${details}
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
    setReminders(prev => {
      if (prev.includes(reminder)) {
        // Remove reminder if already selected
        return prev.filter(r => r !== reminder);
      } else {
        // Add reminder if not selected and within limits
        if (formData.privacy === 'public' && prev.length >= 3) {
          return prev; // Don't add if public event already has 3 reminders
        }
        return [...prev, reminder];
      }
    });
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      setTaskList(prev => [...prev, {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false
      }]);
      setNewTaskText('');
    }
  };

  const removeTask = (taskId: string) => {
    setTaskList(prev => prev.filter(task => task.id !== taskId));
  };

  const toggleTask = (taskId: string) => {
    setTaskList(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  // File handling functions
  const handlePrimaryPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processedFile = await processImageFile(file);
      setPrimaryPhoto(processedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      toast({
        title: "Error processing image",
        description: error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive"
      });
    }
  };

  const handleAdditionalPhotosChange = async (files: FileList | null) => {
    if (!files) return;
    
    try {
      const processedPhotos = await Promise.all(
        Array.from(files).map(async (file) => {
          const processedFile = await processImageFile(file);
          return {
            file: processedFile,
            link: '',
            description: '',
            discountCode: ''
          };
        })
      );
      
      setAdditionalPhotos(prev => [...prev, ...processedPhotos].slice(0, 4));
    } catch (error) {
      toast({
        title: "Error processing images",
        description: error instanceof Error ? error.message : "Failed to process one or more images",
        variant: "destructive"
      });
    }
  };

  const updateAdditionalPhoto = (index: number, field: string, value: string) => {
    setAdditionalPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    ));
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addNewPhotoEntry = () => {
    if (additionalFileRef.current) {
      additionalFileRef.current.click();
    }
  };

  // Metadata fetching function
  const fetchLinkMetadata = async (url: string, type: 'primary' | 'spotify' | 'youtube') => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() })
      });
      
      if (response.ok) {
        const metadata = await response.json();
        
        // For Spotify, we get the album cover on first try
        if (type === 'spotify' && metadata.image) {
          try {
            const response = await fetch(metadata.image);
            const blob = await response.blob();
            const file = new File([blob], 'spotify-cover.jpg', { type: 'image/jpeg' });
            const processedFile = await processImageFile(file);
            setPrimaryPhoto(processedFile);
            setPrimaryPhotoPreview(metadata.image);
          } catch (error) {
            console.warn('Could not fetch Spotify image due to CORS:', error);
            // Use the image URL directly without fetching
            setPrimaryPhotoPreview(metadata.image);
          }
        }
        
        // For YouTube, get thumbnail on first try
        else if (type === 'youtube' && metadata.image) {
          try {
            const response = await fetch(metadata.image);
            const blob = await response.blob();
            const file = new File([blob], 'youtube-thumbnail.jpg', { type: 'image/jpeg' });
            const processedFile = await processImageFile(file);
            setPrimaryPhoto(processedFile);
            setPrimaryPhotoPreview(metadata.image);
          } catch (error) {
            console.warn('Could not fetch YouTube image due to CORS:', error);
            setPrimaryPhotoPreview(metadata.image);
          }
        }
        
        // For general links, cycle through available images
        else if (type === 'primary' && metadata.images && metadata.images.length > 0) {
          const currentImageIndex = primaryPhoto ? 
            (metadata.images.findIndex((img: string) => img === primaryPhotoPreview) + 1) % metadata.images.length 
            : 0;
          const imageUrl = metadata.images[currentImageIndex];
          
          try {
            // Use a proxy endpoint to fetch images to avoid CORS issues
            const response = await fetch('/api/fetch-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ imageUrl })
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], 'fetched-image.jpg', { type: 'image/jpeg' });
              const processedFile = await processImageFile(file);
              setPrimaryPhoto(processedFile);
              setPrimaryPhotoPreview(imageUrl);
            } else {
              throw new Error('Failed to fetch image');
            }
          } catch (error) {
            console.error('Image fetch error:', error);
            // Fallback: just set the image URL without downloading
            setPrimaryPhotoPreview(imageUrl);
          }
        }
        
        // Update description if available and empty
        if (metadata.title && !formData.primaryDescription.trim()) {
          setFormData(prev => ({ 
            ...prev, 
            primaryDescription: metadata.description || metadata.title 
          }));
        }
        
        toast({
          title: "Success",
          description: "Link metadata fetched successfully!"
        });
      } else {
        throw new Error('Failed to fetch link metadata');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch link metadata. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Privacy and friend functions
  const handlePrivacyChange = (privacy: 'public' | 'friends' | 'private') => {
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
    if (!Array.isArray(friends)) return '';
    return friends
      .filter((friend: any) => taggedUsers.includes(friend.id))
      .map((friend: any) => friend.name || friend.username)
      .join(', ');
  };

  // Data fetching
  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ['/api/lists']
  });

  const { data: friends } = useQuery({
    queryKey: ['/api/friends']
  });

  // Set default list when lists load
  useEffect(() => {
    if (lists && !formData.listId && Array.isArray(lists)) {
      const generalList = lists.find((list: any) => list.name.toLowerCase() === 'general');
      if (generalList) {
        setFormData(prev => ({ ...prev, listId: generalList.id.toString() }));
      } else if (lists.length > 0) {
        setFormData(prev => ({ ...prev, listId: lists[0].id.toString() }));
      }
    }
  }, [lists, formData.listId]);

  // Automatically inherit privacy level from selected list
  useEffect(() => {
    if (lists && formData.listId && Array.isArray(lists)) {
      const selectedList = lists.find((list: any) => list.id.toString() === formData.listId);
      if (selectedList && selectedList.privacyLevel) {
        setFormData(prev => ({ ...prev, privacy: selectedList.privacyLevel }));
      }
    }
  }, [lists, formData.listId]);

  // Form submission
  const mutation = useMutation({
    mutationFn: async (postData: any) => {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');

      const formDataToSend = new FormData();
      
      // Basic post data
      formDataToSend.append('primaryLink', postData.primaryLink);
      formDataToSend.append('primaryDescription', postData.primaryDescription);
      formDataToSend.append('discountCode', postData.discountCode);
      formDataToSend.append('listId', postData.listId);
      formDataToSend.append('spotifyUrl', postData.spotifyUrl);
      formDataToSend.append('youtubeUrl', postData.youtubeUrl);
      formDataToSend.append('privacy', postData.privacy);
      
      // Hashtags
      if (hashtags.length > 0) {
        formDataToSend.append('hashtags', JSON.stringify(hashtags));
      }
      
      // Tagged users
      if (taggedUsers.length > 0) {
        formDataToSend.append('taggedUsers', JSON.stringify(taggedUsers));
      }
      
      // Event data
      if (isEvent) {
        formDataToSend.append('isEvent', 'true');
        if (eventDate) {
          formDataToSend.append('eventDate', eventDate);
        }
        if (reminders.length > 0) {
          formDataToSend.append('reminders', JSON.stringify(reminders));
        }
        if (isRecurring && recurringType) {
          formDataToSend.append('isRecurring', 'true');
          formDataToSend.append('recurringType', recurringType);
        }
        if (taskList.length > 0) {
          formDataToSend.append('taskList', JSON.stringify(taskList));
        }
        formDataToSend.append('allowRsvp', allowRsvp.toString());
      }

      // Primary photo or auto-generated thumbnail
      if (primaryPhoto) {
        formDataToSend.append('primaryPhoto', primaryPhoto);
      } else if (autoThumbnailUrl) {
        // Send thumbnail URL for server to download and process
        formDataToSend.append('thumbnailUrl', autoThumbnailUrl);
      }

      // Additional photos
      additionalPhotos.forEach((photo, index) => {
        formDataToSend.append(`additionalPhotos`, photo.file);
        formDataToSend.append(`additionalPhoto_${index}_link`, photo.link);
        formDataToSend.append(`additionalPhoto_${index}_description`, photo.description);
        formDataToSend.append(`additionalPhoto_${index}_discountCode`, photo.discountCode);
      });

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create post' }));
        throw new Error(errorData.message || 'Failed to create post');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.primaryDescription.trim()) {
      toast({
        title: "Error",
        description: "Please add a description for your post",
        variant: "destructive"
      });
      return;
    }

    if (!formData.listId) {
      toast({
        title: "Error", 
        description: "Please select a list",
        variant: "destructive"
      });
      return;
    }

    // Only require primary photo if no YouTube/Spotify URL is provided
    if (!primaryPhoto && !formData.youtubeUrl.trim() && !formData.spotifyUrl.trim()) {
      toast({
        title: "Error",
        description: "Please upload a primary photo or provide a YouTube/Spotify link",
        variant: "destructive"
      });
      return;
    }

    // Ensure at least one link is provided
    if (!formData.primaryLink.trim() && !formData.spotifyUrl.trim() && !formData.youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide at least one link (general, Spotify, or YouTube)",
        variant: "destructive"
      });
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-3 pt-14 pb-20">
        <Card className="bg-card border-border">
          <CardContent className="p-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Primary Photo Upload */}
              <div>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-pinterest-red transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {primaryPhotoPreview ? (
                    <div className="relative">
                      <img 
                        src={primaryPhotoPreview} 
                        alt="Primary preview" 
                        className="max-w-full h-32 sm:h-40 object-cover rounded-lg mx-auto"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryPhoto(null);
                          setPrimaryPhotoPreview(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Image className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Upload photo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePrimaryPhotoSelect}
                />
              </div>

              {/* Post Description */}
              <div>
                <Textarea
                  placeholder="What's this about?"
                  value={formData.primaryDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryDescription: e.target.value }))}
                  className="bg-input border-border text-foreground min-h-[70px]"
                  required
                />
              </div>

              {/* Primary Link */}
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="Add a link"
                      value={formData.primaryLink}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryLink: e.target.value }))}
                      className="pl-10 bg-input border-border"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLinkMetadata(formData.primaryLink, 'primary')}
                    disabled={!formData.primaryLink.trim() || isLoading}
                    className="px-3"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Media URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-3 w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                    <Download className="h-2 w-2 text-white" />
                  </div>
                  <Input
                    type="url"
                    placeholder="Spotify link"
                    value={formData.spotifyUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                    className="pl-10 bg-input border-border"
                  />
                </div>

                <div className="relative flex-1">
                  <div className="absolute left-3 top-3 w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                    <Download className="h-2 w-2 text-white" />
                  </div>
                  <Input
                    type="url"
                    placeholder="YouTube link"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="pl-10 bg-input border-border"
                  />
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Add hashtags (press Enter)"
                    value={hashtagInput}
                    onChange={(e) => handleHashtagInputChange(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    className="pl-10 bg-input border-border"
                  />
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag, index) => (
                      <div key={index} className="flex items-center bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm">
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy Settings & Category - More Discreet */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <Label htmlFor="privacy" className="text-sm">Post</Label>
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
                              Connections
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
                    
                    <div className="mt-5 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEvent(!isEvent)}
                        className={`h-8 text-sm ${isEvent ? 'bg-purple-50 border-purple-300 text-purple-700' : ''}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {isEvent ? 'Event' : 'Event'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFriendSelector(!showFriendSelector)}
                        className={`h-8 text-sm ${taggedUsers.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Tag ({taggedUsers.length})
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm">List</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.listId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, listId: value }))}
                      >
                        <SelectTrigger className="w-40 h-8 text-sm bg-input border-border">
                          <SelectValue placeholder="Select list" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {Array.isArray(lists) && lists.map((list: any) => (
                            <SelectItem key={list.id} value={list.id.toString()}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
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
                        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Create New List</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pr-2">
                            <div>
                              <Label htmlFor="listName">List Name *</Label>
                              <Input
                                id="listName"
                                placeholder="e.g., Christmas, Travel, Recipes"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                className="bg-input border-border"
                              />
                            </div>
                            <div>
                              <Label htmlFor="listDescription">Description (Optional)</Label>
                              <Textarea
                                id="listDescription"
                                placeholder="Describe this list..."
                                value={newListDescription}
                                onChange={(e) => setNewListDescription(e.target.value)}
                                className="bg-input border-border"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="listPrivacy">Privacy Level</Label>
                              <Select value={newListPrivacy} onValueChange={setNewListPrivacy}>
                                <SelectTrigger className="bg-input border-border">
                                  <SelectValue placeholder="Select privacy level" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                  <SelectItem value="public">
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4 text-green-500" />
                                      <div>
                                        <div className="font-medium">Public</div>
                                        <div className="text-xs text-muted-foreground">Visible to everyone</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="connections">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-blue-500" />
                                      <div>
                                        <div className="font-medium">Connections Only</div>
                                        <div className="text-xs text-muted-foreground">Only your friends can see</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="private">
                                    <div className="flex items-center gap-2">
                                      <Lock className="h-4 w-4 text-red-500" />
                                      <div>
                                        <div className="font-medium">Private</div>
                                        <div className="text-xs text-muted-foreground">Only you and invited collaborators</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Collaborators section for private lists */}
                            {newListPrivacy === 'private' && (
                              <div>
                                <ListCollaborators
                                  initialCollaborators={newListCollaborators}
                                  onCollaboratorsChange={setNewListCollaborators}
                                  showTitle={true}
                                />
                              </div>
                            )}
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewListDialog(false)}
                                className="border-border"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleCreateList}
                                disabled={!newListName.trim() || mutation.isPending}
                                className="bg-pinterest-red hover:bg-red-700 text-white"
                              >
                                {mutation.isPending ? 'Creating...' : 'Create List'}
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
                      Tag Connections
                    </Button>
                  )}
                </div>
              </div>
              
              {formData.privacy === 'private' && taggedUsers.length > 0 && (
                <div className="text-xs text-gray-600">
                  Tagged: {getTaggedFriendNames()}
                </div>
              )}

              {/* Event Configuration */}
              {isEvent && (
                <div className="mt-6 p-4 bg-black border border-purple-400 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-purple-300 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Event Details
                  </h3>
                  
                  {/* Event Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-purple-200">Event Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-gray-800 border-purple-300 text-white"
                          >
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            {selectedDate ? selectedDate.toDateString() : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card" align="start">
                          <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={{ before: new Date() }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label className="text-purple-200">Event Time</Label>
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
                        className="bg-gray-800 border-purple-300 text-white"
                      />
                    </div>
                  </div>

                  {/* Calendar Export Buttons */}
                  {selectedDate && eventTime && (
                    <div className="flex gap-2">
                      <a
                        href={generateCalendarUrl('google')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Add to Google Calendar
                      </a>
                      <a
                        href={generateCalendarUrl('apple')}
                        download="event.ics"
                        className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                      >
                        Download .ics file
                      </a>
                    </div>
                  )}

                  {/* Event Reminders */}
                  <div>
                    <Label className="text-purple-200">Event Reminders {formData.privacy === 'public' ? '(Pick up to 3)' : ''}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['1_month', '2_weeks', '1_week', '3_days', '1_day'].map((reminderValue) => {
                        const reminderLabel = {
                          '1_month': '1 month',
                          '2_weeks': '2 weeks', 
                          '1_week': '1 week',
                          '3_days': '3 days',
                          '1_day': '1 day'
                        }[reminderValue];
                        
                        const isSelected = reminders.includes(reminderValue);
                        const canSelect = formData.privacy !== 'public' || reminders.length < 3 || isSelected;
                        
                        return (
                          <button
                            key={reminderValue}
                            type="button"
                            onClick={() => toggleReminder(reminderValue)}
                            disabled={!canSelect}
                            className={`text-xs px-3 py-1 rounded border ${
                              isSelected
                                ? 'bg-purple-600 border-purple-400 text-white'
                                : canSelect
                                ? 'bg-gray-700 border-purple-300 text-purple-200 hover:bg-gray-600'
                                : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {reminderLabel}
                          </button>
                        );
                      })}
                    </div>
                    {formData.privacy === 'public' && reminders.length >= 3 && (
                      <p className="text-xs text-yellow-400 mt-1">Public events can only have 3 reminder options</p>
                    )}
                  </div>

                  {/* Recurring Event */}
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-purple-200">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="rounded"
                      />
                      <Repeat className="w-4 h-4" />
                      <span>Recurring Event</span>
                    </label>
                    
                    {isRecurring && (
                      <Select value={recurringType} onValueChange={(value: any) => setRecurringType(value)}>
                        <SelectTrigger className="w-32 bg-gray-800 border-purple-300 text-white">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* RSVP Option */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowRsvp"
                      checked={allowRsvp}
                      onChange={(e) => setAllowRsvp(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="allowRsvp" className="text-purple-200">
                      Allow people to RSVP
                    </Label>
                  </div>

                  {/* Task List for Event */}
                  <div>
                    <Label className="text-purple-200 flex items-center">
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Event Task List
                    </Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a task..."
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                          className="bg-gray-800 border-purple-300 text-white"
                        />
                        <Button
                          type="button"
                          onClick={addTask}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Add
                        </Button>
                      </div>
                      {taskList.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                            className="rounded"
                          />
                          <span className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-purple-200'}`}>
                            {task.text}
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTask(task.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Discount Code */}
              <div>
                <Input
                  placeholder="Discount code (optional)"
                  value={formData.discountCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>

              {/* Additional Photos */}
              <div>
                
                {additionalPhotos.map((photo, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">Photo {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdditionalPhoto(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={URL.createObjectURL(photo.file)} 
                        alt={`Additional photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Input
                        placeholder="Link for this photo (optional)"
                        value={photo.link}
                        onChange={(e) => updateAdditionalPhoto(index, 'link', e.target.value)}
                        className="bg-input border-border"
                      />
                      <Input
                        placeholder="Description for this photo (optional)"
                        value={photo.description}
                        onChange={(e) => updateAdditionalPhoto(index, 'description', e.target.value)}
                        className="bg-input border-border"
                      />
                      <Input
                        placeholder="Discount code for this photo (optional)"
                        value={photo.discountCode}
                        onChange={(e) => updateAdditionalPhoto(index, 'discountCode', e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                ))}
                
                {additionalPhotos.length < 4 && (
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNewPhotoEntry}
                      disabled={additionalPhotos.length >= 4}
                      className="text-pinterest-red border-pinterest-red hover:bg-red-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Photo
                    </Button>
                  </div>
                )}
                
                <input
                  ref={additionalFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAdditionalPhotosChange(e.target.files)}
                />
              </div>

              {/* Submit Button - Moved to bottom */}
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
                  <DialogTitle>Tag Connections</DialogTitle>
                </DialogHeader>
                <div className="max-h-60 overflow-y-auto">
                  {Array.isArray(friends) && friends.length > 0 ? (
                    friends.map((friend: any) => (
                      <div key={friend.id} className="flex items-center space-x-2 p-2">
                        <input
                          type="checkbox"
                          id={`friend-${friend.id}`}
                          checked={taggedUsers.includes(friend.id)}
                          onChange={() => toggleFriendTag(friend.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`friend-${friend.id}`} className="flex-1 cursor-pointer">
                          {friend.name || friend.username}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground p-4 text-center">No connections found</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setShowFriendSelector(false)}>Done</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}