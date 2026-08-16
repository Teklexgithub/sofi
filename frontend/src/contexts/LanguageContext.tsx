import React, { createContext, useContext, useState } from 'react';
import i18n from '../i18n';
import type { SupportedLanguage } from '../i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  toggleLanguage: () => void;
  setLanguage: (lang: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('language');
    return saved === 'am' ? 'am' : 'en';
  });

  const applyLanguage = (lang: SupportedLanguage) => {
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    setLanguageState(lang);
  };

  const setLanguage = (lang: SupportedLanguage) => applyLanguage(lang);

  const toggleLanguage = () => applyLanguage(language === 'en' ? 'am' : 'en');

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
