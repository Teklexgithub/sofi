import { useState, useEffect } from 'react';
import { Row, Col, Table, Tag, Typography, Spin, Alert, Empty, Input } from 'antd';
import { TeamOutlined, TransactionOutlined, SolutionOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../../../services/dashboardService';
import type { EmployeeAnalyticsResponse } from '../../../services/dashboardService';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartTheme, formatETB } from '../shared/chartTheme';
import ChartCard from '../shared/ChartCard';
import StatTile from '../shared/StatTile';
import PartToWholeBar from '../shared/PartToWholeBar';

const { Text } = Typography;

export const EmployeeAnalytics: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmployeeAnalyticsResponse | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  useEffect(() => {
    dashboardService.getEmployeeAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError(t('employee.states.loadErrorMessage')); setLoading(false); });
  }, [t]);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip={t('employee.states.loading')} /></div>;
  if (error) return <Alert message={t('employee.states.errorTitle')} description={error} type="error" showIcon />;
  if (!data) return <Empty description={t('employee.states.empty')} />;

  const { metrics, charts, workforce_audit_ledger } = data;
  const roleSegments = (charts.role_distribution_split || []).map((r, i) => ({
    name: r.role_display,
    value: Number(r.staff_count),
    color: theme.categorical[i % theme.categorical.length],
  }));

  return (
    <div>
      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<TeamOutlined />}
            label={t('employee.kpi.activeEmployees.label')}
            value={`${metrics.total_active_headcount}`}
            description={t('employee.kpi.activeEmployees.description')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<TransactionOutlined />}
            label={t('employee.kpi.unpaidAdvancesFines.label')}
            value={formatETB(metrics.unsettled_advances_total)}
            description={t('employee.kpi.unpaidAdvancesFines.description')}
            status={Number(metrics.unsettled_advances_total) > 0 ? 'warning' : 'good'}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<SolutionOutlined />}
            label={t('employee.kpi.totalPaidOut.label')}
            value={formatETB(metrics.cumulative_net_payroll)}
            description={t('employee.kpi.totalPaidOut.description')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            icon={<CalendarOutlined />}
            label={t('employee.kpi.expectedMonthlyPayroll.label')}
            value={formatETB(metrics.projected_gross_monthly_payroll)}
            description={t('employee.kpi.expectedMonthlyPayroll.description')}
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={10}>
          <ChartCard title={t('employee.charts.staffByRole.title')} description={t('employee.charts.staffByRole.description')}>
            <PartToWholeBar segments={roleSegments} unit={t('common:units.staff')} />
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard title={t('employee.charts.payrollTrend.title')} description={t('employee.charts.payrollTrend.description')}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.payroll_historical_trends} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.gridline} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: theme.textMuted, fontSize: 11 }}
                  axisLine={{ stroke: theme.axisLine }}
                  tickLine={false}
                  tickFormatter={(m: string) => m.split(' ')[0]}
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
                  formatter={(value: any, name: any) => [formatETB(Number(value)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: theme.textSecondary }} />
                <Bar dataKey="gross_expenditure" name={t('employee.charts.payrollTrend.grossPayroll')} fill={theme.categorical[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="net_distribution" name={t('employee.charts.payrollTrend.netPaid')} fill={theme.categorical[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            title={t('employee.table.title')}
            description={t('employee.table.description')}
            extra={
              <Input
                placeholder={t('employee.table.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={employeeSearchQuery}
                onChange={e => setEmployeeSearchQuery(e.target.value)}
                allowClear
                size="small"
                style={{ width: '260px' }}
              />
            }
          >
            <Table
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={workforce_audit_ledger.filter(e => {
                const q = employeeSearchQuery.toLowerCase();
                return e.full_name?.toLowerCase().includes(q) || e.job_role?.toLowerCase().includes(q) || e.branch_name?.toLowerCase().includes(q);
              })}
              rowKey="employee_id"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('employee.table.emptyText') }}
              columns={[
                { title: t('common:fields.name'), dataIndex: 'full_name', key: 'full_name', render: (v: string) => <Text strong>{v}</Text> },
                { title: t('common:fields.role'), dataIndex: 'job_role', key: 'job_role' },
                { title: t('common:fields.branch'), dataIndex: 'branch_name', key: 'branch_name' },
                { title: t('employee.table.columns.monthlySalary'), dataIndex: 'monthly_salary', key: 'monthly_salary', render: (v: number) => formatETB(v) },
                { title: t('employee.table.columns.tenure'), dataIndex: 'tenure_days', key: 'tenure_days', render: (v: number) => `${v} ${t('common:units.days')}` },
                { title: t('employee.table.columns.unpaidAdvances'), dataIndex: 'outstanding_advances', key: 'outstanding_advances', render: (v: number) => Number(v) > 0 ? <Text style={{ color: theme.status.warning }}>{formatETB(v)}</Text> : <Text type="secondary">{t('employee.table.none')}</Text> },
                { title: t('employee.table.columns.unpaidFines'), dataIndex: 'outstanding_fines', key: 'outstanding_fines', render: (v: number) => Number(v) > 0 ? <Text style={{ color: theme.status.critical }}>{formatETB(v)}</Text> : <Text type="secondary">{t('employee.table.none')}</Text> },
                { title: t('employee.table.columns.payslipsRun'), dataIndex: 'completed_payslips_count', key: 'completed_payslips_count', render: (v: number) => <Tag color="blue">{v}</Tag> }
              ]}
            />
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};
