import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, Upload, Hash, Calendar, Lock, FolderPlus, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    icon: Link,
    title: "Share Links from Anywhere",
    description: "Paste a link from anywhere around the web. Fetch the image or share one of your own!",
    details: "Copy any URL and paste it in the link field. We'll automatically fetch the image and details for you."
  },
  {
    icon: Upload,
    title: "Label Your Links",
    description: "Label your link so we know what it is for",
    details: "Add a clear description to help others understand what your link is about - like 'Great recipe' or 'Workout routine'."
  },
  {
    icon: Hash,
    title: "Create Hashtags",
    description: "Create hashtags so people can find your post",
    details: "Type hashtags and press Enter to add them. Use up to 10 hashtags to help people discover your content."
  },
  {
    icon: Calendar,
    title: "Make it an Event",
    description: "Make your post an event with RSVP's, Reminders, Tasks and even attach a List!",
    details: "Turn your post into an event with dates, times, RSVP tracking, and task management features."
  },
  {
    icon: Lock,
    title: "Control Your Audience",
    description: "Control your audience with our privacy settings",
    details: "Choose who can see your post: Public (everyone), Connections (friends only), or Private (just you and collaborators)."
  },
  {
    icon: FolderPlus,
    title: "Save to Lists",
    description: "Save your post to a list so it is easier to find later",
    details: "Organize your posts by saving them to themed lists like 'Recipes', 'Workouts', or 'Travel Ideas'."
  }
];

export function CreatePostTutorial({ isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentTutorialStep = tutorialSteps[currentStep];
  const IconComponent = currentTutorialStep.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-foreground">How to Create Posts</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex justify-center space-x-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{currentTutorialStep.title}</h3>
                  <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {tutorialSteps.length}</p>
                </div>
              </div>
              
              <p className="text-sm text-foreground mb-2">{currentTutorialStep.description}</p>
              <p className="text-xs text-muted-foreground">{currentTutorialStep.details}</p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>

            {currentStep === tutorialSteps.length - 1 ? (
              <Button
                size="sm"
                onClick={onClose}
                className="flex items-center gap-1"
              >
                Got it!
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={nextStep}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}