import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export const LoadingFallback = () => {
  const [showRefresh, setShowRefresh] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowRefresh(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      {showRefresh && (
        <>
          <p className="text-sm text-muted-foreground">Taking longer than expected...</p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Refresh Page
          </Button>
        </>
      )}
    </div>
  );
};
