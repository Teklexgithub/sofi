import React, { useState, useEffect, useRef } from 'react';
import { Table, Input, Tag, Typography, Divider, message, Button } from 'antd';
import { SearchOutlined, HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { employeeService } from '../../services/employeeService';
import AdvanceVoucher from '../../components/print/AdvanceVoucher';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const AdvanceHistory: React.FC = () => {
  const { t } = useTranslation('employee');
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [printEntry, setPrintEntry] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Advance Voucher' });

  const handlePrintRow = (record: any) => {
    setPrintEntry(record);
    setTimeout(() => handlePrint(), 0);
  };

  const loadLedgerEntries = async () => {
    setLoading(true);
    try {
      const res = await employeeService.getLedgerEntries();
      setLedgerEntries(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) {
      message.error(t('advanceHistory.loadFailed'));
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
    { title: t('advanceHistory.columns.employee'), dataIndex: 'employee_name', key: 'employee_name', render: (text: string) => <Text strong>{text}</Text> },
    {
      title: t('advanceHistory.columns.type'),
      dataIndex: 'entry_type',
      key: 'entry_type',
      render: (type: string, record: any) => (
        <Tag color={type === 'ADVANCE' ? 'blue' : 'volcano'}>{record.entry_type_display}</Tag>
      )
    },
    { title: t('advanceHistory.columns.amount'), dataIndex: 'amount', key: 'amount', render: (amt: any) => <Text style={{ color: '#b72115', fontWeight: 'bold' }}>{Number(amt).toLocaleString()} {t('common:units.etb')}</Text> },
    {
      title: t('advanceHistory.columns.status'),
      dataIndex: 'is_settled',
      key: 'is_settled',
      render: (settled: boolean) => (
        settled ? <Tag icon={<CheckCircleOutlined />} color="success">{t('advanceHistory.statusSettled')}</Tag>
                : <Tag icon={<ExclamationCircleOutlined />} color="warning">{t('advanceHistory.statusOutstanding')}</Tag>
      )
    },
    { title: t('advanceHistory.columns.date'), dataIndex: 'created_at', key: 'created_at', render: (date: string) => dayjs(date).format('MMMM DD, YYYY | hh:mm A') },
    {
      title: t('common:actions.print'),
      key: 'print_action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintRow(record)}>{t('common:actions.print')}</Button>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0, color: '#714B67' }}><HistoryOutlined /> {t('advanceHistory.title')}</Title>
        <Input
          size="large"
          placeholder={t('advanceHistory.searchPlaceholder')}
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
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: record => (
            <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: '4px' }}>
              <Text type="secondary" strong>{t('advanceHistory.auditNotesLabel')} </Text>
              <Text>{record.description || t('advanceHistory.noDescription')}</Text>
            </div>
          ),
        }}
        pagination={{ pageSize: 15 }}
      />

      {printEntry && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <AdvanceVoucher ref={printRef} entry={printEntry} />
        </div>
      )}
    </div>
  );
};