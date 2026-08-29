import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Select, DatePicker, Button, Table,
  Tag, InputNumber, Statistic, message, Typography, Space, Radio, Modal, Input
} from 'antd';
import {
  FileTextOutlined, HistoryOutlined, SearchOutlined,
  CheckCircleOutlined, InfoCircleOutlined, DownOutlined,
  DollarCircleOutlined, PrinterOutlined, TruckOutlined, WarningOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { useTranslation, Trans } from 'react-i18next';
import dayjs from 'dayjs';
import { inventoryService } from '../../services/inventoryService';
import { salesService } from '../../services/salesService';
import VendorSettlementVoucher from '../../components/print/VendorSettlementVoucher';
import VendorDeliveryReport from '../../components/print/VendorDeliveryReport';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

interface DeliveryLog {
  id: string;
  date_received: string;
  product_name: string;
  packs_received: number;
  pieces_per_pack: number;
  calculated_pieces_count: number;
  buying_price_unit: number;
  calculated_row_subtotal: number;
}

interface DeductionLog {
  id: string;
  report_date: string;
  product_name: string;
  branch_name: string;
  quantity: number;
  buying_price_unit: number;
  calculated_row_subtotal: number;
}

interface WorksheetPayload {
  vendor_id: string;
  calculated_batch_cost: number;
  total_quality_deductions: number;
  available_past_advance: number;
  net_balance_due: number;
  itemized_deliveries: DeliveryLog[];
  itemized_deductions: DeductionLog[];
}

export const VendorSettlements: React.FC = () => {
  const { t } = useTranslation('sales');
  const [vendors, setVendors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);

  // Core filter parameters
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<any>(null);
  
  // Runtime states
  const [worksheetData, setWorksheetData] = useState<WorksheetPayload | null>(null);
  const [amountHandedOver, setAmountHandedOver] = useState<number>(0);

  // History Tab States
  const [historicalSettlements, setHistoricalSettlements] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');

  // --- PRINTABLE VOUCHER STATE ---
  const [printSettlement, setPrintSettlement] = useState<any | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const voucherPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintVoucher = useReactToPrint({ contentRef: voucherPrintRef, documentTitle: 'Vendor Settlement Voucher' });

  // --- DELIVERY REPORT TAB STATES ---
  const [deliveryVendor, setDeliveryVendor] = useState<string | null>(null);
  const [deliveryDateRange, setDeliveryDateRange] = useState<any>(null);
  const [deliveryRows, setDeliveryRows] = useState<any[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const deliveryReportPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintDeliveryReport = useReactToPrint({ contentRef: deliveryReportPrintRef, documentTitle: 'Vendor Delivery Report' });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (activeTab === '2' && selectedVendor) {
      fetchPaymentHistory();
    }
  }, [selectedVendor, activeTab]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getVendors();
      if (response.data && Array.isArray(response.data)) {
        setVendors(response.data);
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        setVendors(response.data.results);
      } else {
        setVendors([]);
      }
    } catch (error) {
      message.error(t('vendorSettlements.messages.loadVendorsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      const res = await salesService.getSettlements(selectedVendor);
      setHistoricalSettlements(res.data || []);
    } catch (err) {
      message.error(t('vendorSettlements.messages.loadHistoryFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatement = async () => {
    if (!selectedVendor || !dateRange) {
      return message.warning(t('vendorSettlements.messages.selectVendorAndRange'));
    }
    setLoading(true);
    try {
      const startStr = dateRange[0].format('YYYY-MM-DD');
      const endStr = dateRange[1].format('YYYY-MM-DD');

      const res = await salesService.getStatementWorksheet(selectedVendor, startStr, endStr);
      setWorksheetData(res.data);
      setAmountHandedOver(res.data.net_balance_due);
      message.success(t('vendorSettlements.messages.statementCompiled'));
    } catch (err) {
      message.error(t('vendorSettlements.messages.statementFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePostSettlement = async () => {
    if (!worksheetData || worksheetData.itemized_deliveries.length === 0 || !selectedVendor) return;

    setLoading(true);
    try {
      const supplyLogIds = worksheetData.itemized_deliveries
        .filter((log: DeliveryLog) => log.id !== "prior-debt-liability-node")
        .map((log: DeliveryLog) => log.id);

      const res = await salesService.createSettlement({
        vendor_id: selectedVendor,
        supply_log_ids: supplyLogIds,
        amount_handed_over: amountHandedOver
      });

      message.success(t('vendorSettlements.messages.settlementSuccess'));

      setPrintSettlement(res.data);
      setShowVoucherModal(true);
    } catch (err) {
      message.error(t('vendorSettlements.messages.settlementFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseVoucherModal = () => {
    setShowVoucherModal(false);
    setWorksheetData(null);
    setSelectedVendor(null);
    setDateRange(null);
    setAmountHandedOver(0);
  };

  const handlePrintHistoryRow = (record: any) => {
    setPrintSettlement(record);
    setTimeout(() => handlePrintVoucher(), 0);
  };

  const handleGenerateDeliveryReport = async () => {
    if (!deliveryVendor || !deliveryDateRange) {
      return message.warning(t('vendorSettlements.messages.selectVendorAndRangeShort'));
    }
    setDeliveryLoading(true);
    try {
      const startStr = deliveryDateRange[0].format('YYYY-MM-DD');
      const endStr = deliveryDateRange[1].format('YYYY-MM-DD');
      const res = await inventoryService.getVendorDeliveryReport(deliveryVendor, startStr, endStr);
      setDeliveryRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error(t('vendorSettlements.messages.deliveryReportFailed'));
    } finally {
      setDeliveryLoading(false);
    }
  };

  const columns = [
    {
      title: t('vendorSettlements.columns.dateReceived'),
      dataIndex: 'date_received',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: t('common:fields.product'),
      dataIndex: 'product_name',
    },
    {
      title: t('vendorSettlements.columns.packsReceived'),
      dataIndex: 'packs_received',
      align: 'right' as const,
      render: (v: number) => <Text strong>{v} {t('common:units.packs')}</Text>
    },
    {
      title: t('vendorSettlements.columns.convertedPieces'),
      dataIndex: 'calculated_pieces_count',
      align: 'right' as const,
    },
    {
      title: t('vendorSettlements.columns.unitBuyPrice'),
      dataIndex: 'buying_price_unit',
      align: 'right' as const,
      render: (v: number) => `${Number(v).toFixed(2)} ${t('common:units.etb')}`
    },
    {
      title: t('vendorSettlements.columns.subtotalCost'),
      dataIndex: 'calculated_row_subtotal',
      align: 'right' as const,
      render: (v: number) => <Text type="danger" strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
    },
  ];

  const deductionColumns = [
    {
      title: t('vendorSettlements.columns.reportDate'),
      dataIndex: 'report_date',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: t('common:fields.product'),
      dataIndex: 'product_name',
    },
    {
      title: t('common:fields.branch'),
      dataIndex: 'branch_name',
      render: (v: string) => <Tag color="purple">{v}</Tag>
    },
    {
      title: t('common:fields.quantity'),
      dataIndex: 'quantity',
      align: 'right' as const,
    },
    {
      title: t('vendorSettlements.columns.unitBuyPrice'),
      dataIndex: 'buying_price_unit',
      align: 'right' as const,
      render: (v: number) => `${Number(v).toFixed(2)} ${t('common:units.etb')}`
    },
    {
      title: t('vendorSettlements.columns.subtotalCost'),
      dataIndex: 'calculated_row_subtotal',
      align: 'right' as const,
      render: (v: number) => <Text type="danger" strong>-{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
    },
  ];

  const historyColumns = [
    {
      title: t('vendorSettlements.historyColumns.settlementId'),
      dataIndex: 'id',
      render: (id: string) => <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: '13px' }}>#{id.substring(0, 8).toUpperCase()}</Tag>
    },
    {
      title: t('vendorSettlements.historyColumns.dateFinalized'),
      dataIndex: 'created_at',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: t('vendorSettlements.historyColumns.totalBatchCost'),
      dataIndex: 'total_batch_cost',
      align: 'right' as const,
      render: (v: number) => <Text strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
    },
    {
      title: t('vendorSettlements.historyColumns.amountPaidTotal'),
      dataIndex: 'amount_paid_total',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a' }} strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
    },
    {
      title: t('vendorSettlements.historyColumns.remainingDebt'),
      dataIndex: 'remaining_debt',
      align: 'right' as const,
      render: (v: number) => Number(v) > 0
        ? <Text type="danger" strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
        : <Text type="secondary">0.00 {t('common:units.etb')}</Text>
    },
    {
      title: t('common:fields.status'),
      dataIndex: 'payment_status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'FULL') return <Tag color="success" style={{ fontWeight: 600 }}>{t('common:status.fullyPaid')}</Tag>;
        if (status === 'PARTIAL') return <Tag color="warning" style={{ fontWeight: 600 }}>{t('common:status.partial')}</Tag>;
        return <Tag color="error" style={{ fontWeight: 600 }}>{t('common:status.unpaid')}</Tag>;
      }
    },
    {
      title: t('vendorSettlements.historyColumns.voucher'),
      key: 'print_action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintHistoryRow(record)}>
          {t('common:actions.print')}
        </Button>
      )
    }
  ];

  // --- 🌟 SIMPLIFIED AUDIT EXPANSION: FULL WIDTH PAYMENT HISTORIES ONLY 🌟 ---
  const expandedRowRender = (record: any) => {
    const installmentColumns = [
      {
        title: t('vendorSettlements.installments.paidAt'),
        dataIndex: 'paid_at',
        render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm')
      },
      {
        title: t('vendorSettlements.installments.cashHandedOver'),
        dataIndex: 'amount_handed_over',
        align: 'right' as const,
        render: (v: any) => <Text strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text>
      },
      {
        title: t('vendorSettlements.installments.advanceCreated'),
        dataIndex: 'advance_amount_created',
        align: 'right' as const,
        render: (v: any) => Number(v) > 0 ? <Text type="success" strong>+{Number(v).toFixed(2)} {t('common:units.etb')}</Text> : <Text type="secondary">0.00</Text>
      },
      {
        title: t('vendorSettlements.installments.advanceSpent'),
        dataIndex: 'advance_used_from_past',
        align: 'right' as const,
        render: (v: any) => Number(v) > 0 ? <Text type="warning" strong>-{Number(v).toFixed(2)} {t('common:units.etb')}</Text> : <Text type="secondary">0.00</Text>
      },
    ];

    return (
      <div style={{ padding: '16px 24px', background: '#fafafa', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
        <div style={{ marginBottom: '10px', fontWeight: 600, color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarCircleOutlined style={{ color: '#714B67' }} /> {t('vendorSettlements.installments.title')}
        </div>
        <Table 
          columns={installmentColumns} 
          dataSource={record.installments || []} 
          rowKey="id" 
          pagination={false} 
          size="small" 
          bordered
        />
      </div>
    );
  };

  const filteredHistory = historicalSettlements.filter(item => {
    if (statusFilter !== 'ALL' && item.payment_status !== statusFilter) return false;
    if (historySearchQuery && !item.id.toLowerCase().includes(historySearchQuery.toLowerCase())) return false;
    return true;
  });

  const aggregateTotalCost = filteredHistory.reduce((acc, curr) => acc + Number(curr.total_batch_cost), 0);
  const aggregateTotalDebt = filteredHistory.reduce((acc, curr) => acc + Number(curr.remaining_debt), 0);

  // Gross Batch Cost and Net Balance Due are always shown; Advance and Deductions only when non-zero
  const visibleStatCount = 2
    + (worksheetData && worksheetData.available_past_advance > 0 ? 1 : 0)
    + (worksheetData && worksheetData.total_quality_deductions > 0 ? 1 : 0);
  const statSpan = 24 / visibleStatCount;

  const getTabButtonStyle = (tabKey: string) => {
    const isActive = activeTab === tabKey;
    return {
      padding: '8px 20px',
      fontSize: '14px',
      fontWeight: 500,
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      backgroundColor: isActive ? '#714B67' : '#ffffff',
      color: isActive ? '#ffffff' : '#444444',
      border: isActive ? '1px solid #714B67' : '1px solid #d9d9d9',
      boxShadow: isActive ? '0 2px 4px rgba(113, 75, 103, 0.15)' : 'none',
      marginRight: '12px'
    };
  };

  return (
    <div style={{ maxWidth: '1250px', margin: '0 auto', padding: '24px' }}>
      <div>
        <Title level={2} style={{ color: '#714B67', marginBottom: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          {t('vendorSettlements.title')}
        </Title>

        {/* --- CUSTOM NAVIGATION TAB BUTTON LINKS --- */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('1')} style={getTabButtonStyle('1')}>
            <FileTextOutlined /> {t('vendorSettlements.tabs.statement')}
          </button>
          <button onClick={() => setActiveTab('2')} style={getTabButtonStyle('2')}>
            <HistoryOutlined /> {t('vendorSettlements.tabs.history')}
          </button>
          <button onClick={() => setActiveTab('3')} style={getTabButtonStyle('3')}>
            <TruckOutlined /> {t('vendorSettlements.tabs.delivery')}
          </button>
        </div>
      </div>

      <div style={{ paddingBottom: '32px' }}>
        {/* --- TAB 1: STATEMENT WORKSPACE WORKSHEET --- */}
        {activeTab === '1' && (
          <div>
            <Card bordered={false} style={{ background: '#fcfcfc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f0f0f0' }}>
              <Row gutter={24} align="bottom">
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('common:fields.vendor')}</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('vendorSettlements.selectVendorPlaceholder')}
                    value={selectedVendor}
                    onChange={(val: string | null) => setSelectedVendor(val)}
                    size="large"
                  >
                    {vendors.map(v => <Option key={v.id} value={v.id}>{v.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} md={10}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('vendorSettlements.dateSelectionWindowLabel')}</div>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={dateRange}
                    onChange={(dates: any) => setDateRange(dates || null)}
                    size="large"
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleGenerateStatement}
                    loading={loading}
                    block
                    size="large"
                    style={{ backgroundColor: '#714B67', borderColor: '#714B67', borderRadius: '6px', fontWeight: 500 }}
                  >
                    {t('vendorSettlements.generateWorksheetBtn')}
                  </Button>
                </Col>
              </Row>
            </Card>

            {worksheetData ? (
              <div>
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={statSpan}>
                    <Card bordered={false} style={{ background: '#f9f9f9', textAlign: 'center', borderRadius: '8px', border: '1px solid #eee' }}>
                      <Statistic title={t('vendorSettlements.stats.grossBatchCost')} value={worksheetData.calculated_batch_cost} precision={2} suffix={t('common:units.etb')} valueStyle={{ fontWeight: 'bold', color: '#444' }} />
                    </Card>
                  </Col>
                  <Col span={statSpan} hidden={worksheetData.total_quality_deductions <= 0}>
                    <Card bordered={false} style={{ background: '#fff7e6', textAlign: 'center', borderRadius: '8px', border: '1px solid #ffd591' }}>
                      <Statistic title={t('vendorSettlements.stats.qualityDeductions')} value={worksheetData.total_quality_deductions} precision={2} suffix={t('common:units.etb')} valueStyle={{ fontWeight: 'bold', color: '#d46b08' }} prefix="-" />
                    </Card>
                  </Col>
                  <Col span={statSpan} hidden={worksheetData.available_past_advance <= 0}>
                    <Card bordered={false} style={{ background: '#fff1f0', textAlign: 'center', borderRadius: '8px', border: '1px solid #ffa39e' }}>
                      <Statistic title={t('vendorSettlements.stats.pastAdvance')} value={worksheetData.available_past_advance} precision={2} suffix={t('common:units.etb')} valueStyle={{ fontWeight: 'bold', color: '#cf1322' }} />
                    </Card>
                  </Col>
                  <Col span={statSpan}>
                    <Card bordered={false} style={{ background: '#f6ffed', textAlign: 'center', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                      <Statistic title={t('vendorSettlements.stats.netBalanceDue')} value={worksheetData.net_balance_due} precision={2} suffix={t('common:units.etb')} valueStyle={{ fontWeight: 'bold', color: '#3f8600' }} />
                    </Card>
                  </Col>
                </Row>

                {worksheetData.itemized_deductions.length > 0 && (
                  <Card
                    title={<span><WarningOutlined style={{ color: '#d46b08' }} /> {t('vendorSettlements.deductionsAppliedTitle')}</span>}
                    bodyStyle={{ padding: 0 }}
                    style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #ffd591' }}
                  >
                    <Table
                      dataSource={worksheetData.itemized_deductions}
                      rowKey="id"
                      pagination={false}
                      size="middle"
                      columns={deductionColumns}
                    />
                    <div style={{ padding: '10px 16px', background: '#fffbe6', color: '#874d00', fontSize: '12px' }}>
                      {t('vendorSettlements.deductionsAppliedNote')}
                    </div>
                  </Card>
                )}

                <Row gutter={24}>
                  <Col lg={16} xs={24}>
                    <Card title={t('vendorSettlements.unpaidDeliveriesTitle')} bodyStyle={{ padding: 0 }} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                      <Table
                        dataSource={worksheetData.itemized_deliveries}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        columns={columns}
                      />
                    </Card>
                  </Col>

                  <Col lg={8} xs={24}>
                    <Card title={t('vendorSettlements.reconciliationTitle')} style={{ borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('vendorSettlements.actualCashHandedLabel', { unit: t('common:units.etb') })}</div>
                      <InputNumber
                        style={{ width: '100%', marginBottom: 16 }}
                        size="large"
                        min={0}
                        value={amountHandedOver}
                        onChange={(val: number | null) => setAmountHandedOver(val || 0)}
                      />

                      {amountHandedOver > worksheetData.net_balance_due && (
                        <Tag color="blue" style={{ width: '100%', padding: '10px', marginBottom: 16, whiteSpace: 'normal', borderRadius: '4px' }}>
                          <InfoCircleOutlined />{' '}
                          <Trans
                            t={t}
                            i18nKey="vendorSettlements.advanceCreditNotice"
                            values={{ amount: (amountHandedOver - worksheetData.net_balance_due).toFixed(2), unit: t('common:units.etb') }}
                            components={{ b: <b /> }}
                          />
                        </Tag>
                      )}

                      <Button
                        type="primary"
                        block
                        size="large"
                        icon={<CheckCircleOutlined />}
                        onClick={handlePostSettlement}
                        loading={loading}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '6px', height: '45px', fontWeight: 600 }}
                      >
                        {t('vendorSettlements.postSettlementBtn')}
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                <InfoCircleOutlined style={{ fontSize: '32px', marginBottom: '16px', color: '#714B67' }} />
                <div style={{ color: '#666', fontSize: '16px' }}>{t('vendorSettlements.emptyStatement')}</div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: AUDIT PAYMENT HISTORY LOG LEDGER --- */}
        {activeTab === '2' && (
          <div>
            <Card bordered={false} style={{ background: '#fcfcfc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f0f0f0' }}>
              <Row gutter={24} align="middle">
                <Col xs={24} md={10}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('vendorSettlements.selectVendorProfileLabel')}</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('vendorSettlements.chooseVendorPlaceholder')}
                    value={selectedVendor}
                    onChange={(val: string | null) => setSelectedVendor(val)}
                    size="large"
                  >
                    {vendors.map(v => <Option key={v.id} value={v.id}>{v.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} md={14} style={{ textAlign: 'right', marginTop: '24px' }}>
                  <Space size="middle">
                    <Text type="secondary" strong>{t('vendorSettlements.lifecycleVolumeLabel')} <Text style={{ color: '#444' }}>{aggregateTotalCost.toFixed(2)} {t('common:units.etb')}</Text></Text>
                    <Text type="secondary" strong>{t('vendorSettlements.totalUnresolvedDebtLabel')} <Text type="danger">{aggregateTotalDebt.toFixed(2)} {t('common:units.etb')}</Text></Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {selectedVendor ? (
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>{t('vendorSettlements.historicalBatchesTitle')}</span>
                    <Space size="middle">
                      <Input
                        placeholder={t('vendorSettlements.searchSettlementPlaceholder')}
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={historySearchQuery}
                        onChange={e => setHistorySearchQuery(e.target.value)}
                        allowClear
                        size="small"
                        style={{ width: '220px' }}
                      />
                      <Radio.Group value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
                        <Radio.Button value="ALL">{t('vendorSettlements.filterAll')}</Radio.Button>
                        <Radio.Button value="PARTIAL">{t('common:status.partial')}</Radio.Button>
                        <Radio.Button value="FULL">{t('common:status.fullyPaid')}</Radio.Button>
                      </Radio.Group>
                    </Space>
                  </div>
                }
                bodyStyle={{ padding: 0 }}
                style={{ borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden' }}
              >
                <Table
                  dataSource={filteredHistory}
                  columns={historyColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                  scroll={{ x: 'max-content' }}
                  expandable={{
                    expandedRowRender,
                    expandIcon: ({ expanded, onExpand, record }) =>
                      expanded ? (
                        <DownOutlined style={{ transition: 'transform 0.2s', transform: 'rotate(180deg)' }} onClick={e => onExpand(record, e)} />
                      ) : (
                        <DownOutlined style={{ transition: 'transform 0.2s' }} onClick={e => onExpand(record, e)} />
                      )
                  }}
                />
              </Card>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', border: '1px dashed #d9d9d9', borderRadius: '8px' }}>
                <HistoryOutlined style={{ fontSize: '32px', marginBottom: '16px', color: '#714B67' }} />
                <div style={{ color: '#666', fontSize: '16px' }}>{t('vendorSettlements.emptyHistory')}</div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: VENDOR DELIVERY REPORT --- */}
        {activeTab === '3' && (
          <div>
            <Card bordered={false} style={{ background: '#fcfcfc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f0f0f0' }}>
              <Row gutter={24} align="bottom">
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('common:fields.vendor')}</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('vendorSettlements.selectVendorSimplePlaceholder')}
                    value={deliveryVendor}
                    onChange={(val: string | null) => setDeliveryVendor(val)}
                    size="large"
                  >
                    {vendors.map(v => <Option key={v.id} value={v.id}>{v.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} md={10}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{t('vendorSettlements.dateRangeLabel')}</div>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={deliveryDateRange}
                    onChange={(dates: any) => setDeliveryDateRange(dates || null)}
                    size="large"
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleGenerateDeliveryReport}
                    loading={deliveryLoading}
                    block
                    size="large"
                    style={{ backgroundColor: '#714B67', borderColor: '#714B67', borderRadius: '6px', fontWeight: 500 }}
                  >
                    {t('vendorSettlements.generateReportBtn')}
                  </Button>
                </Col>
              </Row>
            </Card>

            {deliveryRows.length > 0 ? (
              <Card
                title={t('vendorSettlements.deliveriesAcrossBranchesTitle')}
                extra={
                  <Space size="middle">
                    <Input
                      placeholder={t('vendorSettlements.searchDeliveryPlaceholder')}
                      prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                      value={deliverySearchQuery}
                      onChange={e => setDeliverySearchQuery(e.target.value)}
                      allowClear
                      size="small"
                      style={{ width: '240px' }}
                    />
                    <Button icon={<PrinterOutlined />} onClick={() => handlePrintDeliveryReport()}>
                      {t('vendorSettlements.printReportBtn')}
                    </Button>
                  </Space>
                }
                bodyStyle={{ padding: 0 }}
                style={{ borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden' }}
              >
                <Table
                  dataSource={deliveryRows.filter(r => {
                    const q = deliverySearchQuery.toLowerCase();
                    return (r.branch_name || '').toLowerCase().includes(q) || (r.product_name || '').toLowerCase().includes(q);
                  })}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  scroll={{ x: 'max-content' }}
                  columns={[
                    { title: t('common:fields.date'), dataIndex: 'date_received', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
                    { title: t('common:fields.branch'), dataIndex: 'branch_name', render: (val: string) => <Tag color="blue">{val}</Tag> },
                    { title: t('common:fields.product'), dataIndex: 'product_name' },
                    { title: t('common:units.packs'), dataIndex: 'packs_received', align: 'right' as const },
                    { title: t('common:units.pieces'), dataIndex: 'calculated_pieces_count', align: 'right' as const },
                    { title: t('vendorSettlements.unitPriceLabel'), dataIndex: 'buying_price_unit', align: 'right' as const, render: (v: number) => `${Number(v).toFixed(2)} ${t('common:units.etb')}` },
                    { title: t('vendorSettlements.subtotalLabel'), dataIndex: 'calculated_row_subtotal', align: 'right' as const, render: (v: number) => <Text strong>{Number(v).toFixed(2)} {t('common:units.etb')}</Text> },
                  ]}
                />
              </Card>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', border: '1px dashed #d9d9d9', borderRadius: '8px' }}>
                <TruckOutlined style={{ fontSize: '32px', marginBottom: '16px', color: '#714B67' }} />
                <div style={{ color: '#666', fontSize: '16px' }}>{t('vendorSettlements.emptyDelivery')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- SETTLEMENT POSTED CONFIRMATION MODAL WITH PRINTABLE VOUCHER --- */}
      <Modal
        title={t('vendorSettlements.postedModal.title')}
        open={showVoucherModal}
        onCancel={handleCloseVoucherModal}
        width={800}
        footer={[
          <Button key="close" onClick={handleCloseVoucherModal}>{t('common:actions.close')}</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintVoucher()} style={{ background: '#714B67', borderColor: '#714B67' }}>
            {t('vendorSettlements.postedModal.printBtn')}
          </Button>
        ]}
      >
        {printSettlement && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #eee' }}>
            <VendorSettlementVoucher
              ref={voucherPrintRef}
              settlement={printSettlement}
              vendor={vendors.find(v => v.id === printSettlement.vendor)}
            />
          </div>
        )}
      </Modal>

      {/* --- HIDDEN PRINT TARGET FOR HISTORY REPRINTS (no preview modal) --- */}
      {!showVoucherModal && printSettlement && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <VendorSettlementVoucher
            ref={voucherPrintRef}
            settlement={printSettlement}
            vendor={vendors.find(v => v.id === printSettlement.vendor)}
          />
        </div>
      )}

      {/* --- HIDDEN PRINT TARGET FOR DELIVERY REPORT --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <VendorDeliveryReport
          ref={deliveryReportPrintRef}
          vendorName={vendors.find(v => v.id === deliveryVendor)?.name || 'N/A'}
          dateFrom={deliveryDateRange ? deliveryDateRange[0].format('YYYY-MM-DD') : ''}
          dateTo={deliveryDateRange ? deliveryDateRange[1].format('YYYY-MM-DD') : ''}
          rows={deliveryRows}
        />
      </div>
    </div>
  );
};

export default VendorSettlements;