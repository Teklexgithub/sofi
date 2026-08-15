import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Row, Col, Avatar, Form, Select, Typography, Space, message, Modal } from 'antd';
import { UserOutlined, SaveOutlined, DollarOutlined, InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import AdvanceVoucher from '../../components/print/AdvanceVoucher';

const { Title, Text } = Typography;

interface AdvanceRegistrationProps {
  employees: any[];
}

export const AdvanceRegistration: React.FC<AdvanceRegistrationProps> = ({ employees }) => {
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
      message.success(`Recorded ${values.entry_type === 'ADVANCE' ? 'Cash Advance' : 'Fine'} successfully.`);
      setPrintEntry(res.data);
      setShowVoucherModal(true);
    } catch (err) {
      message.error("Failed to register ledger adjustment entry.");
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
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><DollarOutlined /> Issue Staff Cash Advance or Fine</Title>
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Form form={form} layout="vertical" onFinish={handleCreateLedgerEntry} requiredMark={false}>
            <Form.Item name="employee" label="Select Target Employee Profile" rules={[{ required: true, message: 'Select employee' }]}>
              <Select 
                showSearch 
                size="large"
                placeholder="Type name to query cluster profile..." 
                optionFilterProp="children"
                onChange={(id) => setTargetEmp(employees.find(e => e.id === id))}
              >
                {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name} ({e.job_role_display})</Select.Option>)}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="entry_type" label="Transaction Ledger Entry Type" rules={[{ required: true }]}>
                  <Select size="large" placeholder="Select Type">
                    <Select.Option value="ADVANCE">Salary Cash Advance</Select.Option>
                    <Select.Option value="ADJUSTMENT">Other Manual Deduction Fine</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="amount" label="Transaction Amount (ETB)" rules={[{ required: true, message: 'Input value' }]}>
                  <Input type="number" step="0.01" size="large" placeholder="0.00" prefix={<DollarOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Audit Statement Narrative Reason Context" rules={[{ required: true, message: 'Input explanation notes' }]}>
              <Input.TextArea rows={4} placeholder="Provide explanation details for this payroll debit adjustment context..." />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button size="large" onClick={() => { form.resetFields(); setTargetEmp(null); }}>Clear Form</Button>
                <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                  Register Statement Transaction
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        <Col xs={24} lg={10}>
          {targetEmp ? (
            <Card title={<span><UserOutlined /> Target Selected Profile Preview</span>} style={{ background: '#fafafa', borderRadius: '8px' }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Full Name"><Text strong>{targetEmp.full_name}</Text></Descriptions.Item>
                <Descriptions.Item label="Designated Role">{targetEmp.job_role_display}</Descriptions.Item>
                <Descriptions.Item label="Base Monthly Salary"><Text style={{ color: '#008784', fontWeight: 'bold' }}>{Number(targetEmp.monthly_salary).toLocaleString()} ETB</Text></Descriptions.Item>
                <Descriptions.Item label="Station Assignment">{targetEmp.branch_name}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '8px', padding: '40px' }}>
              <Text type="secondary"><InfoCircleOutlined /> Select an employee on the left to review their structural compensation parameters context live here before execution.</Text>
            </div>
          )}
        </Col>
      </Row>

      <Modal
        title="Transaction Registered"
        open={showVoucherModal}
        onCancel={handleCloseVoucherModal}
        width={700}
        footer={[
          <Button key="close" onClick={handleCloseVoucherModal}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintVoucher()} style={{ background: '#714B67', borderColor: '#714B67' }}>
            Print Voucher
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