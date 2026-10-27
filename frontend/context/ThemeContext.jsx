'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  // Light Themes
  {
    id: 'light_default',
    name: 'Light default',
    group: 'Light Themes',
    description: 'The classic, standard white-and-gray interface.',
    bg: '#ffffff',
    cardBg: '#f6f8fa',
    border: '#d0d7de',
    accent: '#0969da',
    isDark: false
  },
  {
    id: 'light_high_contrast',
    name: 'Light high contrast',
    group: 'Light Themes',
    description: 'Features darker text and sharper borders to improve readability.',
    bg: '#ffffff',
    cardBg: '#ffffff',
    border: '#1f2328',
    accent: '#0550ae',
    isDark: false
  },
  {
    id: 'light_colorblind',
    name: 'Light colorblind',
    group: 'Light Themes',
    description: 'Specially optimized with accessible color palettes for red-green and blue-yellow color blindness.',
    bg: '#ffffff',
    cardBg: '#f6f8fa',
    border: '#d0d7de',
    accent: '#0969da',
    isDark: false
  },

  // Dark Themes
  {
    id: 'dark_default',
    name: 'Dark default',
    group: 'Dark Themes',
    description: 'The standard dark mode, featuring a deep dark gray and black interface.',
    bg: '#0d1117',
    cardBg: '#161b22',
    border: '#30363d',
    accent: '#58a6ff',
    isDark: true
  },
  {
    id: 'dark_dimmed',
    name: 'Dark dimmed',
    group: 'Dark Themes',
    description: 'A softer, slightly lighter "grayer" dark mode designed to reduce eye strain with lower contrast.',
    bg: '#22272e',
    cardBg: '#2d333b',
    border: '#444c56',
    accent: '#539bf5',
    isDark: true
  },
  {
    id: 'dark_high_contrast',
    name: 'Dark high contrast',
    group: 'Dark Themes',
    description: 'Offers true black backgrounds and much brighter elements for maximum visibility.',
    bg: '#010409',
    cardBg: '#0a0c10',
    border: '#7a828e',
    accent: '#71b7ff',
    isDark: true
  },
  {
    id: 'dark_colorblind',
    name: 'Dark colorblind',
    group: 'Dark Themes',
    description: 'An accessible dark palette altered to prevent color confusion for colorblind individuals.',
    bg: '#0d1117',
    cardBg: '#161b22',
    border: '#30363d',
    accent: '#58a6ff',
    isDark: true
  }
];

const ThemeContext = createContext({
  theme: 'dark_default',
  setTheme: () => {},
  isDark: true,
  availableThemes: THEMES,
  currentThemeObj: THEMES[3]
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark_default');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('prompthub_theme');
      if (stored && THEMES.some(t => t.id === stored)) {
        setThemeState(stored);
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        // Default to Dark default
        setThemeState('dark_default');
        document.documentElement.setAttribute('data-theme', 'dark_default');
        localStorage.setItem('prompthub_theme', 'dark_default');
      }
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark_default');
    }
  }, []);

  const setTheme = (newTheme) => {
    console.log('[ThemeContext] setTheme invoked with:', newTheme);
    if (THEMES.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
      try {
        localStorage.setItem('prompthub_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        console.log('[ThemeContext] document data-theme set to:', newTheme);
      } catch (e) {
        console.error('[ThemeContext] error setting theme:', e);
      }
    } else {
      console.warn('[ThemeContext] Theme ID not recognized:', newTheme);
    }
  };

  const currentThemeObj = THEMES.find(t => t.id === theme) || THEMES[0];
  const isDark = currentThemeObj.isDark;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, availableThemes: THEMES, currentThemeObj }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
