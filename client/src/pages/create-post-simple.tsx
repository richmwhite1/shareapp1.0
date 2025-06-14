import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, Image, ExternalLink, Plus, FolderPlus } from "lucide-react";
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
    categoryId: "" // Will be set when categories load
  });
  
  const [newCategoryData, setNewCategoryData] = useState({
    name: "",
    description: "",
    isPublic: false
  });
  
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [additionalPhotoPreviews, setAdditionalPhotoPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
      const combinedFiles = [...additionalPhotos, ...newFiles].slice(0, 4); // Max 4 additional photos
      setAdditionalPhotos(combinedFiles);
      
      // Generate previews
      const previews: string[] = [];
      combinedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push(e.target?.result as string);
          if (previews.length === combinedFiles.length) {
            setAdditionalPhotoPreviews(previews);
          }
        };
        reader.readAsDataURL(file);
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

  const mutation = useMutation({
    mutationFn: async () => {
      if (!primaryPhoto) {
        throw new Error("Primary photo is required");
      }

      const formDataToSend = new FormData();
      formDataToSend.append('primaryLink', formData.primaryLink);
      formDataToSend.append('primaryDescription', formData.primaryDescription);
      formDataToSend.append('primaryPhoto', primaryPhoto);
      formDataToSend.append('categoryId', formData.categoryId);
      
      additionalPhotos.forEach(photo => {
        formDataToSend.append('additionalPhotos', photo);
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
                    className="pl-10 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                    value={formData.primaryLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryLink: e.target.value }))}
                    required
                  />
                </div>
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
                      <SelectItem value="1">General</SelectItem>
                      {categories?.map((category: any) => (
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
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pinterest-red transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleAdditionalDrop}
                  onClick={() => additionalFileRef.current?.click()}
                >
                  {additionalPhotoPreviews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {additionalPhotoPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Additional preview ${index + 1}`}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAdditionalPhoto(index);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">
                        Add up to 4 additional photos
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Click to upload or drag and drop
                      </p>
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