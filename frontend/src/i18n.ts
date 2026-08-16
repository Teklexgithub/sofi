import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from './locales/en/common.json';
import commonAm from './locales/am/common.json';
import navEn from './locales/en/nav.json';
import navAm from './locales/am/nav.json';
import inventoryEn from './locales/en/inventory.json';
import inventoryAm from './locales/am/inventory.json';
import salesEn from './locales/en/sales.json';
import salesAm from './locales/am/sales.json';
import employeeEn from './locales/en/employee.json';
import employeeAm from './locales/am/employee.json';
import settingsEn from './locales/en/settings.json';
import settingsAm from './locales/am/settings.json';
import dashboardEn from './locales/en/dashboard.json';
import dashboardAm from './locales/am/dashboard.json';
import printEn from './locales/en/print.json';
import printAm from './locales/am/print.json';

export const SUPPORTED_LANGUAGES = ['en', 'am'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const storedLanguage = localStorage.getItem('language');
const initialLanguage: SupportedLanguage = storedLanguage === 'am' ? 'am' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        nav: navEn,
        inventory: inventoryEn,
        sales: salesEn,
        employee: employeeEn,
        settings: settingsEn,
        dashboard: dashboardEn,
        print: printEn,
      },
      am: {
        common: commonAm,
        nav: navAm,
        inventory: inventoryAm,
        sales: salesAm,
        employee: employeeAm,
        settings: settingsAm,
        dashboard: dashboardAm,
        print: printAm,
      },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'inventory', 'sales', 'employee', 'settings', 'dashboard', 'print'],
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

document.documentElement.lang = initialLanguage;

export default i18n;
