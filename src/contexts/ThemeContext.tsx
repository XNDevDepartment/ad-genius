import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // The actual applied theme (resolves 'auto')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage or user preferences
  useEffect(() => {
    const loadTheme = async () => {
      try {
        console.log('[ThemeProvider] Loading theme, user:', user?.id, 'authLoading:', authLoading);
        
        if (user && !authLoading) {
          // Load from user preferences if logged in
          try {
            const { data, error } = await supabase
              .from('user_preferences')
              .select('theme')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (error) {
              console.error('[ThemeProvider] Database error:', error);
            } else if (data?.theme) {
              console.log('[ThemeProvider] Loaded theme from database:', data.theme);
              setThemeState(data.theme as Theme);
              setIsInitialized(true);
              return;
            }
          } catch (error) {
            console.error('[ThemeProvider] Error loading theme from user preferences:', error);
          }
        }else{
          setTheme("light");
        }
        
        // Fallback to localStorage
        try {
          const savedTheme = localStorage.getItem('theme') as Theme;
          if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            console.log('[ThemeProvider] Loaded theme from localStorage:', savedTheme);
            setThemeState(savedTheme);
          } else {
            console.log('[ThemeProvider] Using default theme: auto');
          }
        } catch (error) {
          console.error('[ThemeProvider] localStorage error:', error);
          console.log('[ThemeProvider] Using default theme due to localStorage error');
        }
      } catch (error) {
        console.error('[ThemeProvider] Unexpected error during theme loading:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    // Don't load if auth is still loading
    if (!authLoading) {
      loadTheme();
    }
  }, [user, authLoading]);

  // Apply theme to document and calculate actual theme
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      if (theme === 'auto') {
        // Use system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setActualTheme(systemTheme);
        root.classList.toggle('dark', systemTheme === 'dark');
      } else {
        setActualTheme(theme);
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme();

    // Listen for system theme changes when theme is 'auto'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    console.log('[ThemeProvider] Setting theme to:', newTheme);
    setThemeState(newTheme);
    
    // Save to localStorage
    try {
      localStorage.setItem('theme', newTheme);
      console.log('[ThemeProvider] Saved theme to localStorage');
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme to localStorage:', error);
    }
    
    // Save to user preferences if logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: newTheme
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('[ThemeProvider] Database error saving theme:', error);
        } else {
          console.log('[ThemeProvider] Saved theme to database');
        }
      } catch (error) {
        console.error('[ThemeProvider] Error saving theme to user preferences:', error);
      }
    }
  };

  // Don't render children until theme is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};