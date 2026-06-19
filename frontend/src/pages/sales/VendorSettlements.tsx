import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Select, DatePicker, Button, Table, 
  Tag, InputNumber, Statistic, message, Typography, Space, Radio
} from 'antd';
import { 
  FileTextOutlined, HistoryOutlined, SearchOutlined, 
  CheckCircleOutlined, InfoCircleOutlined, DownOutlined, 
  DollarCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryService } from '../../services/inventoryService';
import { salesService } from '../../services/salesService';

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

interface WorksheetPayload {
  vendor_id: string;
  calculated_batch_cost: number;
  available_past_advance: number;
  net_balance_due: number;
  itemized_deliveries: DeliveryLog[];
}

export const VendorSettlements: React.FC = () => {
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
      message.error("Failed to load vendors registry");
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
      message.error("Failed to sync vendor's master history log file");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatement = async () => {
    if (!selectedVendor || !dateRange) {
      return message.warning('Please select both a vendor node and a date range configuration');
    }
    setLoading(true);
    try {
      const startStr = dateRange[0].format('YYYY-MM-DD');
      const endStr = dateRange[1].format('YYYY-MM-DD');
      
      const res = await salesService.getStatementWorksheet(selectedVendor, startStr, endStr);
      setWorksheetData(res.data);
      setAmountHandedOver(res.data.net_balance_due); 
      message.success('Statement worksheet metrics compiled successfully.');
    } catch (err) {
      message.error('Error computing statement worksheet profiles.');
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
      
      await salesService.createSettlement({
        vendor_id: selectedVendor,
        supply_log_ids: supplyLogIds,
        amount_handed_over: amountHandedOver
      });
      
      message.success('Vendor settlement processed and logged successfully!');
      
      setWorksheetData(null);
      setSelectedVendor(null);
      setDateRange(null);
      setAmountHandedOver(0);
    } catch (err) {
      message.error('Failed to submit settlement entry validation');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      title: 'Date Received', 
      dataIndex: 'date_received', 
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') 
    },
    { 
      title: 'Product', 
      dataIndex: 'product_name', 
    },
    { 
      title: 'Packs Rec.', 
      dataIndex: 'packs_received', 
      align: 'right' as const,
      render: (v: number) => <Text strong>{v} Packs</Text>
    },
    { 
      title: 'Converted Pieces', 
      dataIndex: 'calculated_pieces_count', 
      align: 'right' as const,
    },
    { 
      title: 'Unit Buy Price', 
      dataIndex: 'buying_price_unit', 
      align: 'right' as const, 
      render: (v: number) => `${Number(v).toFixed(2)} ETB`
    },
    { 
      title: 'Subtotal Cost', 
      dataIndex: 'calculated_row_subtotal', 
      align: 'right' as const, 
      render: (v: number) => <Text type="danger" strong>{Number(v).toFixed(2)} ETB</Text>
    },
  ];

  const historyColumns = [
    {
      title: 'Settlement ID Reference',
      dataIndex: 'id',
      render: (id: string) => <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: '13px' }}>#{id.substring(0, 8).toUpperCase()}</Tag>
    },
    {
      title: 'Date Finalized',
      dataIndex: 'created_at',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Total Batch Cost',
      dataIndex: 'total_batch_cost',
      align: 'right' as const,
      render: (v: number) => <Text strong>{Number(v).toFixed(2)} ETB</Text>
    },
    {
      title: 'Amount Paid Total',
      dataIndex: 'amount_paid_total',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a' }} strong>{Number(v).toFixed(2)} ETB</Text>
    },
    {
      title: 'Remaining Debt',
      dataIndex: 'remaining_debt',
      align: 'right' as const,
      render: (v: number) => Number(v) > 0 
        ? <Text type="danger" strong>{Number(v).toFixed(2)} ETB</Text>
        : <Text type="secondary">0.00 ETB</Text>
    },
    {
      title: 'Payment Status',
      dataIndex: 'payment_status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'FULL') return <Tag color="success" style={{ fontWeight: 600 }}>FULLY PAID</Tag>;
        if (status === 'PARTIAL') return <Tag color="warning" style={{ fontWeight: 600 }}>PARTIALLY PAID</Tag>;
        return <Tag color="error" style={{ fontWeight: 600 }}>UNPAID</Tag>;
      }
    }
  ];

  // --- 🌟 SIMPLIFIED AUDIT EXPANSION: FULL WIDTH PAYMENT HISTORIES ONLY 🌟 ---
  const expandedRowRender = (record: any) => {
    const installmentColumns = [
      { 
        title: 'Paid At Timestamp', 
        dataIndex: 'paid_at', 
        render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') 
      },
      { 
        title: 'Physical Cash Handed Over', 
        dataIndex: 'amount_handed_over', 
        align: 'right' as const, 
        render: (v: any) => <Text strong>{Number(v).toFixed(2)} ETB</Text> 
      },
      { 
        title: 'Advance Surplus Created', 
        dataIndex: 'advance_amount_created', 
        align: 'right' as const, 
        render: (v: any) => Number(v) > 0 ? <Text type="success" strong>+{Number(v).toFixed(2)} ETB</Text> : <Text type="secondary">0.00</Text> 
      },
      { 
        title: 'Advance Spent From Past', 
        dataIndex: 'advance_used_from_past', 
        align: 'right' as const, 
        render: (v: any) => Number(v) > 0 ? <Text type="warning" strong>-{Number(v).toFixed(2)} ETB</Text> : <Text type="secondary">0.00</Text> 
      },
    ];

    return (
      <div style={{ padding: '16px 24px', background: '#fafafa', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
        <div style={{ marginBottom: '10px', fontWeight: 600, color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarCircleOutlined style={{ color: '#714B67' }} /> Payout Installment Audit Trail Log
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
    if (statusFilter === 'ALL') return true;
    return item.payment_status === statusFilter;
  });

  const aggregateTotalCost = filteredHistory.reduce((acc, curr) => acc + Number(curr.total_batch_cost), 0);
  const aggregateTotalDebt = filteredHistory.reduce((acc, curr) => acc + Number(curr.remaining_debt), 0);

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
    <div style={{ maxWidth: '1250px', margin: '0 auto', padding: '24px', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0 }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Wholesale Vendor Settlements Hub
        </Title>
        
        {/* --- CUSTOM NAVIGATION TAB BUTTON LINKS --- */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('1')} style={getTabButtonStyle('1')}>
            <FileTextOutlined /> Vendor Statements Workspace
          </button>
          <button onClick={() => setActiveTab('2')} style={getTabButtonStyle('2')}>
            <HistoryOutlined /> Payment History Log
          </button>
        </div>
      </div>

      {/* --- SCROLLING ROUTER VIEW CONTAINER BLOCK --- */}
      <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '32px' }}>
        {/* --- TAB 1: STATEMENT WORKSPACE WORKSHEET --- */}
        {activeTab === '1' && (
          <div>
            <Card bordered={false} style={{ background: '#fcfcfc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f0f0f0' }}>
              <Row gutter={24} align="bottom">
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>Vendor</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Select Target Location / Vendor Node"
                    value={selectedVendor}
                    onChange={(val: string | null) => setSelectedVendor(val)}
                    size="large"
                  >
                    {vendors.map(v => <Option key={v.id} value={v.id}>{v.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} md={10}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>Date Selection Window</div>
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
                    Generate Worksheet
                  </Button>
                </Col>
              </Row>
            </Card>

            {worksheetData ? (
              <div>
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={8}>
                    <Card bordered={false} style={{ background: '#f9f9f9', textAlign: 'center', borderRadius: '8px', border: '1px solid #eee' }}>
                      <Statistic title="Calculated Gross Batch Cost" value={worksheetData.calculated_batch_cost} precision={2} suffix="ETB" valueStyle={{ fontWeight: 'bold', color: '#444' }} />
                    </Card>
                  </Col>
                  <Col span={8} hidden={worksheetData.available_past_advance <= 0}>
                    <Card bordered={false} style={{ background: '#fff1f0', textAlign: 'center', borderRadius: '8px', border: '1px solid #ffa39e' }}>
                      <Statistic title="Applied Past Advance Credits" value={worksheetData.available_past_advance} precision={2} suffix="ETB" valueStyle={{ fontWeight: 'bold', color: '#cf1322' }} />
                    </Card>
                  </Col>
                  <Col span={worksheetData.available_past_advance > 0 ? 8 : 16}>
                    <Card bordered={false} style={{ background: '#f6ffed', textAlign: 'center', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                      <Statistic title="Net Balance Due Now" value={worksheetData.net_balance_due} precision={2} suffix="ETB" valueStyle={{ fontWeight: 'bold', color: '#3f8600' }} />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col lg={16} xs={24}>
                    <Card title="Unpaid Delivery Log Rows Found" bodyStyle={{ padding: 0 }} style={{ borderRadius: '8px', overflow: 'hidden' }}>
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
                    <Card title="Reconciliation Posting" style={{ borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>Actual Cash Handed Over (ETB):</div>
                      <InputNumber
                        style={{ width: '100%', marginBottom: 16 }}
                        size="large"
                        min={0}
                        value={amountHandedOver}
                        onChange={(val: number | null) => setAmountHandedOver(val || 0)}
                      />

                      {amountHandedOver > worksheetData.net_balance_due && (
                        <Tag color="blue" style={{ width: '100%', padding: '10px', marginBottom: 16, whiteSpace: 'normal', borderRadius: '4px' }}>
                          <InfoCircleOutlined /> An extra <b>{(amountHandedOver - worksheetData.net_balance_due).toFixed(2)} ETB</b> will be allocated as an advance credit for future supply cycles.
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
                        Post & Save Settlement
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                <InfoCircleOutlined style={{ fontSize: '32px', marginBottom: '16px', color: '#714B67' }} />
                <div style={{ color: '#666', fontSize: '16px' }}>Select both vendor and date interval to load the active statement worksheet.</div>
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
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>Select Targeted Vendor Profile</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Choose wholesale vendor node..."
                    value={selectedVendor}
                    onChange={(val: string | null) => setSelectedVendor(val)}
                    size="large"
                  >
                    {vendors.map(v => <Option key={v.id} value={v.id}>{v.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} md={14} style={{ textAlign: 'right', marginTop: '24px' }}>
                  <Space size="middle">
                    <Text type="secondary" strong>Lifecycle Volume: <Text style={{ color: '#444' }}>{aggregateTotalCost.toFixed(2)} ETB</Text></Text>
                    <Text type="secondary" strong>Total Unresolved Debt: <Text type="danger">{aggregateTotalDebt.toFixed(2)} ETB</Text></Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {selectedVendor ? (
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>Historical Locked Settlement Batches</span>
                    <Radio.Group value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
                      <Radio.Button value="ALL">ALL REC.</Radio.Button>
                      <Radio.Button value="PARTIAL">PARTIALLY PAID</Radio.Button>
                      <Radio.Button value="FULL">FULLY PAID</Radio.Button>
                    </Radio.Group>
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
                <div style={{ color: '#666', fontSize: '16px' }}>Select a target vendor from the menu pool to pull historical cash settlement statements.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorSettlements;