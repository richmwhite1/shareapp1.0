import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, ExternalLink, Plus, FolderPlus, Download, LinkIcon } from "lucide-react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuthToken } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

export default function CreatePostPage() {
  const [formData, setFormData] = useState({
    primaryLink: "",
    primaryDescription: "",
    discountCode: "",
    categoryId: "" // Will be set when categories load
  });
  
  const [newCategoryData, setNewCategoryData] = useState({
    name: "",
    description: "",
    isPublic: false
  });
  
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<{ file: File; link: string; description: string; discountCode: string }[]>([]);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [additionalPhotoPreviews, setAdditionalPhotoPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
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
  const handlePrimaryPhotoChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setPrimaryPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrimaryPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle additional photos selection
  const handleAdditionalPhotosChange = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      const newPhotoData = newFiles.map(file => ({ file, link: '', description: '', discountCode: '' }));
      const combinedFiles = [...additionalPhotos, ...newPhotoData].slice(0, 4); // Max 4 additional photos
      setAdditionalPhotos(combinedFiles);
      
      // Generate previews
      const previews: string[] = [];
      combinedFiles.forEach(photoData => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push(e.target?.result as string);
          if (previews.length === combinedFiles.length) {
            setAdditionalPhotoPreviews(previews);
          }
        };
        reader.readAsDataURL(photoData.file);
      });
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

      const data = await response.json();
      
      // Convert base64 to File
      const response2 = await fetch(data.imageDataUrl);
      const blob = await response2.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: 'image/jpeg' });
      
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

  // Handle URL paste detection for additional photos
  const handleAdditionalPhotoUrlPaste = (index: number, value: string) => {
    updateAdditionalPhotoData(index, 'link', value);
    
    // Check if the pasted value looks like a URL
    const urlRegex = /^https?:\/\/.+/i;
    if (urlRegex.test(value.trim())) {
      // Auto-fetch image after a short delay
      setTimeout(() => {
        fetchImageForAdditionalPhoto(index, value);
      }, 500);
    }
  };

  // Add photo by URL without file upload
  const addPhotoByUrl = async (url: string) => {
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

      const data = await response.json();
      
      // Convert base64 to File
      const response2 = await fetch(data.imageDataUrl);
      const blob = await response2.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: 'image/jpeg' });
      
      // Create new photo data with the URL as the link
      const newPhotoData = { file, link: url, description: '', discountCode: '' };
      const updatedPhotos = [...additionalPhotos, newPhotoData];
      setAdditionalPhotos(updatedPhotos);
      
      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPreviews = [...additionalPhotoPreviews, e.target?.result as string];
        setAdditionalPhotoPreviews(newPreviews);
      };
      reader.readAsDataURL(file);

      toast({
        title: "Image added!",
        description: "The image has been fetched and added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error fetching image",
        description: "Could not fetch the image from the URL. Please check the URL and try again.",
        variant: "destructive",
      });
    }
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
      if (!primaryPhoto) {
        throw new Error("Primary photo is required");
      }

      const formDataToSend = new FormData();
      formDataToSend.append('primaryLink', formData.primaryLink);
      formDataToSend.append('primaryDescription', formData.primaryDescription);
      if (formData.discountCode) {
        formDataToSend.append('discountCode', formData.discountCode);
      }
      formDataToSend.append('primaryPhoto', primaryPhoto);
      formDataToSend.append('categoryId', formData.categoryId);
      
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
    
    if (!formData.primaryLink || !formData.primaryDescription || !primaryPhoto) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields and upload a primary photo.",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
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

    setIsLoading(true);
    mutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pinterest-light">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
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
                <Label htmlFor="primaryLink">Link URL *</Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="primaryLink"
                    type="url"
                    placeholder="https://example.com"
                    className="pl-10 pr-12 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                    value={formData.primaryLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryLink: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    onClick={fetchImageFromUrl}
                    disabled={isFetchingImage || !formData.primaryLink.trim()}
                    className="absolute right-2 top-1.5 h-8 w-8 p-0 bg-pinterest-red hover:bg-red-600"
                    title="Fetch image from URL"
                  >
                    <Download className={`h-4 w-4 ${isFetchingImage ? 'animate-spin' : ''}`} />
                  </Button>
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
                        PNG, JPEG, GIF up to 5MB
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
                                placeholder="https://example.com (paste URL to auto-fetch image)"
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
                          Click to upload or drag and drop
                        </p>
                      </div>
                      
                      {/* Add by Link option */}
                      <div className="mt-3 text-center">
                        {!showUrlInput ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowUrlInput(true)}
                            className="text-pinterest-red border-pinterest-red hover:bg-red-50"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Add by Link
                          </Button>
                        ) : (
                          <div className="flex gap-2 max-w-md mx-auto">
                            <Input
                              placeholder="Paste image URL here..."
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addPhotoByUrl(urlInput);
                                  setUrlInput('');
                                  setShowUrlInput(false);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                addPhotoByUrl(urlInput);
                                setUrlInput('');
                                setShowUrlInput(false);
                              }}
                              disabled={!urlInput.trim()}
                              className="bg-pinterest-red hover:bg-red-600"
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowUrlInput(false);
                                setUrlInput('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-pinterest-red text-white hover:bg-red-700"
                disabled={isLoading || mutation.isPending}
              >
                {isLoading || mutation.isPending ? 'Creating Post...' : 'Create Post'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}