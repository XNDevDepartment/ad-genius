import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'founders-banner-dismissed';

export const AnnouncementBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleCTA = () => {
    navigate('/pricing');
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white animate-in slide-in-from-top duration-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-bold text-sm sm:text-base">
                {t('announcement.foundersTitle')}
              </span>
              <span className="text-xs sm:text-sm opacity-90">
                {t('announcement.foundersDesc')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCTA}
              size="sm"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg whitespace-nowrap"
            >
              {t('announcement.foundersCTA')}
            </Button>
            <Button
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
