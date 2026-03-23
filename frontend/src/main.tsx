import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import our new context
import { ConfigProvider, theme } from 'antd';
import './index.css';

const AntdThemeWrapper = () => {
  const { isDark } = useTheme(); // Listen to the state from the dropdown

  return (
    <ConfigProvider
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
      <ThemeProvider>
        <AntdThemeWrapper />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);