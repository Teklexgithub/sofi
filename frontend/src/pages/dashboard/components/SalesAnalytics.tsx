import { useState, useEffect } from 'react';
import { Row, Col, Table, Tag, Typography, Spin, Alert, Empty, Space, Input } from 'antd';
import {
  DollarCircleOutlined, ExclamationCircleOutlined, CreditCardOutlined,
  WalletOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SearchOutlined
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import { dashboardService } from '../../../services/dashboardService';
import type { SalesAnalyticsResponse } from '../../../services/dashboardService';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme, formatETB } from '../shared/chartTheme';
import ChartCard from '../shared/ChartCard';
import StatTile from '../shared/StatTile';
import PartToWholeBar from '../shared/PartToWholeBar';

const { Text } = Typography;

export const SalesAnalytics: React.FC = () => {
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesAnalyticsResponse | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  useEffect(() => {
    dashboardService.getSalesAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Couldn't load sales data. Try refreshing the page."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Loading sales data..." /></div>;
  if (error) return <Alert message="Sales data unavailable" description={error} type="error" showIcon />;
  if (!data) return <Empty description="No sales recorded yet." />;

  const { metrics, charts, vendors_credit_ledger } = data;

  const timelineData = (charts.revenue_shortage_timeline || []).map(d => ({
    ...d,
    label: dayjs(d.date).format('MMM D'),
  }));

  const branchLeaderboard = charts.branch_sales_leaderboard || [];

  const statusTag = (label: string, count: number, kind: 'good' | 'warning' | 'critical', icon: React.ReactNode) => (
    <Tag color={theme.status[kind]} style={{ color: '#fff', fontWeight: 600, border: 'none' }} icon={icon}>
      {label}: {count}
    </Tag>
  );

  return (
    <div>
      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<DollarCircleOutlined />}
            label="Total Sales Today"
            value={formatETB(metrics.gross_revenue_today)}
            description="Everything sold across all branches today"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<ExclamationCircleOutlined />}
            label="Unresolved Cash Shortages"
            value={formatETB(metrics.active_shortages_unsettled)}
            description="Till shortages not yet deducted from payroll"
            status={Number(metrics.active_shortages_unsettled) > 0 ? 'warning' : 'good'}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<CreditCardOutlined />}
            label="Customer Debt"
            value={formatETB(metrics.total_customer_debt)}
            description="Total owed to you by customers on credit"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<WalletOutlined />}
            label="Net Cash Collected Today"
            value={formatETB(metrics.net_cash_intake_today)}
            description="Cash + digital payments received today, after expenses"
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} xl={16}>
          <ChartCard title="Sales Trend (Last 30 Days)" description="Total sales recorded each day, across all branches">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timelineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.sequential} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={theme.sequential} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.gridline} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: theme.textMuted, fontSize: 11 }}
                  axisLine={{ stroke: theme.axisLine }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: theme.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatETB(v, true)}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: theme.textPrimary, fontWeight: 600 }}
                  formatter={(value: any) => [formatETB(Number(value)), 'Sales']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                />
                <Area type="monotone" dataKey="gross_sales" stroke={theme.sequential} strokeWidth={2.5} fill="url(#salesTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} xl={8}>
          <ChartCard title="How Money Came In" description="Share of all-time sales collected by payment method">
            <PartToWholeBar
              segments={[
                { name: 'Cash', value: Number(charts.revenue_composition_mix.physical_cash_percentage), color: theme.categorical[0] },
                { name: 'Digital Wallets', value: Number(charts.revenue_composition_mix.digital_wallet_percentage), color: theme.categorical[1] },
                { name: 'Store Credit', value: Number(charts.revenue_composition_mix.credit_payouts_percentage), color: theme.categorical[2] },
              ]}
            />
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <ChartCard title="Sales by Branch" description="Which branches are selling the most, all-time">
            <ResponsiveContainer width="100%" height={Math.max(160, branchLeaderboard.length * 44)}>
              <BarChart data={branchLeaderboard} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.gridline} horizontal={false} />
                <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={{ stroke: theme.axisLine }} tickLine={false} tickFormatter={(v) => formatETB(v, true)} />
                <YAxis type="category" dataKey="branch_name" tick={{ fill: theme.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: theme.textPrimary, fontWeight: 600 }}
                  formatter={(value: any) => [formatETB(Number(value)), 'Total Sales']}
                />
                <Bar dataKey="total_sales_revenue" fill={theme.sequential} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            title="What You Owe Each Vendor"
            description="Advance credit, outstanding debt, and settlement status per vendor"
            extra={
              <Input
                placeholder="Search by vendor..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={vendorSearchQuery}
                onChange={e => setVendorSearchQuery(e.target.value)}
                allowClear
                size="small"
                style={{ width: '220px' }}
              />
            }
          >
            <Table
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={vendors_credit_ledger.filter(v => v.vendor_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase()))}
              rowKey="vendor_id"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'No vendor activity yet.' }}
              columns={[
                { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name', render: (t) => <Text strong>{t}</Text> },
                { title: 'Your Advance Credit', dataIndex: 'advance_prepayment_balance', key: 'advance', render: (v) => <Text style={{ color: theme.status.good }}>{formatETB(v)}</Text> },
                { title: 'You Owe', dataIndex: 'total_outstanding_debt', key: 'debt', render: (v) => <Text style={{ color: theme.status.critical }} strong>{formatETB(v)}</Text> },
                {
                  title: 'Settlements',
                  dataIndex: 'settlements_status_metrics',
                  key: 'metrics',
                  render: (m) => (
                    <Space size={4} wrap>
                      {statusTag('Unpaid', m.unpaid, 'critical', <CloseCircleOutlined />)}
                      {statusTag('Partial', m.partial, 'warning', <ClockCircleOutlined />)}
                      {statusTag('Paid', m.fully_paid, 'good', <CheckCircleOutlined />)}
                    </Space>
                  )
                }
              ]}
            />
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};
