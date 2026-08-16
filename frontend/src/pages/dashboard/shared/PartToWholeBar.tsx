import { Typography } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme } from './chartTheme';

const { Text } = Typography;

export interface PartToWholeSegment {
  name: string;
  value: number;
  color: string;
}

interface PartToWholeBarProps {
  segments: PartToWholeSegment[];
  /** Unit label shown next to the raw value in the legend, e.g. "ETB" or "staff". */
  unit?: string;
}

/** A single horizontal 100%-stacked bar for part-to-whole data (2-6 categories) -
 * the honest form for "share of total" per the dataviz skill, replacing a pie
 * chart with direct-labeled segments and a legend underneath. */
const PartToWholeBar: React.FC<PartToWholeBarProps> = ({ segments, unit }) => {
  const { t } = useTranslation('common');
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const nonZeroSegments = segments.filter(s => s.value > 0);
  const chartData = [Object.fromEntries(nonZeroSegments.map(s => [s.name, s.value]))];

  if (total <= 0) {
    return <Text style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic' }}>{t('messages.noData')}</Text>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={56}>
        <BarChart data={chartData} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, 1]} />
          <YAxis type="category" hide />
          <Tooltip
            formatter={(value: any, name: any) => [`${((Number(value) / total) * 100).toFixed(1)}% (${Number(value).toLocaleString()} ${unit || ''})`, name]}
            contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
            labelStyle={{ display: 'none' }}
          />
          {nonZeroSegments.map((seg, i) => (
            <Bar key={seg.name} dataKey={seg.name} stackId="share" fill={seg.color} radius={i === 0 ? [4, 0, 0, 4] : i === nonZeroSegments.length - 1 ? [0, 4, 4, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: 12 }}>
        {segments.map(seg => (
          <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, display: 'inline-block', flexShrink: 0 }} />
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              {seg.name}: <Text strong style={{ fontSize: 12, color: theme.textPrimary }}>{total ? ((seg.value / total) * 100).toFixed(1) : '0'}%</Text>
              {unit ? ` (${seg.value.toLocaleString()} ${unit})` : ''}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartToWholeBar;
