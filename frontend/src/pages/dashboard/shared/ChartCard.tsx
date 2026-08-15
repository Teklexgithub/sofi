import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme } from './chartTheme';

const { Text } = Typography;

interface ChartCardProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}

/** Titled card wrapper shared by every dashboard chart/table - keeps theme-aware
 * background/border and a consistent title + one-line plain-language description
 * in one place instead of repeating ad-hoc Card styling per chart. */
const ChartCard: React.FC<ChartCardProps> = ({ title, description, extra, children }) => {
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);

  return (
    <Card
      style={{
        borderRadius: 12,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <div>
          <Text strong style={{ fontSize: 15, color: theme.textPrimary }}>{title}</Text>
          {description && (
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{description}</div>
          )}
        </div>
        {extra}
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </Card>
  );
};

export default ChartCard;
