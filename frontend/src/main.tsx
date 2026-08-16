import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { BranchProvider } from './contexts/BranchContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import our new context
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ConfigProvider, theme } from 'antd';
import amET from './antdLocaleAm';
import './index.css';

const AntdThemeWrapper = () => {
  const { isDark } = useTheme(); // Listen to the state from the dropdown
  const { language } = useLanguage();

  return (
    <ConfigProvider
      locale={language === 'am' ? amET : undefined}
      theme={{
        // Switches the entire Ant Design algorithm globally
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#714B67', // Odoo Purple
          borderRadius: 8,
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BranchProvider>
        <LanguageProvider>
          <ThemeProvider>
            <AntdThemeWrapper />
          </ThemeProvider>
        </LanguageProvider>
      </BranchProvider>
    </AuthProvider>
  </React.StrictMode>
);