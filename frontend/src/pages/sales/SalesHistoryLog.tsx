import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Typography, Button, Space, Input, Divider, Popconfirm, message, Tag, Modal, Descriptions, Row, Col } from 'antd';
import {
  SearchOutlined, CalendarOutlined, SafetyCertificateOutlined,
  DeleteOutlined, EditOutlined, HistoryOutlined, EyeOutlined,
  UserOutlined, CheckCircleOutlined, PrinterOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { salesService } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import DailySessionReport from '../../components/print/DailySessionReport';

const { Text, Title } = Typography;

const SalesHistoryLog: React.FC = () => {
  const { t } = useTranslation('sales');
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
      message.error(t('salesHistory.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessionsFromDatabase(); }, []);

  const handleDeleteSessionExecution = async (id: string) => {
    try {
      await salesService.deleteDailySession(id);
      message.success(t('salesHistory.messages.deleteSuccess'));
      loadSessionsFromDatabase();
    } catch (err) {
      message.error(t('salesHistory.messages.deleteFailed'));
    }
  };

  const handleEditRedirect = (record: any) => {
    // REDIRECT TARGET FIX: Routes explicitly to your workstation panel node URL path parameter bundle
    navigate(`/sales/daily-session?branch=${record.branch}&date=${record.trading_date}`);
    message.info(t('salesHistory.messages.editRedirectInfo', { branch: record.branch_name }));
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
          <HistoryOutlined /> {t('salesHistory.title')}
        </Title>
        <Text type="secondary">
          {t('salesHistory.subtitle')}
        </Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <Input
            size="large"
            placeholder={t('salesHistory.searchPlaceholder')}
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
              title: t('salesHistory.columns.tradingDate'),
              dataIndex: 'trading_date',
              key: 'trading_date',
              width: 130,
              render: (d) => <Text><CalendarOutlined /> {d}</Text>
            },
            {
              title: t('salesHistory.columns.branch'),
              dataIndex: 'branch_name',
              key: 'branch_name',
              render: (txt) => (
                <Text strong style={{ color: '#714B67' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} /> {txt || t('salesHistory.unknownLocation')}
                </Text>
              )
            },
            {
              title: t('salesHistory.columns.grossRevenue'),
              dataIndex: 'total_sales',
              key: 'total_sales',
              align: 'right',
              render: (val) => <Text strong>{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
            },
            {
              title: t('salesHistory.columns.expenses'),
              dataIndex: 'total_expenses',
              key: 'total_expenses',
              align: 'right',
              render: (val) => <Text type="danger">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
            },
            {
              title: t('salesHistory.columns.newCredits'),
              dataIndex: 'total_new_credit',
              key: 'total_new_credit',
              align: 'right',
              render: (val) => <Text type="warning">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
            },
            {
              title: t('salesHistory.columns.actions'),
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
                    {t('salesHistory.detailsBtn')}
                  </Button>

                  {user?.role === 'ADMIN' ? (
                    <>
                      <Button
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => handleEditRedirect(rec)}
                      >
                        {t('common:actions.edit')}
                      </Button>
                      <Popconfirm
                        title={t('salesHistory.deleteConfirm.title')}
                        description={t('salesHistory.deleteConfirm.desc')}
                        onConfirm={() => handleDeleteSessionExecution(rec.id)}
                        okText={t('salesHistory.deleteConfirm.okText')}
                        cancelText={t('common:actions.cancel')}
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                          {t('common:actions.delete')}
                        </Button>
                      </Popconfirm>
                    </>
                  ) : (
                    <Tag color="blue" style={{ fontWeight: 'bold' }}>{t('salesHistory.lockedTag')}</Tag>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* --- INLINE COMPREHENSIVE BREAKDOWN INSPECTION MODAL PANEL --- */}
      <Modal
        title={<span><HistoryOutlined style={{ marginRight: 8, color: '#714B67' }} /> {t('salesHistory.detailsModal.title')}</span>}
        open={isDetailsModalOpen}
        onCancel={() => setIsDetailsModalOpen(false)}
        footer={[
          <Button key="print_btn" icon={<PrinterOutlined />} onClick={() => handlePrintSession()}>
            {t('salesHistory.detailsModal.printBtn')}
          </Button>,
          <Button key="close_btn" type="primary" style={{ background: '#714B67', borderColor: '#714B67' }} onClick={() => setIsDetailsModalOpen(false)}>
            {t('salesHistory.detailsModal.closeBtn')}
          </Button>
        ]}
        width={950}
        style={{ top: 30 }}
        destroyOnClose
      >
        {activeInspectionRecord && (
          <div style={{ padding: '10px 0', maxHeight: '72vh', overflowY: 'auto', overflowX: 'hidden' }}>
            
            {/* CORE HEAD MASTER PARAMETERS */}
            <Descriptions title={t('salesHistory.detailsModal.coreSummaryTitle')} bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label={t('salesHistory.detailsModal.branchCluster')}>{activeInspectionRecord.branch_name}</Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.tradingSheetDate')}>{activeInspectionRecord.trading_date}</Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.cashSubmitted')}><Text strong style={{ color: '#714B67' }}>{Number(activeInspectionRecord.cash_handed_to_admin).toFixed(2)} {t('common:units.etb')}</Text></Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.floatLeft')}>{Number(activeInspectionRecord.cash_retained_for_change).toFixed(2)} {t('common:units.etb')}</Descriptions.Item>
            </Descriptions>

            {/* FINANCIAL SUMMARY MATRICES CONTROLLER BOX */}
            <Descriptions title={t('salesHistory.detailsModal.summaryMetricsTitle')} bordered column={2} size="small" style={{ marginBottom: 25 }}>
              <Descriptions.Item label={t('salesHistory.detailsModal.grossSales')} span={2}>
                <Text strong style={{ color: '#52c41a', fontSize: '15px' }}>{Number(activeInspectionRecord.total_sales).toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.totalExpenses')}><Text type="danger">{Number(activeInspectionRecord.total_expenses).toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}</Text></Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.totalNewDebts')}><Text type="warning">{Number(activeInspectionRecord.total_new_credit).toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}</Text></Descriptions.Item>
              <Descriptions.Item label={t('salesHistory.detailsModal.totalCreditRecovered')} span={2}><Text type="success" strong>{Number(activeInspectionRecord.total_credit_recovered).toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}</Text></Descriptions.Item>
            </Descriptions>

            {/* INLINE 1: STOCK COUNT INLINE DATA TABLE */}
            <Divider style={{ color: '#714B67', fontSize: '14px', margin: '15px 0' }}>{t('salesHistory.detailsModal.sections.stockCount')}</Divider>
            <Table
              dataSource={activeInspectionRecord.products_sold || []}
              rowKey={(rec: any) => rec.id || rec.product_name || Math.random().toString()}
              pagination={false}
              size="small"
              bordered
              locale={{ emptyText: t('salesHistory.detailsModal.stockCountEmpty') }}
              columns={[
                { title: t('salesHistory.detailsModal.columns.product'), dataIndex: 'product_name', render: (val) => <Text strong style={{ color: '#714B67' }}>{val}</Text> },
                { title: t('salesHistory.detailsModal.columns.opening'), dataIndex: 'opening', align: 'center', render: (v) => `${v} ${t('common:units.pieces')}` },
                { title: t('salesHistory.detailsModal.columns.closing'), dataIndex: 'closing', align: 'center', render: (v) => `${v} ${t('common:units.pieces')}` },
                { title: t('salesHistory.detailsModal.columns.piecesSold'), dataIndex: 'sold', align: 'center', render: (v) => <Text strong style={{ color: v > 0 ? '#52c41a' : '#999' }}>{v} {t('common:units.pieces')}</Text> },
                { title: t('salesHistory.detailsModal.columns.priceAtSale'), dataIndex: 'price_at_sale', align: 'right', render: (v) => `${Number(v).toFixed(2)} ${t('common:units.etb')}` },
                {
                  title: t('salesHistory.detailsModal.columns.subtotalRevenue'),
                  align: 'right',
                  render: (_: any, rec: any) => <Text strong>{(Number(rec.sold) * Number(rec.price_at_sale)).toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}</Text>
                }
              ]}
            />

            {/* INLINE 2 & 5: EXPENSES AND DIGITAL WALLETS GRID CONTAINER */}
            <Row gutter={16} style={{ marginTop: 25 }}>
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>{t('salesHistory.detailsModal.sections.expenses')}</Divider>
                <Table
                  dataSource={activeInspectionRecord.expenses_logged || []}
                  rowKey={(_, index) => index !== undefined ? index.toString() : Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: t('salesHistory.detailsModal.expensesEmpty') }}
                  columns={[
                    { title: t('salesHistory.detailsModal.columns.expenseReason'), dataIndex: 'reason', render: (val) => <Text code>{val}</Text> },
                    { title: t('salesHistory.detailsModal.columns.amountExpended'), dataIndex: 'amount', align: 'right' as const, render: (v) => <Text type="danger">{Number(v).toFixed(2)} {t('common:units.etb')}</Text> }
                  ]}
                />
              </Col>

              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>{t('salesHistory.detailsModal.sections.digitalChannels')}</Divider>
                <Table
                  dataSource={activeInspectionRecord.digital_balances || []}
                  rowKey={(rec: any) => rec.id || rec.account_name || Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: t('salesHistory.detailsModal.digitalEmpty') }}
                  columns={[
                    { title: t('salesHistory.detailsModal.columns.accountHandle'), dataIndex: 'account_name' },
                    { title: t('salesHistory.detailsModal.columns.endingBalance'), dataIndex: 'closing_balance', align: 'right' as const, render: (v) => `${Number(v).toFixed(2)} ${t('common:units.etb')}` },
                    { title: t('salesHistory.detailsModal.columns.revenueDelta'), dataIndex: 'revenue_delta', align: 'right' as const, render: (v) => <Text type={v >= 0 ? "success" : "danger"} strong>{v >= 0 ? '+' : ''}{Number(v).toFixed(2)} {t('common:units.etb')}</Text> }
                  ]}
                />
              </Col>
            </Row>

            {/* INLINE 3 & 4: DEBT ENTRIES AND CREDIT RECOVERIES GRID CONTAINER */}
            <Row gutter={16} style={{ marginTop: 25 }}>
              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>{t('salesHistory.detailsModal.sections.newDebts')}</Divider>
                  <Table
                    // --- DIRECT & UNFLATTENED DATASOURCE LINK ---
                    dataSource={activeInspectionRecord.credits_issued || []}
                    rowKey={(rec: any) => rec.id || Math.random().toString()}
                    pagination={false}
                    size="small"
                    bordered
                    locale={{ emptyText: t('salesHistory.detailsModal.newDebtsEmpty') }}
                    columns={[
                      {
                        title: t('salesHistory.detailsModal.columns.debtorProfile'),
                        render: (_, rec: any) => (
                          <Text strong>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {rec.customer_name || t('salesHistory.detailsModal.unknownCustomer')}
                          </Text>
                        )
                      },
                      {
                        title: t('salesHistory.detailsModal.columns.amountOwed'),
                        align: 'right' as const,
                        render: (_, rec: any) => (
                          <Text type="warning" strong>{Number(rec.amount || 0).toFixed(2)} {t('common:units.etb')}</Text>
                        )
                      }
                    ]}
                  />
              </Col>

              <Col span={12}>
                <Divider style={{ color: '#714B67', fontSize: '14px', margin: '10px 0' }}>{t('salesHistory.detailsModal.sections.creditRecoveries')}</Divider>
                <Table
                  dataSource={activeInspectionRecord.credit_payments || []}
                  rowKey={(_, index) => index !== undefined ? index.toString() : Math.random().toString()}
                  pagination={false}
                  size="small"
                  bordered
                  locale={{ emptyText: t('salesHistory.detailsModal.recoveriesEmpty') }}
                  columns={[
                    {
                      title: t('salesHistory.detailsModal.columns.payerProfile'),
                      render: (_: any, rec: any) => (
                        <Text strong>
                          <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                          {rec.customer_name || rec.customer || t('salesHistory.detailsModal.unknownAccount')}
                        </Text>
                      )
                    },
                    {
                      title: t('salesHistory.detailsModal.columns.cashRecovered'),
                      align: 'right' as const,
                      render: (_: any, rec: any) => {
                        const recoveryValue = rec.amount_paid !== undefined ? rec.amount_paid : (rec.amount !== undefined ? rec.amount : 0);
                        return <Text style={{ color: '#52c41a' }} strong>{Number(recoveryValue).toFixed(2)} {t('common:units.etb')}</Text>;
                      }
                    }
                  ]}
                />
              </Col>
            </Row>

            {/* --- ADDED SECTION 6: MANUAL PHYSICAL BANK DEPOSITS INLINE DATA ROW --- */}
            <Divider style={{ color: '#714B67', fontSize: '14px', margin: '25px 0 15px 0' }}>{t('salesHistory.detailsModal.sections.manualDeposits')}</Divider>
            <Table
              dataSource={activeInspectionRecord.manual_deposits || []}
              rowKey={(rec: any) => rec.id || Math.random().toString()}
              pagination={false}
              size="small"
              bordered
              locale={{ emptyText: t('salesHistory.detailsModal.manualDepositsEmpty') }}
              columns={[
                {
                  title: t('salesHistory.detailsModal.columns.bankName'),
                  dataIndex: 'bank_name',
                  key: 'bank_name',
                  render: (text) => <Text strong style={{ color: '#714B67' }}>{text || t('salesHistory.detailsModal.na')}</Text>
                },
                {
                  title: t('salesHistory.detailsModal.columns.accountHolder'),
                  dataIndex: 'account_name',
                  key: 'account_name',
                  render: (text) => <Text type="secondary">{text || t('salesHistory.detailsModal.na')}</Text>
                },
                {
                  title: t('salesHistory.detailsModal.columns.totalDeposited'),
                  dataIndex: 'amount',
                  key: 'amount',
                  align: 'right' as const,
                  render: (val) => <Text strong style={{ color: '#52c41a' }}>{Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
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