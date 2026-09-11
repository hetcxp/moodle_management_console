/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const THEMES = [
  {
    id: 'light',
    name: 'Claro',
    label: 'Modo Claro',
    category: 'light',
    isDark: false,
    colors: {
      bg: '#f8fafc',
      primary: '#2563eb',
      accent: '#3b82f6',
      border: '#e2e8f0',
    },
  },
  {
    id: 'dark',
    name: 'Oscuro',
    label: 'Modo Oscuro',
    category: 'dark',
    isDark: true,
    colors: {
      bg: '#0b1120',
      primary: '#3b82f6',
      accent: '#60a5fa',
      border: '#1e293b',
    },
  },
  {
    id: 'gold-teal',
    name: 'Gold & Teal',
    label: 'Dorado & Turquesa',
    category: 'dark',
    isDark: true,
    colors: {
      bg: '#0a1c20',
      primary: '#f5b716',
      accent: '#14b8a6',
      border: '#203c44',
    },
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    label: 'Menta Fresca',
    category: 'light',
    isDark: false,
    colors: {
      bg: '#f2f9f6',
      primary: '#10b27b',
      accent: '#34d399',
      border: '#d8e7e1',
    },
  },
];

const VALID_THEME_IDS = THEMES.map(t => t.id);

export const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
  themes: THEMES,
});

export function applyThemeToDOM(themeId) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);

  // Manipular clase Tailwind 'dark'
  if (themeId === 'dark' || themeId === 'gold-teal') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Manipular clases específicas de tema
  root.classList.remove('theme-gold-teal', 'theme-mint-fresh');
  if (themeId === 'gold-teal') {
    root.classList.add('theme-gold-teal');
  } else if (themeId === 'mint-fresh') {
    root.classList.add('theme-mint-fresh');
  }
}

export const ThemeProvider = ({ children, initialTheme }) => {
  const [theme, setThemeState] = useState(() => {
    if (initialTheme && VALID_THEME_IDS.includes(initialTheme)) {
      return initialTheme;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('theme');
      if (saved && VALID_THEME_IDS.includes(saved)) {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const setTheme = useCallback((newTheme) => {
    if (VALID_THEME_IDS.includes(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const currentIndex = THEMES.findIndex(t => t.id === current);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      return THEMES[nextIndex].id;
    });
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const isDark = useMemo(() => theme === 'dark' || theme === 'gold-teal', [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark,
      themes: THEMES,
    }),
    [theme, setTheme, toggleTheme, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      themes: THEMES,
    };
  }
  return context;
};
