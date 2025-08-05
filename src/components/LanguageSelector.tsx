import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const languageOptions = [
  { code: 'pt', flag: '🇵🇹', key: 'portuguese' },
  { code: 'en', flag: '🇺🇸', key: 'english' },
  { code: 'fr', flag: '🇫🇷', key: 'french' },
  { code: 'es', flag: '🇪🇸', key: 'spanish' },
] as const;

export const LanguageSelector = ({ variant = 'ghost', size = 'icon' }: LanguageSelectorProps) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const currentLanguage = languageOptions.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          {size === 'icon' ? (
            <Globe className="h-4 w-4" />
          ) : (
            <>
              <span className="mr-2">{currentLanguage?.flag}</span>
              <Globe className="h-4 w-4" />
            </>
          )}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border border-border">
        {languageOptions.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="cursor-pointer hover:bg-muted"
          >
            <span className="mr-2">{lang.flag}</span>
            <span>{t(`language.${lang.key}`)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};