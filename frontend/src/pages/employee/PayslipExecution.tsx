import React, { useState, useRef } from 'react';
import { Card, Button, Form, Select, Typography, Space, Divider, Descriptions, Input, message, Statistic, Row, Col, Modal } from 'antd';
import { UserOutlined, DollarOutlined, SaveOutlined, InfoCircleOutlined, CalculatorOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import PayslipDocument from '../../components/print/PayslipDocument';

const { Title, Text } = Typography;

interface PayslipExecutionProps {
  employees: any[];
}

export const PayslipExecution: React.FC<PayslipExecutionProps> = ({ employees }) => {
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
      message.error("Failed to calculate active payroll ledger splits.");
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
      message.success("Monthly payslip run finalized and locked successfully.");
      setPrintPayslip(res.data);
      setShowPayslipModal(true);
    } catch (err) {
      message.error("Failed to execute corporate payroll transaction run.");
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
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><CalculatorOutlined /> Execute Payroll Payout Desk</Title>
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Form form={form} layout="vertical" onFinish={handleExecutePayslip} requiredMark={false}>
            <Form.Item name="employee" label="Select Profile for Monthly Payroll Run" rules={[{ required: true, message: 'Select target employee' }]}>
              <Select 
                showSearch 
                size="large"
                placeholder="Select Employee..." 
                optionFilterProp="children"
                onChange={handleEmployeeChange}
              >
                {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name} ({e.job_role_display})</Select.Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="Internal Payroll Remarks / Audit Notes">
              <Input.TextArea rows={4} placeholder="Add specific remarks regarding this monthly payout transaction cycle context..." />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button size="large" onClick={() => { form.resetFields(); setCalcData(null); }}>Reset Desk</Button>
                <Button 
                  type="primary" 
                  size="large" 
                  htmlType="submit" 
                  icon={<SaveOutlined />} 
                  loading={loading} 
                  disabled={!calcData}
                  style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}
                >
                  Confirm & Execute Payout
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        {/* 🌟 Dynamic Live Calculation Breakdown Panel */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span><InfoCircleOutlined style={{ color: '#714B67' }} /> Live Payroll Calculations Ledger Split</span>} 
            loading={calcLoading}
            style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
          >
            {calcData ? (
              <div>
                <Descriptions column={1} bordered size="small" style={{ marginBottom: '20px' }}>
                  <Descriptions.Item label="Accrual Interval Window Basis">
                    <Text strong>{calcData.calculation_start_date} to {calcData.calculation_end_date} ({calcData.days_calculated} Days Calculated)</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Contract Base Monthly Rate Reference">
                    <Text>{Number(calcData.monthly_salary_rate).toLocaleString()} ETB / Month</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Accrued Gross Earned Salary Breakdown">
                    <Text strong style={{ color: '#008784' }}>+ {Number(calcData.base_salary).toLocaleString()} ETB</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Employee App Deductions (Advances/Fines)">
                    <Text type="danger">- {Number(calcData.advance_deductions).toLocaleString()} ETB</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Sales App Deductions (Floor Shortages)">
                    <Text type="danger">- {Number(calcData.shortage_deductions).toLocaleString()} ETB</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Applied Liabilities Deductions">
                    <Text type="danger" strong>- {Number(calcData.total_deductions_applied).toLocaleString()} ETB</Text>
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ background: '#f6ffed', padding: '16px', borderRadius: '6px', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                  <Statistic 
                    title={<Text strong style={{ color: '#389e0d' }}>Final Net Cash Payout Distribution</Text>}
                    value={Number(calcData.final_net_cash_payout)}
                    precision={2}
                    suffix="ETB"
                    valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UserOutlined style={{ fontSize: '32px', color: '#bfbfbf', marginBottom: '12px' }} />
                <br />
                <Text type="secondary">Select a staff profile from the left to calculate live cross-app deductions balances automatically.</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Payslip Executed"
        open={showPayslipModal}
        onCancel={handleClosePayslipModal}
        width={800}
        footer={[
          <Button key="close" onClick={handleClosePayslipModal}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintPayslip()} style={{ background: '#714B67', borderColor: '#714B67' }}>
            Print Payslip
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