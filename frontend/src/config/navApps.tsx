import type { ReactNode } from 'react';
import {
  ShopOutlined, FileTextOutlined, TeamOutlined,
  AppstoreOutlined, SettingOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export interface NavApp {
  key: string;
  name: string;
  icon: ReactNode;
  color: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_APPS_BASE: Omit<NavApp, 'name'>[] = [
  { key: 'inventory', icon: <ShopOutlined />, color: '#008784', path: '/inventory/products' },
  { key: 'sales', icon: <FileTextOutlined />, color: '#875A7B', path: '/sales/daily-session' },
  { key: 'employee', icon: <TeamOutlined />, color: '#E46651', path: '/employees', adminOnly: true },
  { key: 'dashboard', icon: <AppstoreOutlined />, color: '#714B67', path: '/analytics', adminOnly: true },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    color: '#4A5B6D',
    path: '/settings/users',
    adminOnly: true
  },
];

/** Apps visible to the current user, with role-appropriate landing paths and translated names. */
export const useVisibleApps = (): NavApp[] => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation('nav');
  return NAV_APPS_BASE
    .filter(app => !app.adminOnly || isAdmin)
    .map(app => {
      const name = t(`apps.${app.key}`);
      // Branch Admin can't reach the Product/Vendor master-data pages, so land
      // them on Stock Levels instead when opening the Inventory app.
      if (app.key === 'inventory' && !isAdmin) {
        return { ...app, name, path: '/inventory/store' };
      }
      return { ...app, name };
    });
};
