import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Typography, Button, Space, Input, Divider, Popconfirm, message, Tag, Modal, Descriptions, Row, Col } from 'antd';
import {
  SearchOutlined, CalendarOutlined, SafetyCertificateOutlined,
  DeleteOutlined, EditOutlined, HistoryOutlined, EyeOutlined,
  UserOutlined, CheckCircleOutlined, PrinterOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { salesService } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import DailySessionReport from '../../components/print/DailySessionReport';

const { Text, Title } = Typography;

const SalesHistoryLog: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- DETAILS MODAL CONTROLLER STATES ---
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeInspectionRecord, setActiveInspectionRecord] = useState<any | null>(null);

  const sessionPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintSession = useReactToPrint({ contentRef: sessionPrintRef, documentTitle: 'Daily Session Report' });

  const loadSessionsFromDatabase = async () => {
    setLoading(true);
    try {
      const res = await salesService.getDailySessions();
      setSessionsList(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (e) {
      message.error("Sync Failure: Could not load historical daily sessions registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessionsFromDatabase(); }, []);

  const handleDeleteSessionExecution = async (id: string) => {
    try {
      await salesService.deleteDailySession(id);
      message.success("Session completely wiped. The branch admin can now re-submit for this date.");
      loadSessionsFromDatabase(); 
    } catch (err) {
      message.error("Action Rejected: Database clearance permissions required.");
    }
  };

  const handleEditRedirect = (record: any) => {
    // REDIRECT TARGET FIX: Routes explicitly to your workstation panel node URL path parameter bundle
    navigate(`/sales/daily-session?branch=${record.branch}&date=${record.trading_date}`);
    message.info(`Staging parameters loaded for ${record.branch_name}. Hit 'Generate Worksheet' to proceed.`);
  };

  const openDetailsModalInspection = (record: any) => {
    setActiveInspectionRecord(record);
    setIsDetailsModalOpen(true);
  };

  const getFilteredSessions = () => {
    if (!searchQuery.trim()) return sessionsList;
    const q = searchQuery.toLowerCase();
    return sessionsList.filter(item => 
      item.branch_name?.toLowerCase().includes(q) || item.trading_date?.includes(q)
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <HistoryOutlined /> Closed Sales History Audit Journal
        </Title>
        <Text type="secondary">
          Review closed sub-branch daily settlement worksheets. Admins can view complete breakdowns, edit entries, or delete records to allow full re-submissions.
        </Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <Input
            size="large"
            placeholder="Search by branch location or date..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            allowClear
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Table
          dataSource={getFilteredSessions()}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Trading Date',
              dataIndex: 'trading_date',
              key: 'trading_date',
              width: 130,
              render: (d) => <Text><CalendarOutlined /> {d}</Text>
            },
            {
              title: 'Physical Branch Location Node',
              dataIndex: 'branch_name',
              key: 'branch_name',
              render: (txt) => (
                <Text strong style={{ color: '#714B67' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} /> {txt || 'Unknown Location'}
                </Text>
              )
            },
            {
              title: 'Gross Revenue Volume',
              dataIndex: 'total_sales',
              key: 'total_sales',
              align: 'right',
              render: (val) => <Text strong>{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
            },
            {
              title: 'Recorded Expenses',
              dataIndex: 'total_expenses',
              key: 'total_expenses',
              align: 'right',
              render: (val) => <Text type="danger">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
            },
            {
              title: 'New Credits Issued',
              dataIndex: 'total_new_credit',
              key: 'total_new_credit',
              align: 'right',
              render: (val) => <Text type="warning">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
            },
            {
              title: 'Operational Adjustments Logs',
              key: 'actions_panel_override',
              align: 'center',
              width: 320,
              render: (_, rec) => (
                <Space size="small">
                  {/* Read-only details inspection action tool accessible by everyone */}
                  <Button 
                    type="default" 
                    icon={<EyeOutlined />} 
                    onClick={() => openDetailsModalInspection(rec)}
                  >
                    Details
                  </Button>

                  {user?.role === 'ADMIN' ? (
                    <>
                      <Button 
                        type="primary" 
                        ghost 
                        icon={<EditOutlined />} 
                        onClick={() => handleEditRedirect(rec)}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title="Permanently Delete Session?"
                        description="This operation entirely drops this day's financial metrics and linked shortages out of the system. This cannot be undone. Proceed?"
                        onConfirm={() => handleDeleteSessionExecution(rec.id)}
                        okText="Yes, Delete Record"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                          Delete
                        </Button>
                      </Popconfirm>
                    </>
                  ) : (
                    <Tag color="blue" style={{ fontWeight: 'bold' }}>FINALIZED & LOCKED</Tag>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* --- INLINE COMPREHENSIVE BREAKDOWN INSPECTION MODAL PANEL --- */}
      <Modal
        title={<span><HistoryOutlined style={{ marginRight: 8, color: '#714B67' }} /> Complete Audit Settlement Breakdown</span>}
        open={isDetailsModalOpen}
        onCancel={() => setIsDetailsModalOpen(false)}
        footer={[
          <Button key="print_btn" icon={<PrinterOutlined />} onClick={() => handlePrintSession()}>
            Print Report
          </Button>,
          <Button key="close_btn" type="primary" style={{ background: '#714B67', borderColor: '#714B67' }} onClick={() => setIsDetailsModalOpen(false)}>
            Close Audit View
          </Button>
        ]}
        width={950}
        style={{ top: 30 }}
        destroyOnClose
      >
        {activeInspectionRecord && (
          <div style={{ padding: '10px 0', maxHeight: '72vh', overflowY: 'auto', overflowX: 'hidden' }}>
            
            {/* CORE HEAD MASTER PARAMETERS */}
            <Descriptions title="Core Summary Identifiers" bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Branch Cluster">{activeInspectionRecord.branch_name}</Descriptions.Item>
              <Descriptions.Item label="Trading Sheet Date">{activeInspectionRecord.trading_date}</Descriptions.Item>
              <Descriptions.Item label="Physical Cash Submitted"><Text strong style={{ color: '#714B67' }}>{Number(activeInspectionRecord.cash_handed_to_admin).toFixed(2)} ETB</Text></Descriptions.Item>
              <Descriptions.Item label="Float Left in Drawer">{Number(activeInspectionRecord.cash_retained_for_change).toFixed(2)} ETB</Descriptions.Item>
            </Descriptions>

            {/* FINANCIAL SUMMARY MATRICES CONTROLLER BOX */}
            <Descriptions title="Aggregated Summary Metrics Matrices" bordered column={2} size="small" style={{ marginBottom: 25 }}>
              <Descriptions.Item label="Gross Product Sales Volume" span={2}>
                <Text strong style={{ color: '#52c41a', fontSize: '15px' }}>{Number(activeInspectionRecord.total_sales).toLocaleString(undefined, {minimumFractionDigits: 2})} ETB</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Shift Store Expenses"><Text type="danger">{Number(activeInspectionRecord.total_expenses).toLocaleString(undefined, {minimumFractionDigits: 2})} ETB</Text></Descriptions.Item>
              <Descriptions.Item label="Total New Debts Granted"><Text type="warning">{Number(activeInspectionRecord.total_new_credit).toLocaleString(undefined, {minimumFractionDigits: 2})} ETB</Text></Descriptions.Item>
              <Descriptions.Item label="Total Customer Credit Recovered" span={2}><Text type="success" strong>{Number(activeInspectionRecord.total_credit_recovered).toLocaleString(undefined, {minimumFractionDigits: 2})} ETB</Text></Descriptions.Item>
            </Descriptions>

            {/* INLINE 1: STOCK COUNT INLINE DATA TABLE */}
            <Divider style={{ color: '#714B67', fontSize: '14px', margin: '15px 0' }}>1. Stock Count Inventory Inlines</Divider>
            <Table
              dataSource={activeInspectionRecord.products_sold || []}
              rowKey={(rec: any) => rec.id || rec.product_name || Math.random().toString()}
              pagination={false}
              size="small"
              bordered
              locale={{ emptyText: "No specific inventory modifications logged." }}
              columns={[
                { title: 'Product catalog profile', dataIndex: 'product_name', render: (t) => <Text strong style={{ color: '#714B67' }}>{t}</Text> },
                { title: 'A.M Balance (Open)', dataIndex: 'opening', align: 'center', render: (v) => `${v} Pcs` },
                { title: 'P.M Count (Closing)', dataIndex: 'closing', align: 'center', render: (v) => `${v} Pcs` },
                { title: 'Pieces Sold', dataIndex: 'sold', align: 'center', render: (v) => <Text strong style={{ color: v > 0 ? '#52c41a' : '#999' }}>{v} Pcs</Text> },
                { title: 'Price at Sale', dataIndex: 'price_at_sale', align: 'right', render: (v) => `${Number(v).toFixed(2)} ETB` },
                { 
                  title: 'Subtotal Revenue', 
                  align: 'right', 
                  render: (_: any, rec: any) => <Text strong>{(Number(rec.sold) * Number(rec.price_at_sale)).toLocaleString(undefined, {minimumFractionDigits: 2})} ETB</Text> 
                }
              ]}
            />

            {/* INLINE 2 & 5: EXPENSES AND DIGITAL WALLETS GRID CONTAINER */}
            <Row gutter={16} style={{ marginTop: 25 }}>
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>2. Operational Store Expenses</Divider>
                <Table
                  dataSource={activeInspectionRecord.expenses_logged || []}
                  rowKey={(_, index) => index !== undefined ? index.toString() : Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: "No company expenses recorded during this shift." }}
                  columns={[
                    { title: 'Expense Reason/Justification', dataIndex: 'reason', render: (t) => <Text code>{t}</Text> },
                    { title: 'Amount Expended', dataIndex: 'amount', align: 'right' as const, render: (v) => <Text type="danger">{Number(v).toFixed(2)} ETB</Text> }
                  ]}
                />
              </Col>
              
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>5. Digital Channels Revenue Balances</Divider>
                <Table
                  dataSource={activeInspectionRecord.digital_balances || []}
                  rowKey={(rec: any) => rec.id || rec.account_name || Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: "No bank or mobile money endpoints verified." }}
                  columns={[
                    { title: 'Account Handle', dataIndex: 'account_name' },
                    { title: 'Ending Balance', dataIndex: 'closing_balance', align: 'right' as const, render: (v) => `${Number(v).toFixed(2)} ETB` },
                    { title: 'Shift Revenue Delta', dataIndex: 'revenue_delta', align: 'right' as const, render: (v) => <Text type={v >= 0 ? "success" : "danger"} strong>{v >= 0 ? '+' : ''}{Number(v).toFixed(2)} ETB</Text> }
                  ]}
                />
              </Col>
            </Row>

            {/* INLINE 3 & 4: DEBT ENTRIES AND CREDIT RECOVERIES GRID CONTAINER */}
            <Row gutter={16} style={{ marginTop: 25 }}>
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>3. Items Taken on Credit (New Debts)</Divider>
                  <Table
                    // --- DIRECT & UNFLATTENED DATASOURCE LINK ---
                    dataSource={activeInspectionRecord.credits_issued || []}
                    rowKey={(rec: any) => rec.id || Math.random().toString()}
                    pagination={false}
                    size="small"
                    bordered
                    locale={{ emptyText: "No debtor invoices processed today." }}
                    columns={[
                      { 
                        title: 'Debtor Customer Profile', 
                        render: (_, rec: any) => (
                          <Text strong>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {rec.customer_name || "Unknown Customer"}
                          </Text>
                        )
                      },
                      { 
                        title: 'Amount Owed', 
                        align: 'right' as const, 
                        render: (_, rec: any) => (
                          <Text type="warning" strong>{Number(rec.amount || 0).toFixed(2)} ETB</Text>
                        )
                      }
                    ]}
                  />
              </Col>
              
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>4. Credit Recoveries (Repayments)</Divider>
                <Table
                  dataSource={activeInspectionRecord.credit_payments || []}
                  rowKey={(_, index) => index !== undefined ? index.toString() : Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: "No outstanding collection repayments retrieved." }}
                  columns={[
                    { 
                      title: 'Payer Customer Profile', 
                      render: (_: any, rec: any) => (
                        <Text strong>
                          <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                          {rec.customer_name || rec.customer || "Unknown Account"}
                        </Text>
                      )
                    },
                    { 
                      title: 'Cash Recovered', 
                      align: 'right' as const, 
                      render: (_: any, rec: any) => {
                        const recoveryValue = rec.amount_paid !== undefined ? rec.amount_paid : (rec.amount !== undefined ? rec.amount : 0);
                        return <Text style={{ color: '#52c41a' }} strong>{Number(recoveryValue).toFixed(2)} ETB</Text>;
                      }
                    }
                  ]}
                />
              </Col>
            </Row>

            {/* --- ADDED SECTION 6: MANUAL PHYSICAL BANK DEPOSITS INLINE DATA ROW --- */}
            <Divider style={{ color: '#714B67', fontSize: '14px', margin: '25px 0 15px 0' }}>6. Manual Physical Bank Deposits (Slips / Receipts)</Divider>
            <Table
              dataSource={activeInspectionRecord.manual_deposits || []}
              rowKey={(rec: any) => rec.id || Math.random().toString()}
              pagination={false}
              size="small"
              bordered
              locale={{ emptyText: "No manual physical bank deposit slips attached to this session ledger." }}
              columns={[
                { 
                  title: 'Bank Name', 
                  dataIndex: 'bank_name', 
                  key: 'bank_name',
                  render: (text) => <Text strong style={{ color: '#714B67' }}>{text || 'N/A'}</Text>
                },
                { 
                  title: 'Account Registered Name Holder', 
                  dataIndex: 'account_name', 
                  key: 'account_name',
                  render: (text) => <Text type="secondary">{text || 'N/A'}</Text>
                },
                { 
                  title: 'Total Value Deposited', 
                  dataIndex: 'amount', 
                  key: 'amount',
                  align: 'right' as const,
                  render: (val) => <Text strong style={{ color: '#52c41a' }}>{Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
                }
              ]}
            />

          </div>
        )}
      </Modal>

      {activeInspectionRecord && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <DailySessionReport ref={sessionPrintRef} session={activeInspectionRecord} />
        </div>
      )}
    </div>
  );
};

export default SalesHistoryLog;