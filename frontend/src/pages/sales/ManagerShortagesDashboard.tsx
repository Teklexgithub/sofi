import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Checkbox, Select, Space, 
  Typography, Divider, Alert, Input, message, Modal 
} from 'antd';
import {
  SafetyCertificateOutlined, SearchOutlined, AuditOutlined,
  CalendarOutlined, AlertOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import { useTranslation, Trans } from 'react-i18next';
import { salesService } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ManagerShortagesDashboard: React.FC = () => {
  const { t } = useTranslation('sales');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modal Runtime Tracking States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ shortageId: string, employeeId: string | null, employeeName: string } | null>(null);

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Alert message={t('managerShortages.accessDenied.title')} description={t('managerShortages.accessDenied.desc')} type="error" showIcon />
      </div>
    );
  }

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await salesService.getShortagesLedger();
      setLedgerData(Array.isArray(res.data) ? res.data : (res.data.results || []));

      const employeesRes = await salesService.getEmployeeProfiles(); 
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data.results || []));
    } catch (e) {
      message.error(t('managerShortages.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  const handleSelectChangeRequest = (shortageId: string, employeeId: string | null) => {
    if (!employeeId) {
      executeAssignmentUpdate(shortageId, null);
      return;
    }
    const targetStaff = employees.find(e => e.id === employeeId);
    setPendingAssignment({
      shortageId,
      employeeId,
      employeeName: targetStaff ? targetStaff.full_name : t('managerShortages.selectedStaffFallback')
    });
    setIsModalOpen(true);
  };

  const executeAssignmentUpdate = async (shortageId: string, employeeId: string | null) => {
    try {
      await salesService.settleShortageRecord(shortageId, { employee: employeeId });
      message.success(t('managerShortages.messages.assignSuccess'));
      loadDashboardData();
    } catch (err) {
      message.error(t('managerShortages.messages.assignFailed'));
    } finally {
      setIsModalOpen(false);
      setPendingAssignment(null);
    }
  };

  const toggleSalarySettlementStatus = async (record: any, checked: boolean) => {
    if (!record.employee) {
      return message.error(t('managerShortages.messages.assignEmployeeFirst'));
    }
    try {
      const payload = {
        is_settled_from_salary: checked,
        payroll_cycle_date: checked ? dayjs().format('YYYY-MM-DD') : undefined
      };
      await salesService.settleShortageRecord(record.id, payload);
      message.success(t('managerShortages.messages.statusSyncSuccess'));
      loadDashboardData();
    } catch (err) {
      message.error(t('managerShortages.messages.statusSyncFailed'));
    }
  };

  const getFilteredLedger = () => {
    if (!searchQuery.trim()) return ledgerData;
    const q = searchQuery.toLowerCase();
    return ledgerData.filter(item => 
      item.branch_name?.toLowerCase().includes(q) ||
      item.employee_name?.toLowerCase().includes(q)
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <AuditOutlined /> {t('managerShortages.title')}
        </Title>
        <Text type="secondary">
          {t('managerShortages.subtitle')}
        </Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <Input
            size="large"
            placeholder={t('managerShortages.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            allowClear
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Table
          dataSource={getFilteredLedger()}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: t('managerShortages.columns.dateLogged'),
              dataIndex: 'trading_date',
              key: 'trading_date',
              width: 130,
              render: (d) => <Text><CalendarOutlined /> {dayjs(d).format('YYYY-MM-DD')}</Text>
            },
            {
              title: t('managerShortages.columns.branch'),
              dataIndex: 'branch_name',
              key: 'branch_name',
              render: (txt) => (
                <Text strong style={{ color: '#714B67' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} /> {txt}
                </Text>
              )
            },
            {
              title: t('managerShortages.columns.shortageAmount'),
              dataIndex: 'shortage_amount',
              key: 'shortage_amount',
              align: 'right',
              width: 170,
              render: (val) => <Text type="danger" strong>{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
            },
            {
              title: t('managerShortages.columns.staffAssignment'),
              key: 'employee_assignment',
              width: 280,
              render: (_, rec) => (
                <Select
                  showSearch
                  placeholder={t('managerShortages.assignPlaceholder')}
                  style={{ width: '100%' }}
                  size="middle"
                  value={rec.employee || undefined}
                  onChange={(val) => handleSelectChangeRequest(rec.id, val)}
                  optionFilterProp="children"
                  // 🌟 LOCKED: Disables the selection box completely once a payroll run timestamp is present
                  disabled={rec.payroll_cycle_date !== null}
                >
                  {employees.map(emp => (
                    <Select.Option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.job_role_display || t('common:units.staff')})
                    </Select.Option>
                  ))}
                </Select>
              )
            },
            {
              title: t('managerShortages.columns.deductionStatus'),
              dataIndex: 'is_settled_from_salary',
              key: 'status',
              width: 160,
              align: 'center',
              render: (settled, rec) => {
                if (!rec.employee) return <Tag color="warning" icon={<AlertOutlined />}>{t('managerShortages.tags.awaitingAssignment')}</Tag>;
                return rec.payroll_cycle_date !== null ? (
                  <Tag color="success">{t('managerShortages.tags.salaryDeducted')}</Tag>
                ) : (
                  <Tag color="error">{t('managerShortages.tags.unsettledAccount')}</Tag>
                );
              }
            },
            {
              title: t('managerShortages.columns.payrollAction'),
              key: 'actions',
              width: 220,
              align: 'center',
              render: (_, rec) => (
                <Space size="middle">
                  <Checkbox
                    // 🌟 LOCKED: Prevents unchecking or editing once a payroll calculation run clears the row
                    disabled={!rec.employee || rec.payroll_cycle_date !== null}
                    checked={rec.payroll_cycle_date !== null || rec.is_settled_from_salary}
                    onChange={(e) => toggleSalarySettlementStatus(rec, e.target.checked)}
                  >
                    {t('managerShortages.deductFromSalary')}
                  </Checkbox>
                  {rec.payroll_cycle_date && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      ({dayjs(rec.payroll_cycle_date).format('MMM YYYY')})
                    </Text>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={<span><QuestionCircleOutlined style={{ color: '#faad14', marginRight: 8 }} /> {t('managerShortages.confirmModal.title')}</span>}
        open={isModalOpen}
        onOk={() => pendingAssignment && executeAssignmentUpdate(pendingAssignment.shortageId, pendingAssignment.employeeId)}
        onCancel={() => { setIsModalOpen(false); setPendingAssignment(null); }}
        okText={t('managerShortages.confirmModal.okText')}
        cancelText={t('common:actions.cancel')}
        okButtonProps={{ style: { backgroundColor: '#714B67', borderColor: '#714B67' } }}
      >
        <p>
          <Trans t={t} i18nKey="managerShortages.confirmModal.desc" values={{ name: pendingAssignment?.employeeName }} components={{ b: <b /> }} />
        </p>
        <p style={{ color: '#888', fontSize: '12px' }}>{t('managerShortages.confirmModal.note')}</p>
      </Modal>
    </div>
  );
};

export default ManagerShortagesDashboard;