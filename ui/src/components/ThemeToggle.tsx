import { type FC } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Button } from './ui/Button';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">{isDark ? 'Dark' : 'Light'} mode</span>
    </Button>
  );
};
