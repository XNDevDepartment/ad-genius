import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';

type Language = 'en' | 'pt' | 'es' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [language, setLanguageState] = useState<Language>('pt');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load language from localStorage or user preferences
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        console.log('[LanguageProvider] Loading language, user:', user?.id, 'authLoading:', authLoading);
        
        // Wait for i18n to be ready
        await i18n.loadLanguages(['en', 'pt', 'es', 'fr']);
        
        if (user && !authLoading) {
          // Load from user preferences if logged in
          try {
            const { data, error } = await supabase
              .from('user_preferences')
              .select('language')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (error) {
              console.error('[LanguageProvider] Database error:', error);
            } else if (data?.language) {
              console.log('[LanguageProvider] Loaded language from database:', data.language);
              setLanguageState(data.language as Language);
              await i18n.changeLanguage(data.language);
              setIsInitialized(true);
              return;
            }
          } catch (error) {
            console.error('[LanguageProvider] Error loading language from user preferences:', error);
          }
        }
        
        // Fallback to localStorage and browser detection
        try {
          const savedLanguage = localStorage.getItem('language') as Language;
          if (savedLanguage && ['en', 'pt', 'es', 'fr'].includes(savedLanguage)) {
            console.log('[LanguageProvider] Loaded language from localStorage:', savedLanguage);
            setLanguageState(savedLanguage);
            await i18n.changeLanguage(savedLanguage);
          } else {
            // Use browser language detection
            const browserLang = navigator.language.split('-')[0] as Language;
            const supportedLang = ['en', 'pt', 'es', 'fr'].includes(browserLang) ? browserLang : 'pt';
            console.log('[LanguageProvider] Using browser/default language:', supportedLang);
            setLanguageState(supportedLang);
            await i18n.changeLanguage(supportedLang);
          }
        } catch (error) {
          console.error('[LanguageProvider] localStorage error:', error);
          // Fallback to default
          console.log('[LanguageProvider] Using default language due to error');
          setLanguageState('pt');
          await i18n.changeLanguage('pt');
        }
      } catch (error) {
        console.error('[LanguageProvider] Error initializing language:', error);
        // Fallback to default
        setLanguageState('pt');
        try {
          await i18n.changeLanguage('pt');
        } catch (i18nError) {
          console.error('[LanguageProvider] Failed to set default language:', i18nError);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    // Don't load if auth is still loading
    if (!authLoading) {
      loadLanguage();
    }
  }, [user, authLoading]);

  const setLanguage = async (newLanguage: Language) => {
    console.log('[LanguageProvider] Setting language to:', newLanguage);
    setLanguageState(newLanguage);
    
    try {
      await i18n.changeLanguage(newLanguage);
      console.log('[LanguageProvider] Changed i18n language');
    } catch (error) {
      console.error('[LanguageProvider] Failed to change i18n language:', error);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('language', newLanguage);
      console.log('[LanguageProvider] Saved language to localStorage');
    } catch (error) {
      console.error('[LanguageProvider] Failed to save language to localStorage:', error);
    }
    
    // Save to user preferences if logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            language: newLanguage
          });
        
        if (error) {
          console.error('[LanguageProvider] Database error saving language:', error);
        } else {
          console.log('[LanguageProvider] Saved language to database');
        }
      } catch (error) {
        console.error('[LanguageProvider] Error saving language to user preferences:', error);
      }
    }
  };

  // Don't render children until language is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};