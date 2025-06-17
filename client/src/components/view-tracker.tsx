import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ViewTrackerProps {
  postId: number;
  viewType: 'feed' | 'expanded' | 'profile';
  children: React.ReactNode;
  className?: string;
}

export function ViewTracker({ postId, viewType, children, className }: ViewTrackerProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedRef = useRef(false);

  const trackViewMutation = useMutation({
    mutationFn: async (viewDuration: number) => {
      const response = await fetch(`/api/posts/${postId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ viewType, viewDuration }),
      });
      if (!response.ok) throw new Error('Failed to track view');
      return response.json();
    },
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Element is visible, start timer
            if (!hasTrackedRef.current) {
              const startTime = Date.now();
              timeoutRef.current = setTimeout(() => {
                const viewDuration = Date.now() - startTime;
                trackViewMutation.mutate(viewDuration);
                hasTrackedRef.current = true;
              }, 1000); // 1 second threshold
            }
          } else {
            // Element is not visible, clear timer
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        });
      },
      {
        threshold: 0.5, // 50% of the element must be visible
        rootMargin: '0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [postId, viewType, trackViewMutation]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}