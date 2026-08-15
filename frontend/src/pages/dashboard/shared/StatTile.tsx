import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme } from './chartTheme';

const { Text } = Typography;

type StatStatus = 'neutral' | 'good' | 'warning' | 'critical';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  description?: string;
  /** Status color is never the only signal - the icon + label always carry the meaning too. */
  status?: StatStatus;
}

/** A single KPI tile: icon + big value + plain-language label, with optional
 * status coloring for things the admin needs to act on (e.g. stockouts, unpaid debt). */
const StatTile: React.FC<StatTileProps> = ({ icon, label, value, description, status = 'neutral' }) => {
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);
  const accent = status === 'neutral' ? null : theme.status[status];

  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${accent || theme.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: accent || theme.textSecondary, fontSize: 18, lineHeight: 1 }}>{icon}</span>
        <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: 500 }}>{label}</Text>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || theme.textPrimary, lineHeight: 1.2 }}>{value}</div>
      {description && (
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>{description}</div>
      )}
    </div>
  );
};

export default StatTile;
