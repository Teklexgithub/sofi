import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Alert, Empty, Space } from 'antd';
import { ArrowUpOutlined, FallOutlined, WalletOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { dashboardService } from '../../../services/dashboardService';

const { Text } = Typography;
const PIE_COLORS = ['#52c41a', '#1890ff', '#faad14'];

export const SalesAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    dashboardService.getSalesAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Failed to initialize active sales performance data pipeline."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Aggregating transactional metrics..." /></div>;
  if (error) return <Alert message={<span>Analytics Connection Error</span>} description={error} type="error" showIcon />;
  if (!data) return <Empty description="No transactional balance records logged inside database system." />;

  const { metrics, charts, vendors_credit_ledger } = data;

  // 1. Data Parsing for 30-Day Revenue vs Shortage SVG Area Chart
  const timelineData = charts.revenue_shortage_timeline || [];
  const grossSalesVals = timelineData.map((d: any) => Number(d.gross_sales || 0));
  const maxSalesVal = Math.max(...grossSalesVals, 1000);

  // Generate SVG Path for Gross Revenue (Smooth Area Fill)
  let revenuePath = "";
  let revenueAreaPath = "";
  if (timelineData.length > 1) {
    const widthSpacing = 340 / (timelineData.length - 1);
    timelineData.forEach((d: any, i: number) => {
      const x = 40 + i * widthSpacing;
      const h = (Number(d.gross_sales || 0) / maxSalesVal) * 130;
      const y = 160 - h;
      if (i === 0) {
        revenuePath = `M ${x} ${y}`;
        revenueAreaPath = `M ${x} 160 L ${x} ${y}`;
      } else {
        revenuePath += ` L ${x} ${y}`;
        revenueAreaPath += ` L ${x} ${y}`;
      }
      if (i === timelineData.length - 1) {
        revenueAreaPath += ` L ${x} 160 Z`;
      }
    });
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* 1. TOP-ROW STRATEGIC METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Gross Revenue Today" value={Number(metrics.gross_revenue_today)} precision={2} suffix="ETB" valueStyle={{ color: '#3f8600' }} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Active Shortages Leakage" value={Number(metrics.active_shortages_unsettled)} precision={2} suffix="ETB" valueStyle={{ color: '#cf1322' }} prefix={<FallOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Total Customer Debt Exposure" value={Number(metrics.total_customer_debt)} precision={2} suffix="ETB" valueStyle={{ color: '#faad14' }} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Net Realized Liquid Flow (Today)" value={Number(metrics.net_cash_intake_today)} precision={2} suffix="ETB" valueStyle={{ color: '#1890ff' }} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 2. HIGH-IMPACT VISUALIZATION CHARTS MATRIX */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* SVG Area Spark-Timeline Chart */}
        <Col xs={24} xl={16}>
          <Card title={<Text strong style={{ color: '#714B67' }}>30-Day Revenue Pacing Timeline Trend</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              <svg viewBox="0 0 400 180" style={{ width: '100%', maxHeight: '220px' }}>
                <g fill="none" stroke="#f0f0f0" strokeWidth="1">
                  <line x1="40" y1="30" x2="380" y2="30" />
                  <line x1="40" y1="95" x2="380" y2="95" />
                  <line x1="40" y1="160" x2="380" y2="160" stroke="#d9d9d9" />
                </g>
                {timelineData.length > 1 && (
                  <>
                    {/* Area Shading */}
                    <path d={revenueAreaPath} fill="#714B67" fillOpacity="0.08" />
                    {/* Trend Line */}
                    <path d={revenuePath} stroke="#714B67" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                )}
                {/* Timeline axis endpoints */}
                {timelineData.length > 0 && (
                  <>
                    <text x="40" y="175" fill="#8c8c8c" fontSize="8" textAnchor="start">{timelineData[0].date}</text>
                    <text x="380" y="175" fill="#8c8c8c" fontSize="8" textAnchor="end">{timelineData[timelineData.length - 1].date}</text>
                  </>
                )}
              </svg>
            </div>
          </Card>
        </Col>

        {/* Modular Composition Share Mix Tracker */}
        <Col xs={24} xl={8}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Cash Intake Composition Share Mix</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text><span style={{ inlineSize: '10px', blockSize: '10px', backgroundColor: PIE_COLORS[0], display: 'inline-block', borderRadius: '50%', marginRight: '8px' }} />Physical Cash</Text>
                  <Text strong>{charts.revenue_composition_mix.physical_cash_percentage}%</Text>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${charts.revenue_composition_mix.physical_cash_percentage}%`, height: '100%', background: PIE_COLORS[0] }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text><span style={{ inlineSize: '10px', blockSize: '10px', backgroundColor: PIE_COLORS[1], display: 'inline-block', borderRadius: '50%', marginRight: '8px' }} />Digital Wallets</Text>
                  <Text strong>{charts.revenue_composition_mix.digital_wallet_percentage}%</Text>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${charts.revenue_composition_mix.digital_wallet_percentage}%`, height: '100%', background: PIE_COLORS[1] }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text><span style={{ inlineSize: '10px', blockSize: '10px', backgroundColor: PIE_COLORS[2], display: 'inline-block', borderRadius: '50%', marginRight: '8px' }} />Issued Credits</Text>
                  <Text strong>{charts.revenue_composition_mix.credit_payouts_percentage}%</Text>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${charts.revenue_composition_mix.credit_payouts_percentage}%`, height: '100%', background: PIE_COLORS[2] }} />
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. LEADERBOARDS & CREDIT BALANCE TABLES */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Branch Revenue Leaderboard</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <Table 
              size="small"
              pagination={{ pageSize: 4 }}
              dataSource={charts.branch_sales_leaderboard}
              rowKey="branch_name"
              columns={[
                { title: 'Rank', key: 'index', width: 60, render: (_, __, i) => <Text strong>#{i + 1}</Text> },
                { title: 'Operational Station Location', dataIndex: 'branch_name', key: 'branch_name' },
                { title: 'Total Revenue', dataIndex: 'total_sales_revenue', key: 'total_sales_revenue', align: 'right', render: (val) => `${Number(val).toLocaleString()} ETB` }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Comprehensive Corporate Supplier Liability Matrix</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <Table 
              size="small"
              pagination={{ pageSize: 4 }}
              dataSource={vendors_credit_ledger}
              rowKey="vendor_id"
              columns={[
                { title: 'Registered Vendor Target', dataIndex: 'vendor_name', key: 'vendor_name', render: (t) => <Text strong>{t}</Text> },
                { title: 'Pre-Payments Float', dataIndex: 'advance_prepayment_balance', key: 'advance', render: (v) => <Text style={{ color: '#52c41a' }}>{Number(v).toLocaleString()} ETB</Text> },
                { title: 'Outstanding Debt', dataIndex: 'total_outstanding_debt', key: 'debt', render: (v) => <Text type="danger" strong>{Number(v).toLocaleString()} ETB</Text> },
                { 
                  title: 'Cycle Breakdown Status', 
                  dataIndex: 'settlements_status_metrics', 
                  key: 'metrics', 
                  render: (m) => (
                    <Space size={4}>
                      <Tag color="red">Unpaid: {m.unpaid}</Tag>
                      <Tag color="orange">Partial: {m.partial}</Tag>
                      <Tag color="green">Paid: {m.fully_paid}</Tag>
                    </Space>
                  ) 
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};