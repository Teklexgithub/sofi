import React, { useState, useEffect, useRef } from 'react';
import { Table, Input, Tag, Typography, Divider, message, Button } from 'antd';
import { SearchOutlined, HistoryOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import PayslipDocument from '../../components/print/PayslipDocument';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const PayslipHistory: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [printPayslip, setPrintPayslip] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Payslip' });

  const handlePrintRow = (record: any) => {
    setPrintPayslip(record);
    setTimeout(() => handlePrint(), 0);
  };

  const loadHistoryLogs = async () => {
    setLoading(true);
    try {
      const res = await employeeService.getPayslipsHistory();
      setHistory(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) {
      message.error("Failed to load historical payroll distribution ledger receipts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryLogs();
  }, []);

  const filteredHistory = history.filter(item => 
    item.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.branch_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { title: 'Payslip ID Token', dataIndex: 'id', key: 'id', render: (id: string) => <Tag color="purple">#PAY-{id.substring(0, 8).toUpperCase()}</Tag> },
    { title: 'Employee Recipient', dataIndex: 'employee_name', key: 'employee_name', render: (text: string) => <Text strong>{text}</Text> },
    { title: 'Assigned Station', dataIndex: 'branch_name', key: 'branch_name' },
    { title: 'Contract Base Salary', dataIndex: 'base_salary_snapshot', key: 'base_salary_snapshot', render: (amt: any) => `${Number(amt).toLocaleString()} ETB` },
    { title: 'Liabilities Deductions', dataIndex: 'total_deductions_applied', key: 'total_deductions_applied', render: (amt: any) => <Text type="danger">-{Number(amt).toLocaleString()} ETB</Text> },
    { title: 'Final Disbursed Net', dataIndex: 'final_net_cash_payout', key: 'final_net_cash_payout', render: (amt: any) => <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{Number(amt).toLocaleString()} ETB</Text> },
    { title: 'Settlement Run Date', dataIndex: 'executed_at', key: 'executed_at', render: (date: string) => dayjs(date).format('MMMM DD, YYYY | hh:mm A') },
    {
      title: 'Print',
      key: 'print_action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintRow(record)}>Print</Button>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><HistoryOutlined /> Finalized Payslips Execution Archive</Title>
        <Input
          size="large"
          placeholder="Query historical records by name or station..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ maxWidth: '380px', borderRadius: '6px' }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Table
        columns={columns}
        dataSource={filteredHistory}
        rowKey="id"
        loading={loading}
        bordered
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: record => (
            <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: '4px' }}>
              <Text type="secondary" strong><FileTextOutlined /> Transaction Run Audit Notes: </Text>
              <Text>{record.notes || "No remarks notes recorded during payroll processing runtime execution."}</Text>
            </div>
          ),
        }}
        pagination={{ pageSize: 15 }}
      />

      {printPayslip && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PayslipDocument ref={printRef} payslip={printPayslip} />
        </div>
      )}
    </div>
  );
};