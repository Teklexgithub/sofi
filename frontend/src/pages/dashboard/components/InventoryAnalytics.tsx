import { useState, useEffect } from 'react';
import { Row, Col, Table, Typography, Spin, Alert, Empty, Input } from 'antd';
import { GoldOutlined, WarningOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../../services/dashboardService';
import type { InventoryAnalyticsResponse } from '../../../services/dashboardService';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme, formatETB } from '../shared/chartTheme';
import ChartCard from '../shared/ChartCard';
import StatTile from '../shared/StatTile';

const { Text } = Typography;

export const InventoryAnalytics: React.FC = () => {
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryAnalyticsResponse | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  useEffect(() => {
    dashboardService.getInventoryAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Couldn't load inventory data. Try refreshing the page."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Loading inventory data..." /></div>;
  if (error) return <Alert message="Inventory data unavailable" description={error} type="error" showIcon />;
  if (!data) return <Empty description="No stock recorded yet." />;

  const { metrics, charts, vendors_ledger } = data;

  const branchValuation = [...(charts.branch_valuation_split || [])].sort((a, b) => Number(b.valuation) - Number(a.valuation));
  const categoryValuation = [...(charts.category_investment_split || [])].sort((a, b) => Number(b.valuation) - Number(a.valuation));
  const hasStockouts = Number(metrics.stockout_warning_count) > 0;

  return (
    <div>
      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={8}>
          <StatTile
            icon={<GoldOutlined />}
            label="Total Stock Value"
            value={formatETB(metrics.total_asset_valuation)}
            description="Everything currently in your stores and shops"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatTile
            icon={<DollarOutlined />}
            label="Unpaid Deliveries"
            value={formatETB(metrics.active_vendor_debt)}
            description="What you owe vendors for stock already received"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatTile
            icon={<WarningOutlined />}
            label="Products Out of Stock"
            value={`${metrics.stockout_warning_count}`}
            description="Products with zero stock in both store and shop"
            status={hasStockouts ? 'critical' : 'good'}
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Stock Value by Branch" description="Where your inventory value is concentrated">
            <ResponsiveContainer width="100%" height={Math.max(160, branchValuation.length * 44)}>
              <BarChart data={branchValuation} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.gridline} horizontal={false} />
                <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={{ stroke: theme.axisLine }} tickLine={false} tickFormatter={(v) => formatETB(v, true)} />
                <YAxis type="category" dataKey="branch_name" tick={{ fill: theme.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: theme.textPrimary, fontWeight: 600 }}
                  formatter={(value: any) => [formatETB(Number(value)), 'Stock Value']}
                />
                <Bar dataKey="valuation" fill={theme.sequential} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard title="Stock Value by Category" description="Which product categories tie up the most money">
            <ResponsiveContainer width="100%" height={Math.max(160, categoryValuation.length * 44)}>
              <BarChart data={categoryValuation} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.gridline} horizontal={false} />
                <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={{ stroke: theme.axisLine }} tickLine={false} tickFormatter={(v) => formatETB(v, true)} />
                <YAxis type="category" dataKey="category" tick={{ fill: theme.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: theme.textPrimary, fontWeight: 600 }}
                  formatter={(value: any) => [formatETB(Number(value)), 'Stock Value']}
                />
                <Bar dataKey="valuation" fill={theme.sequential} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            title="Vendor Supply & Debt Summary"
            description="How much each vendor has delivered, and what you owe them"
            extra={
              <Input
                placeholder="Search by vendor or contact..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={vendorSearchQuery}
                onChange={e => setVendorSearchQuery(e.target.value)}
                allowClear
                size="small"
                style={{ width: '240px' }}
              />
            }
          >
            <Table
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={vendors_ledger.filter(v => {
                const q = vendorSearchQuery.toLowerCase();
                return v.vendor_name?.toLowerCase().includes(q) || v.contact_person?.toLowerCase().includes(q);
              })}
              rowKey="vendor_id"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'No vendor activity yet.' }}
              columns={[
                { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name', render: (t: string) => <Text strong>{t}</Text> },
                { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person', render: (t: string) => t || '—' },
                { title: 'Total Delivered', dataIndex: 'total_pieces_received', key: 'total_pieces_received', render: (v: number) => `${Number(v).toLocaleString()} pieces` },
                { title: 'You Owe', dataIndex: 'pending_debt', key: 'pending_debt', render: (v: number) => Number(v) > 0 ? <Text style={{ color: theme.status.critical }} strong>{formatETB(v)}</Text> : <Text type="secondary">Paid up</Text> }
              ]}
            />
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};
