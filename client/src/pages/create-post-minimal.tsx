import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, Download, Hash, Globe, Users, Lock, Calendar, Plus, Clock, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState("12:00");
  const [reminders, setReminders] = useState<string[]>([]);
  const [newReminder, setNewReminder] = useState("");
  const [taskList, setTaskList] = useState<{id: string, text: string, completed: boolean}[]>([]);
  const [newTask, setNewTask] = useState("");
  const [allowRsvp, setAllowRsvp] = useState(false);

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

  // Handle date selection for events
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

  // Add reminder
  const addReminder = () => {
    if (newReminder.trim() && !reminders.includes(newReminder.trim())) {
      setReminders(prev => [...prev, newReminder.trim()]);
      setNewReminder("");
    }
  };

  const removeReminder = (reminderToRemove: string) => {
    setReminders(prev => prev.filter(r => r !== reminderToRemove));
  };

  // Add task
  const addTask = () => {
    if (newTask.trim()) {
      setTaskList(prev => [...prev, {
        id: Date.now().toString(),
        text: newTask.trim(),
        completed: false
      }]);
      setNewTask("");
    }
  };

  const removeTask = (taskId: string) => {
    setTaskList(prev => prev.filter(t => t.id !== taskId));
  };

  const toggleTask = (taskId: string) => {
    setTaskList(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
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

  // Fetch from Spotify
  const fetchFromSpotify = async () => {
    if (!formData.spotifyUrl.trim()) return;
    setIsFetchingImage(true);
    try {
      const response = await fetch('/api/scrape-spotify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ url: formData.spotifyUrl }),
      });

      if (!response.ok) throw new Error('Failed to fetch from Spotify');

      const blob = await response.blob();
      const file = new File([blob], 'spotify-thumbnail.jpg', { type: blob.type });
      
      setPrimaryPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Spotify thumbnail fetched",
        description: "Album artwork loaded from Spotify",
      });
    } catch (error: any) {
      toast({
        title: "Failed to fetch from Spotify",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Fetch from YouTube
  const fetchFromYouTube = async () => {
    if (!formData.youtubeUrl.trim()) return;
    setIsFetchingImage(true);
    try {
      const response = await fetch('/api/scrape-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ url: formData.youtubeUrl }),
      });

      if (!response.ok) throw new Error('Failed to fetch from YouTube');

      const blob = await response.blob();
      const file = new File([blob], 'youtube-thumbnail.jpg', { type: blob.type });
      
      setPrimaryPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "YouTube thumbnail fetched",
        description: "Video thumbnail loaded from YouTube",
      });
    } catch (error: any) {
      toast({
        title: "Failed to fetch from YouTube",
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
      if (isEvent && reminders.length > 0) formDataToSend.append('reminders', JSON.stringify(reminders));
      if (isEvent && taskList.length > 0) formDataToSend.append('taskList', JSON.stringify(taskList));
      if (isEvent) formDataToSend.append('allowRsvp', allowRsvp.toString());

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

            {/* YouTube URL */}
            <div>
              <Label className="text-white">YouTube URL</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-black border-gray-700 text-white"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                />
                <Button
                  type="button"
                  onClick={fetchFromYouTube}
                  disabled={isFetchingImage || !formData.youtubeUrl.trim()}
                  className="bg-red-600 hover:bg-red-700 px-3"
                >
                  <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Spotify URL */}
            <div>
              <Label className="text-white">Spotify URL</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://open.spotify.com/..."
                  className="bg-black border-gray-700 text-white"
                  value={formData.spotifyUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                />
                <Button
                  type="button"
                  onClick={fetchFromSpotify}
                  disabled={isFetchingImage || !formData.spotifyUrl.trim()}
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
                placeholder="What did you find?"
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

            {/* Event Features */}
            {isEvent && (
              <div className="space-y-4 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium">Event Details</h3>
                
                {/* Interactive Calendar */}
                <div>
                  <Label className="text-white">Event Date & Time</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="bg-black border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {selectedDate ? selectedDate.toDateString() : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700">
                        <DayPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date()}
                          className="bg-gray-900 text-white"
                        />
                      </PopoverContent>
                    </Popover>
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
                      className="bg-black border-gray-700 text-white w-32"
                    />
                  </div>
                </div>

                {/* RSVP Option */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowRsvp"
                    checked={allowRsvp}
                    onChange={(e) => setAllowRsvp(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <Label htmlFor="allowRsvp" className="text-white">Allow RSVP responses</Label>
                </div>

                {/* Reminders */}
                <div>
                  <Label className="text-white">Reminders</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a reminder..."
                      value={newReminder}
                      onChange={(e) => setNewReminder(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReminder())}
                      className="bg-black border-gray-700 text-white"
                    />
                    <Button
                      type="button"
                      onClick={addReminder}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {reminders.length > 0 && (
                    <div className="space-y-1">
                      {reminders.map((reminder, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-800 rounded p-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-white text-sm flex-1">{reminder}</span>
                          <Button
                            type="button"
                            onClick={() => removeReminder(reminder)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Task List */}
                <div>
                  <Label className="text-white">Task List</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a task..."
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                      className="bg-black border-gray-700 text-white"
                    />
                    <Button
                      type="button"
                      onClick={addTask}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {taskList.length > 0 && (
                    <div className="space-y-1">
                      {taskList.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 bg-gray-800 rounded p-2">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <CheckSquare className={`h-4 w-4 ${task.completed ? 'fill-current' : ''}`} />
                          </button>
                          <span className={`text-white text-sm flex-1 ${task.completed ? 'line-through opacity-60' : ''}`}>
                            {task.text}
                          </span>
                          <Button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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