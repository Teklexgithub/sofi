import type { ReactNode } from 'react';
import {
  ShopOutlined, FileTextOutlined, TeamOutlined,
  AppstoreOutlined, SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

export interface NavApp {
  name: string;
  icon: ReactNode;
  color: string;
  path: string;
  adminOnly?: boolean;
}

export const NAV_APPS: NavApp[] = [
  { name: 'Inventory', icon: <ShopOutlined />, color: '#008784', path: '/inventory/products' },
  { name: 'Sales', icon: <FileTextOutlined />, color: '#875A7B', path: '/sales/daily-session' },
  { name: 'Employee', icon: <TeamOutlined />, color: '#E46651', path: '/employees', adminOnly: true },
  { name: 'Dashboard', icon: <AppstoreOutlined />, color: '#714B67', path: '/analytics', adminOnly: true },
  {
    name: 'Settings',
    icon: <SettingOutlined />,
    color: '#4A5B6D',
    path: '/settings/users',
    adminOnly: true
  },
];

/** Apps visible to the current user, with role-appropriate landing paths. */
export const useVisibleApps = (): NavApp[] => {
  const { isAdmin } = useAuth();
  return NAV_APPS
    .filter(app => !app.adminOnly || isAdmin)
    .map(app => {
      // Branch Admin can't reach the Product/Vendor master-data pages, so land
      // them on Stock Levels instead when opening the Inventory app.
      if (app.name === 'Inventory' && !isAdmin) {
        return { ...app, path: '/inventory/store' };
      }
      return app;
    });
};
