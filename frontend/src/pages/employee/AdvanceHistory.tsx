import React, { useState, useEffect } from 'react';
import { Table, Input, Tag, Typography, Divider, message } from 'antd';
import { SearchOutlined, HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const AdvanceHistory: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLedgerEntries = async () => {
    setLoading(true);
    try {
      const res = await employeeService.getLedgerEntries();
      setLedgerEntries(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) {
      message.error("Failed to fetch historical ledger logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerEntries();
  }, []);

  const filteredEntries = ledgerEntries.filter(entry => 
    entry.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.entry_type_display?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { title: 'Employee Target', dataIndex: 'employee_name', key: 'employee_name', render: (text: string) => <Text strong>{text}</Text> },
    { 
      title: 'Transaction Type', 
      dataIndex: 'entry_type', 
      key: 'entry_type',
      render: (type: string, record: any) => (
        <Tag color={type === 'ADVANCE' ? 'blue' : 'volcano'}>{record.entry_type_display}</Tag>
      )
    },
    { title: 'Amount Charged', dataIndex: 'amount', key: 'amount', render: (amt: any) => <Text style={{ color: '#b72115', fontWeight: 'bold' }}>{Number(amt).toLocaleString()} ETB</Text> },
    { 
      title: 'Current Status', 
      dataIndex: 'is_settled', 
      key: 'is_settled',
      render: (settled: boolean) => (
        settled ? <Tag icon={<CheckCircleOutlined />} color="success">Settled on Payroll Run</Tag>
                : <Tag icon={<ExclamationCircleOutlined />} color="warning">Outstanding Liability</Tag>
      )
    },
    { title: 'Recorded Date', dataIndex: 'created_at', key: 'created_at', render: (date: string) => dayjs(date).format('MMMM DD, YYYY | hh:mm A') },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><HistoryOutlined /> Advances & Fines Statement History</Title>
        <Input
          size="large"
          placeholder="Query items by staff name..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ maxWidth: '350px', borderRadius: '6px' }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>
      <Divider style={{ margin: '12px 0 24px 0' }} />

      <Table 
        columns={columns} 
        dataSource={filteredEntries}
        rowKey="id"
        loading={loading}
        bordered
        expandable={{
          expandedRowRender: record => (
            <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: '4px' }}>
              <Text type="secondary" strong>Audit Narrative Reason Context: </Text>
              <Text>{record.description || "No description left."}</Text>
            </div>
          ),
        }}
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};