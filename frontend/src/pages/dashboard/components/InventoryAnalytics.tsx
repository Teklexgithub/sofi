import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Alert, Empty } from 'antd';
import { GoldOutlined, WarningOutlined, DollarOutlined } from '@ant-design/icons';
import { dashboardService } from '../../../services/dashboardService';

const { Text } = Typography;
const COLORS = ['#008784', '#1f74ac', '#faad14', '#cf1322', '#714B67'];

export const InventoryAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    dashboardService.getInventoryAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Failed to initialize active inventory asset data pipeline."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Compiling real-time asset ledger metrics..." /></div>;
  if (error) return <Alert message={<span>Analytics Connection Error</span>} description={error} type="error" showIcon />;
  if (!data) return <Empty description="No stock balance footprints found inside warehouse tables." />;

  const { metrics, charts, vendors_ledger } = data;

  // Compute values for SVG Column Chart scaling
  const categoryVals = charts.category_investment_split.map((c: any) => Number(c.valuation));
  const maxCategoryVal = Math.max(...categoryVals, 1);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* 1. TOP-ROW STRATEGIC METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={8}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Total Inventory Asset Valuation" value={Number(metrics.total_asset_valuation)} precision={2} suffix="ETB" valueStyle={{ color: '#008784' }} prefix={<GoldOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Active Vendor Debt (Unpaid Supplies)" value={Number(metrics.active_vendor_debt)} precision={2} suffix="ETB" valueStyle={{ color: '#cf1322' }} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Critical Out-of-Stock Products" value={Number(metrics.stockout_warning_count)} precision={0} suffix="Items" valueStyle={{ color: metrics.stockout_warning_count > 0 ? '#ff4d4f' : '#8c8c8c' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 2. HIGH-IMPACT VISUALIZATION CHARTS MATRIX */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* Dynamic Horizontal Distribution Matrix Container */}
        <Col xs={24} lg={12}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Inventory Valuation Split by Location</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {charts.branch_valuation_split.map((item: any, i: number) => {
                const totalVal = charts.branch_valuation_split.reduce((acc: number, cur: any) => acc + Number(cur.valuation), 0) || 1;
                const pct = Math.min(100, Math.round((Number(item.valuation) / totalVal) * 100));
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <Text strong><span style={{ inlineSize: '12px', blockSize: '12px', backgroundColor: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: '50%', marginRight: '8px' }} />{item.branch_name}</Text>
                      <Text type="secondary">{Number(item.valuation).toLocaleString()} ETB ({pct}%)</Text>
                    </div>
                    <div style={{ inlineSize: '100%', blockSize: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ inlineSize: `${pct}%`, blockSize: '100%', backgroundColor: COLORS[i % COLORS.length], borderRadius: '6px', transition: 'width 0.5s ease-in-out' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Professional Vector SVG Column Chart */}
        <Col xs={24} lg={12}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Inventory Capital Allocation by Category</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ inlineSize: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg viewBox="0 0 400 200" style={{ inlineSize: '100%', maxBlockSize: '200px' }}>
                <g fill="none" stroke="#f0f0f0" strokeWidth="1">
                  <line x1="40" y1="20" x2="380" y2="20" />
                  <line x1="40" y1="70" x2="380" y2="70" />
                  <line x1="40" y1="120" x2="380" y2="120" />
                  <line x1="40" y1="170" x2="380" y2="170" stroke="#d9d9d9" />
                </g>
                {charts.category_investment_split.map((item: any, i: number) => {
                  const barWidth = 35;
                  const spacing = (340 / charts.category_investment_split.length);
                  const x = 55 + (i * spacing);
                  const barHeight = (Number(item.valuation) / maxCategoryVal) * 140;
                  const y = 170 - barHeight;
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} fill="#008784" rx="3" />
                      <text x={x + barWidth / 2} y="190" fill="#595959" fontSize="10" textAnchor="middle" fontWeight="500">{item.category}</text>
                      <text x={x + barWidth / 2} y={y - 6} fill="#262626" fontSize="9" textAnchor="middle" fontWeight="600">{Math.round(Number(item.valuation)/1000)}k</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. COMPREHENSIVE VENDOR DEPENDENCY LOGISTICS GRID */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Comprehensive Vendor Dependency Logistics Grid (All Vendors)</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <Table 
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={vendors_ledger}
              rowKey="vendor_id"
              columns={[
                { title: 'Corporate Registered Supplier', dataIndex: 'vendor_name', key: 'vendor_name', render: (t: any) => <Text strong>{t}</Text> },
                { title: 'Assigned Contact Representative', dataIndex: 'contact_person', key: 'contact_person' },
                { title: 'Aggregate Volume Supplied', dataIndex: 'total_pieces_received', key: 'total_pieces_received', render: (v: any) => `${Number(v).toLocaleString()} Pieces` },
                { title: 'Outstanding Debt Liability', dataIndex: 'pending_debt', key: 'pending_debt', render: (v: any) => <Text type="danger" strong>{Number(v).toLocaleString()} ETB</Text> }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};