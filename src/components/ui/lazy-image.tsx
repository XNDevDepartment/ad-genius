import { useState, forwardRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  threshold?: number;
}

export const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(
  ({ src, alt, className, fallback, threshold = 0.1, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { ref: inViewRef, inView } = useInView({
      threshold,
      triggerOnce: true,
    });

    const handleLoad = () => {
      setIsLoaded(true);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoaded(true);
    };

    if (!inView) {
      return (
        <div 
          ref={inViewRef}
          className={cn("w-full h-full", className)}
        >
          {fallback || <Skeleton className="w-full h-full" />}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className={cn("w-full h-full bg-muted flex items-center justify-center", className)}>
          <span className="text-muted-foreground text-sm">Failed to load</span>
        </div>
      );
    }

    return (
      <div ref={inViewRef} className={cn("w-full h-full relative", className)}>
        {!isLoaded && (fallback || <Skeleton className="absolute inset-0 w-full h-full" />)}
        <img
          ref={ref}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading="lazy"
          {...props}
        />
      </div>
    );
  }
);

LazyImage.displayName = "LazyImage";