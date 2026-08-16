import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Row, Col, Avatar, Form, Select, Typography, Space, message, Modal } from 'antd';
import { UserOutlined, SaveOutlined, DollarOutlined, InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import AdvanceVoucher from '../../components/print/AdvanceVoucher';

const { Title, Text } = Typography;

interface AdvanceRegistrationProps {
  employees: any[];
}

export const AdvanceRegistration: React.FC<AdvanceRegistrationProps> = ({ employees }) => {
  const { t } = useTranslation('employee');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [targetEmp, setTargetEmp] = useState<any | null>(null);

  const [printEntry, setPrintEntry] = useState<any | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const voucherPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintVoucher = useReactToPrint({ contentRef: voucherPrintRef, documentTitle: 'Advance Voucher' });

  const handleCreateLedgerEntry = async (values: any) => {
    setLoading(true);
    try {
      const res = await employeeService.createLedgerEntry({
        employee: values.employee,
        entry_type: values.entry_type,
        amount: Number(values.amount),
        description: values.description || ''
      });
      message.success(t('advanceRegistration.registerSuccess', { type: values.entry_type === 'ADVANCE' ? t('advanceRegistration.advanceTypeLabel') : t('advanceRegistration.fineTypeLabel') }));
      setPrintEntry(res.data);
      setShowVoucherModal(true);
    } catch (err) {
      message.error(t('advanceRegistration.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseVoucherModal = () => {
    setShowVoucherModal(false);
    form.resetFields();
    setTargetEmp(null);
    navigate('/employees?tab=advance_history');
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><DollarOutlined /> {t('advanceRegistration.title')}</Title>
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Form form={form} layout="vertical" onFinish={handleCreateLedgerEntry} requiredMark={false}>
            <Form.Item name="employee" label={t('advanceRegistration.employeeSelectLabel')} rules={[{ required: true, message: t('advanceRegistration.employeeSelectRequired') }]}>
              <Select
                showSearch
                size="large"
                placeholder={t('advanceRegistration.employeeSelectPlaceholder')}
                optionFilterProp="children"
                onChange={(id) => setTargetEmp(employees.find(e => e.id === id))}
              >
                {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name} ({e.job_role_display})</Select.Option>)}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="entry_type" label={t('advanceRegistration.entryTypeLabel')} rules={[{ required: true }]}>
                  <Select size="large" placeholder={t('advanceRegistration.entryTypePlaceholder')}>
                    <Select.Option value="ADVANCE">{t('advanceRegistration.entryTypeAdvance')}</Select.Option>
                    <Select.Option value="ADJUSTMENT">{t('advanceRegistration.entryTypeFine')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="amount" label={t('advanceRegistration.amountLabel')} rules={[{ required: true, message: t('advanceRegistration.amountRequired') }]}>
                  <Input type="number" step="0.01" size="large" placeholder="0.00" prefix={<DollarOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={t('advanceRegistration.descriptionLabel')} rules={[{ required: true, message: t('advanceRegistration.descriptionRequired') }]}>
              <Input.TextArea rows={4} placeholder={t('advanceRegistration.descriptionPlaceholder')} />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button size="large" onClick={() => { form.resetFields(); setTargetEmp(null); }}>{t('advanceRegistration.clearForm')}</Button>
                <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                  {t('advanceRegistration.registerButton')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        <Col xs={24} lg={10}>
          {targetEmp ? (
            <Card title={<span><UserOutlined /> {t('advanceRegistration.previewTitle')}</span>} style={{ background: '#fafafa', borderRadius: '8px' }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={t('advanceRegistration.fullNameLabel')}><Text strong>{targetEmp.full_name}</Text></Descriptions.Item>
                <Descriptions.Item label={t('advanceRegistration.designatedRole')}>{targetEmp.job_role_display}</Descriptions.Item>
                <Descriptions.Item label={t('advanceRegistration.baseSalary')}><Text style={{ color: '#008784', fontWeight: 'bold' }}>{Number(targetEmp.monthly_salary).toLocaleString()} {t('common:units.etb')}</Text></Descriptions.Item>
                <Descriptions.Item label={t('advanceRegistration.stationAssignment')}>{targetEmp.branch_name}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '8px', padding: '40px' }}>
              <Text type="secondary"><InfoCircleOutlined /> {t('advanceRegistration.emptyPreview')}</Text>
            </div>
          )}
        </Col>
      </Row>

      <Modal
        title={t('advanceRegistration.modalTitle')}
        open={showVoucherModal}
        onCancel={handleCloseVoucherModal}
        width={700}
        footer={[
          <Button key="close" onClick={handleCloseVoucherModal}>{t('common:actions.close')}</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintVoucher()} style={{ background: '#714B67', borderColor: '#714B67' }}>
            {t('advanceRegistration.printButton')}
          </Button>
        ]}
      >
        {printEntry && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #eee' }}>
            <AdvanceVoucher ref={voucherPrintRef} entry={printEntry} employee={targetEmp} />
          </div>
        )}
      </Modal>
    </div>
  );
};
import { Divider, Descriptions } from 'antd';