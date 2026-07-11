import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Alert, Empty } from 'antd';
import { TeamOutlined, SolutionOutlined, TransactionOutlined, CalendarOutlined } from '@ant-design/icons';
import { dashboardService } from '../../../services/dashboardService';

const { Text } = Typography;
const PIE_COLORS = ['#E46651', '#4A5B6D', '#21B799', '#faad14', '#1f74ac'];

export const EmployeeAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    dashboardService.getEmployeeAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Failed to initialize active payroll workforce data pipeline."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Aggregating corporate payroll logs..." /></div>;
  if (error) return <Alert message={<span>Analytics Connection Error</span>} description={error} type="error" showIcon />;
  if (!data) return <Empty description="No employee ledger logs registered in this module." />;

  const { metrics, charts, workforce_audit_ledger } = data;

  // Compute values for SVG Historical Outflows Chart scaling
  const grossValues = charts.payroll_historical_trends.map((t: any) => Number(t.gross_expenditure));
  const maxPayrollVal = Math.max(...grossValues, 1);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* 1. TOP-ROW STRATEGIC METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Active Headcount" value={Number(metrics.total_active_headcount)} precision={0} suffix="Staff Members" valueStyle={{ color: '#E46651' }} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Unsettled Advances & Fines" value={Number(metrics.unsettled_advances_total)} precision={2} suffix="ETB" valueStyle={{ color: '#faad14' }} prefix={<TransactionOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Cumulative Net Disbursed" value={Number(metrics.cumulative_net_payroll)} precision={2} suffix="ETB" valueStyle={{ color: '#21B799' }} prefix={<SolutionOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Projected Monthly Payroll" value={Number(metrics.projected_gross_monthly_payroll)} precision={2} suffix="ETB" valueStyle={{ color: '#4A5B6D' }} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 2. HIGH-IMPACT VISUALIZATION CHARTS */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* Dynamic Staff Role Allocation Board */}
        <Col xs={24} lg={10}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Personnel Allocation by Function</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {charts.role_distribution_split.map((item: any, i: number) => {
                const totalStaff = charts.role_distribution_split.reduce((acc: number, cur: any) => acc + item.staff_count, 0) || 1;
                const percent = Math.min(100, Math.round((item.staff_count / totalStaff) * 100));
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text><span style={{ inlineSize: '10px', blockSize: '10px', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', borderRadius: '50%', marginRight: '8px' }} />{item.role_display}</Text>
                      <Text strong>{item.staff_count} Staff ({percent}%)</Text>
                    </div>
                    <div style={{ inlineSize: '100%', blockSize: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ inlineSize: `${percent || 5}%`, blockSize: '100%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Vector SVG Dual Grouped Column Chart */}
        <Col xs={24} lg={14}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Historical Salary Outflows Expenditure Trends</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <div style={{ inlineSize: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg viewBox="0 0 500 200" style={{ inlineSize: '100%', maxBlockSize: '200px' }}>
                <g fill="none" stroke="#f0f0f0" strokeWidth="1">
                  <line x1="40" y1="20" x2="480" y2="20" />
                  <line x1="40" y1="70" x2="480" y2="70" />
                  <line x1="40" y1="120" x2="480" y2="120" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="#d9d9d9" />
                </g>
                {charts.payroll_historical_trends.map((item: any, i: number) => {
                  const barWidth = 20;
                  const groupSpacing = (420 / charts.payroll_historical_trends.length);
                  const groupX = 50 + (i * groupSpacing);
                  
                  const grossHeight = (Number(item.gross_expenditure) / maxPayrollVal) * 140;
                  const netHeight = (Number(item.net_distribution) / maxPayrollVal) * 140;
                  
                  return (
                    <g key={i}>
                      {/* Gross Target Bar */}
                      <rect x={groupX} y={170 - grossHeight} width={barWidth} height={grossHeight} fill="#4A5B6D" rx="2" />
                      {/* Actual Net Cash Paid Bar */}
                      <rect x={groupX + barWidth + 4} y={170 - netHeight} width={barWidth} height={netHeight} fill="#E46651" rx="2" />
                      
                      {/* Label Positioning */}
                      <text x={groupX + barWidth} y="190" fill="#595959" fontSize="9" textAnchor="middle" fontWeight="500">
                        {item.month.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center' }}>
                <span><span style={{ inlineSize: '12px', blockSize: '12px', backgroundColor: '#4A5B6D', display: 'inline-block', marginRight: '6px', borderRadius: '2px' }} />Gross Target</span>
                <span><span style={{ inlineSize: '12px', blockSize: '12px', backgroundColor: '#E46651', display: 'inline-block', marginRight: '6px', borderRadius: '2px' }} />Net Paid</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. COMPLETE WORKFORCE PAYROLL DIRECTORY */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Text strong style={{ color: '#714B67' }}>Comprehensive Corporate Personnel Compensation Ledger Directory</Text>} bordered={false} style={{ borderRadius: '8px' }}>
            <Table 
              size="small"
              pagination={{ pageSize: 5 }}
              dataSource={workforce_audit_ledger}
              rowKey="employee_id"
              columns={[
                { title: 'Full Name', dataIndex: 'full_name', key: 'full_name', render: (t: any) => <Text strong>{t}</Text> },
                { title: 'Job Designation', dataIndex: 'job_role', key: 'job_role' },
                { title: 'Branch Location', dataIndex: 'branch_name', key: 'branch_name' },
                { title: 'Contract Base Salary', dataIndex: 'monthly_salary', key: 'monthly_salary', render: (v: any) => `${Number(v).toLocaleString()} ETB` },
                { title: 'Tenure Status', dataIndex: 'tenure_days', key: 'tenure_days', render: (v: any) => `${v} Days Active` },
                { title: 'Unsettled Advances', dataIndex: 'outstanding_advances', key: 'outstanding_advances', render: (v: any) => <Text style={{ color: Number(v) > 0 ? '#faad14' : '#8c8c8c' }}>{Number(v).toLocaleString()} ETB</Text> },
                { title: 'Pending Fines', dataIndex: 'outstanding_fines', key: 'outstanding_fines', render: (v: any) => <Text type="danger">{Number(v).toLocaleString()} ETB</Text> },
                { title: 'Cycles Executed', dataIndex: 'completed_payslips_count', key: 'completed_payslips_count', render: (v: any) => <Tag color="blue">{v} Payslips</Tag> }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};