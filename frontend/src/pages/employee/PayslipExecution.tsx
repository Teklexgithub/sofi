import React, { useState, useRef } from 'react';
import { Card, Button, Form, Select, Typography, Space, Divider, Descriptions, Input, message, Statistic, Row, Col, Modal } from 'antd';
import { UserOutlined, DollarOutlined, SaveOutlined, InfoCircleOutlined, CalculatorOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import PayslipDocument from '../../components/print/PayslipDocument';

const { Title, Text } = Typography;

interface PayslipExecutionProps {
  employees: any[];
}

export const PayslipExecution: React.FC<PayslipExecutionProps> = ({ employees }) => {
  const { t } = useTranslation('employee');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcData, setCalcData] = useState<any | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const [printPayslip, setPrintPayslip] = useState<any | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const payslipPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintPayslip = useReactToPrint({ contentRef: payslipPrintRef, documentTitle: 'Payslip' });

  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmpId(employeeId);
    setCalcLoading(true);
    setCalcData(null);
    try {
      const res = await employeeService.calculatePayroll(employeeId);
      setCalcData(res.data);
    } catch (err) {
      message.error(t('payslipExecution.calcFailed'));
    } finally {
      setCalcLoading(false);
    }
  };

  const handleExecutePayslip = async (values: any) => {
    setLoading(true);
    try {
      const res = await employeeService.executePayslip({
        employee: values.employee,
        notes: values.notes || ''
      });
      message.success(t('payslipExecution.executeSuccess'));
      setPrintPayslip(res.data);
      setShowPayslipModal(true);
    } catch (err) {
      message.error(t('payslipExecution.executeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClosePayslipModal = () => {
    setShowPayslipModal(false);
    form.resetFields();
    setCalcData(null);
    setSelectedEmpId(null);
    navigate('/employees?tab=payslip_history');
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><CalculatorOutlined /> {t('payslipExecution.title')}</Title>
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Form form={form} layout="vertical" onFinish={handleExecutePayslip} requiredMark={false}>
            <Form.Item name="employee" label={t('payslipExecution.employeeSelectLabel')} rules={[{ required: true, message: t('payslipExecution.employeeSelectRequired') }]}>
              <Select
                showSearch
                size="large"
                placeholder={t('payslipExecution.employeeSelectPlaceholder')}
                optionFilterProp="children"
                onChange={handleEmployeeChange}
              >
                {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name} ({e.job_role_display})</Select.Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="notes" label={t('payslipExecution.notesLabel')}>
              <Input.TextArea rows={4} placeholder={t('payslipExecution.notesPlaceholder')} />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button size="large" onClick={() => { form.resetFields(); setCalcData(null); }}>{t('payslipExecution.resetDesk')}</Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  disabled={!calcData}
                  style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}
                >
                  {t('payslipExecution.confirmExecute')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        {/* 🌟 Dynamic Live Calculation Breakdown Panel */}
        <Col xs={24} lg={12}>
          <Card
            title={<span><InfoCircleOutlined style={{ color: '#714B67' }} /> {t('payslipExecution.liveCalcTitle')}</span>}
            loading={calcLoading}
            style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
          >
            {calcData ? (
              <div>
                <Descriptions column={1} bordered size="small" style={{ marginBottom: '20px' }}>
                  <Descriptions.Item label={t('payslipExecution.accrualWindow')}>
                    <Text strong>{t('payslipExecution.periodRange', { start: calcData.calculation_start_date, end: calcData.calculation_end_date, days: calcData.days_calculated })}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('payslipExecution.contractRate')}>
                    <Text>{Number(calcData.monthly_salary_rate).toLocaleString()} {t('common:units.etb')} {t('payslipExecution.perMonth')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('payslipExecution.grossEarned')}>
                    <Text strong style={{ color: '#008784' }}>+ {Number(calcData.base_salary).toLocaleString()} {t('common:units.etb')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('payslipExecution.advanceDeductions')}>
                    <Text type="danger">- {Number(calcData.advance_deductions).toLocaleString()} {t('common:units.etb')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('payslipExecution.shortageDeductions')}>
                    <Text type="danger">- {Number(calcData.shortage_deductions).toLocaleString()} {t('common:units.etb')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('payslipExecution.totalDeductions')}>
                    <Text type="danger" strong>- {Number(calcData.total_deductions_applied).toLocaleString()} {t('common:units.etb')}</Text>
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ background: '#f6ffed', padding: '16px', borderRadius: '6px', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                  <Statistic
                    title={<Text strong style={{ color: '#389e0d' }}>{t('payslipExecution.finalNetPayout')}</Text>}
                    value={Number(calcData.final_net_cash_payout)}
                    precision={2}
                    suffix={t('common:units.etb')}
                    valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UserOutlined style={{ fontSize: '32px', color: '#bfbfbf', marginBottom: '12px' }} />
                <br />
                <Text type="secondary">{t('payslipExecution.emptyStateText')}</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={t('payslipExecution.modalTitle')}
        open={showPayslipModal}
        onCancel={handleClosePayslipModal}
        width={800}
        footer={[
          <Button key="close" onClick={handleClosePayslipModal}>{t('common:actions.close')}</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintPayslip()} style={{ background: '#714B67', borderColor: '#714B67' }}>
            {t('payslipExecution.printButton')}
          </Button>
        ]}
      >
        {printPayslip && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #eee' }}>
            <PayslipDocument
              ref={payslipPrintRef}
              payslip={printPayslip}
              calc={calcData}
              employee={employees.find(e => e.id === selectedEmpId)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};