import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

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
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>('pt');

  // Load language from localStorage or user preferences
  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        // Load from user preferences if logged in
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data?.language) {
            setLanguageState(data.language as Language);
            i18n.changeLanguage(data.language);
            return;
          }
        } catch (error) {
          console.error('Error loading language from user preferences:', error);
        }
      }
      
      // Fallback to localStorage and browser detection
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && ['en', 'pt', 'es', 'fr'].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
        i18n.changeLanguage(savedLanguage);
      } else {
        // Use browser language detection
        const browserLang = navigator.language.split('-')[0] as Language;
        const supportedLang = ['en', 'pt', 'es', 'fr'].includes(browserLang) ? browserLang : 'pt';
        setLanguageState(supportedLang);
        i18n.changeLanguage(supportedLang);
      }
    };

    loadLanguage();
  }, [user, i18n]);

  const setLanguage = async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    i18n.changeLanguage(newLanguage);
    
    // Save to localStorage
    localStorage.setItem('language', newLanguage);
    
    // Save to user preferences if logged in
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            language: newLanguage
          });
      } catch (error) {
        console.error('Error saving language to user preferences:', error);
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};