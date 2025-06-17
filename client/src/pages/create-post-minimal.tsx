import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, Download, Hash, Globe, Users, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuthToken } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

export default function CreatePostPage() {
  const [formData, setFormData] = useState({
    primaryLink: "",
    primaryDescription: "",
    discountCode: "",
    categoryId: "",
    spotifyUrl: "",
    youtubeUrl: "",
    privacy: "public"
  });

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [eventDate, setEventDate] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Set default category when categories load
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0 && !formData.categoryId) {
      const generalCategory = categories.find((cat: any) => cat.name === 'General');
      if (generalCategory) {
        setFormData(prev => ({ ...prev, categoryId: generalCategory.id.toString() }));
      } else {
        setFormData(prev => ({ ...prev, categoryId: categories[0].id.toString() }));
      }
    }
  }, [categories, formData.categoryId]);

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrimaryPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPrimaryPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle hashtag input
  const handleHashtagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const tag = hashtagInput.trim().replace(/^#/, '').toLowerCase();
      if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
        setHashtags(prev => [...prev, tag]);
        setHashtagInput("");
      }
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // Fetch image from URL
  const fetchImageFromUrl = async () => {
    if (!formData.primaryLink.trim()) return;

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

      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: blob.type });
      
      setPrimaryPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Image fetched",
        description: "Image loaded from URL",
      });
    } catch (error: any) {
      toast({
        title: "Failed to fetch image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Create post mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!formData.primaryLink && !formData.spotifyUrl && !formData.youtubeUrl) {
        throw new Error("At least one URL is required");
      }

      const formDataToSend = new FormData();
      if (formData.primaryLink) formDataToSend.append('primaryLink', formData.primaryLink);
      formDataToSend.append('primaryDescription', formData.primaryDescription);
      if (formData.discountCode) formDataToSend.append('discountCode', formData.discountCode);
      if (formData.spotifyUrl) formDataToSend.append('spotifyUrl', formData.spotifyUrl);
      if (formData.youtubeUrl) formDataToSend.append('youtubeUrl', formData.youtubeUrl);
      if (hashtags.length > 0) {
        formDataToSend.append('hashtags', hashtags.map(tag => `#${tag}`).join(' '));
      }
      if (primaryPhoto) formDataToSend.append('primaryPhoto', primaryPhoto);
      formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('privacy', formData.privacy);
      formDataToSend.append('isEvent', isEvent.toString());
      if (isEvent && eventDate) formDataToSend.append('eventDate', eventDate);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post created",
        description: "Your post has been shared successfully!",
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.primaryDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please add a description for your post.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    mutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please sign in to create a post.</p>
          <Button onClick={() => setLocation('/auth')} className="bg-red-600 hover:bg-red-700">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen w-full">
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Create Post
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL Input */}
            <div>
              <Label className="text-white">Link URL</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  className="bg-black border-gray-700 text-white"
                  value={formData.primaryLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryLink: e.target.value }))}
                />
                <Button
                  type="button"
                  onClick={fetchImageFromUrl}
                  disabled={isFetchingImage || !formData.primaryLink.trim()}
                  className="bg-red-600 hover:bg-red-700 px-3"
                >
                  <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-white">Description *</Label>
              <Textarea
                placeholder="What's on your mind?"
                className="bg-black border-gray-700 text-white"
                rows={3}
                value={formData.primaryDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryDescription: e.target.value }))}
                required
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label className="text-white">Photo</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="bg-black border-gray-700 text-white"
                  ref={fileRef}
                />
                {primaryPhotoPreview && (
                  <Button
                    type="button"
                    onClick={() => {
                      setPrimaryPhoto(null);
                      setPrimaryPhotoPreview(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {primaryPhotoPreview && (
                <img
                  src={primaryPhotoPreview}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-lg"
                />
              )}
            </div>

            {/* Hashtags */}
            <div>
              <Label className="text-white">Hashtags ({hashtags.length}/10)</Label>
              <Input
                type="text"
                placeholder="Type hashtags and press Enter"
                className="bg-black border-gray-700 text-white"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagInput}
                disabled={hashtags.length >= 10}
              />
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {hashtags.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-full text-sm"
                    >
                      <Hash className="h-3 w-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="hover:bg-red-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy & Event Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-white">Privacy:</Label>
                <Select value={formData.privacy} onValueChange={(value) => setFormData(prev => ({ ...prev, privacy: value }))}>
                  <SelectTrigger className="w-28 bg-black border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-700">
                    <SelectItem value="public" className="text-white">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Public
                    </SelectItem>
                    <SelectItem value="friends" className="text-white">
                      <Users className="h-4 w-4 inline mr-1" />
                      Friends
                    </SelectItem>
                    <SelectItem value="private" className="text-white">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Private
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEvent(!isEvent)}
                className={`border-gray-700 ${isEvent ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Event
              </Button>
            </div>

            {/* Event Date (if event mode) */}
            {isEvent && (
              <div>
                <Label className="text-white">Event Date</Label>
                <Input
                  type="datetime-local"
                  className="bg-black border-gray-700 text-white"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
            )}

            {/* Media URLs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white text-sm">Spotify URL</Label>
                <Input
                  type="url"
                  placeholder="Spotify link"
                  className="bg-black border-gray-700 text-white"
                  value={formData.spotifyUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-white text-sm">YouTube URL</Label>
                <Input
                  type="url"
                  placeholder="YouTube link"
                  className="bg-black border-gray-700 text-white"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                />
              </div>
            </div>

            {/* Discount Code */}
            <div>
              <Label className="text-white">Discount Code (Optional)</Label>
              <Input
                placeholder="Enter discount code"
                className="bg-black border-gray-700 text-white"
                value={formData.discountCode}
                onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
            >
              {isLoading ? 'Creating...' : 'Share Post'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}