import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, InputNumber, Button, Card, Typography, DatePicker, 
  Select, Space, message, Divider, Tabs, Input, Row, Col, Empty, Alert, Badge,
  Modal, Form 
} from 'antd';
import { 
  CalculatorOutlined, CheckCircleOutlined, ReloadOutlined, 
  WalletOutlined, ShoppingOutlined, UserAddOutlined, 
  PlusOutlined, DeleteOutlined, BankOutlined, DollarOutlined,
  EnvironmentOutlined, SafetyCertificateOutlined,
  AuditOutlined, MobileOutlined, UserOutlined, ContactsOutlined, SearchOutlined,
  RiseOutlined, EditOutlined, PrinterOutlined
} from '@ant-design/icons';
import axios from 'axios'; // <-- FIXED: Added missing import cleanly
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { salesService } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import DailySessionReport from '../../components/print/DailySessionReport';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;

// --- CONTAINER FOR THE TABBED LISTS ---
const scrollBoxStyle: React.CSSProperties = {
  padding: '15px',
  background: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '12px',
  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)',
  marginBottom: '10px'
};

const DailySessionWorksheet: React.FC = () => {
  const { t } = useTranslation('sales');
  const { isAdmin } = useAuth();
  const { assignedBranches, selectedBranch, setSelectedBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [printSession, setPrintSession] = useState<any | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const sessionPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintSession = useReactToPrint({ contentRef: sessionPrintRef, documentTitle: 'Daily Session Report' });
  const [activeSubView, setActiveSubView] = useState<'worksheet' | 'debts' | 'credits'>('worksheet');
  const [searchParams] = useSearchParams();
  // Look at the top of DailySessionWorksheet, adjust activeSubView declaration:
  // const [activeSubView, setActiveSubView] = useState<'worksheet' | 'debts' | 'credits' | 'history'>('worksheet');

  // --- MASTER DROPDOWN POOL STATES ---
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  
  // --- DEBTS SEARCH INPUT STATE ---
  const [debtLedgerSearchQuery, setDebtLedgerSearchQuery] = useState('');
  
  // Inline Creation Temp States
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // --- ADMIN DEBT ADJUSTMENT LEDGER MODAL STATES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDebtorRecord, setSelectedDebtorRecord] = useState<any | null>(null);
  const [adjustedBalanceValue, setAdjustedBalanceValue] = useState<number>(0);
  const [updatingBalance, setUpdatingBalance] = useState(false);
  
  // --- CORE RUNTIME STATE ---
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [worksheetData, setWorksheetData] = useState<any[]>([]);
  
  // --- CHRONOLOGICAL FLOAT SEEDING STATE ---
  const [openingCashFloat, setOpeningCashFloat] = useState<number>(0);

  // --- FORM DATA ARRAYS ---
  const [expenses, setExpenses] = useState<{reason: string, amount: number}[]>([]);
  const [creditsIssued, setCreditsIssued] = useState<{customer_id: string, amount: number}[]>([]);
  const [creditPayments, setCreditPayments] = useState<{customer_id: string, amount: number}[]>([]);
  const [digitalBalances, setDigitalBalances] = useState<{account_id: string, balance: number}[]>([]);
  const [manualDeposits, setManualDeposits] = useState<{amount: number, bank: string, account_name: string}[]>([]);

  // Physical Cash drawer allocations
  const [cashToAdmin, setCashToAdmin] = useState<number>(0);
  const [cashForChange, setCashForChange] = useState<number>(0);

  useEffect(() => {
    const urlBranch = searchParams.get('branch');
    const urlDate = searchParams.get('date');

    if (urlBranch) setSelectedBranch(urlBranch);
    if (urlDate) setSelectedDate(dayjs(urlDate));

    // If both exist in the URL parameters, automatically trigger the worksheet loader
    if (urlBranch && urlDate) {
      // Small timeout ensures the states are committed before firing the compilation engine
      setTimeout(() => {
        loadWorksheet();
      }, 300);
    }
  }, [searchParams]);

  // Safe Context Populator with Runtime Crash Defenses
  const forceRefreshCustomerRegistry = () => {
    if (!selectedBranch) return;
    salesService.getCustomerCredits(selectedBranch, '', false)
      .then(res => {
        if (res && res.data) {
          setAvailableCustomers(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Customer database register is unpopulated."));
  };

  useEffect(() => {
    if (!selectedBranch) return;

    setAvailableAccounts([]);
    setAvailableCustomers([]);

    salesService.getDigitalAccounts(selectedBranch)
      .then(res => {
        if (res && res.data) {
          setAvailableAccounts(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Digital profiles are empty for this branch."));

    forceRefreshCustomerRegistry();
  }, [selectedBranch]);

  // Safer Search API hook to avoid breaking layout state engines
  const fetchCustomerPool = (searchString: string) => {
    if (!selectedBranch) return;
    salesService.getCustomerCredits(selectedBranch, searchString, false)
      .then(res => {
        if (res && res.data) {
          setAvailableCustomers(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Failed to complete remote string filter."));
  };

  // --- 2. INLINE CUSTOMER CREATION LOGIC ---
  const handleInlineCustomerCreate = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return message.warning(t('dailySession.messages.nameRequired'));
    if (!selectedBranch) return message.error(t('dailySession.messages.branchRequired'));

    setCreatingCustomer(true);
    try {
      const response = await salesService.createCustomer({
        customer_name: newCustomerName.trim(),
        branch: selectedBranch,
        total_balance: 0
      });

      message.success(t('dailySession.messages.customerRegistered', { name: newCustomerName }));

      const freshCustomer = response.data;
      setAvailableCustomers([...availableCustomers, freshCustomer]);
      setNewCustomerName('');
    } catch (err) {
      message.error(t('dailySession.messages.customerRegisterFailed'));
    } finally {
      setCreatingCustomer(false);
    }
  };

  // --- 3. ADMINISTRATIVE DEBT OVERRIDE WORKER ROUTINE ---
  const openDirectBalanceAdjustment = (record: any) => {
    setSelectedDebtorRecord(record);
    setAdjustedBalanceValue(Number(record.total_balance));
    setIsEditModalOpen(true);
  };

  const handleExecuteBalanceAdjustment = async () => {
    if (!selectedDebtorRecord) return;
    setUpdatingBalance(true);
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(`http://localhost:8000/api/sales/customer-credits/${selectedDebtorRecord.id}/`, 
        { total_balance: adjustedBalanceValue },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      message.success(t('dailySession.messages.balanceUpdated', { name: selectedDebtorRecord.customer_name, amount: adjustedBalanceValue, unit: t('common:units.etb') }));
      setIsEditModalOpen(false);
      forceRefreshCustomerRegistry();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('dailySession.messages.balanceUpdateFailed');
      message.error(errorMsg);
    } finally {
      setUpdatingBalance(false);
    }
  };

  // --- 4. WORKSHEET STAGING CONTROLLERS ---
  const loadWorksheet = async () => {
    if (!selectedBranch) return message.warning(t('dailySession.messages.selectBranchFirst'));
    setLoading(true);
    try {
      const res = await salesService.prepareWorksheet(selectedBranch, selectedDate.format('YYYY-MM-DD'));

      if (res && res.data) {
        const productList = Array.isArray(res.data.products) ? res.data.products : [];
        const dynamicFloat = typeof res.data.opening_cash_float === 'number' ? res.data.opening_cash_float : 0;

        setWorksheetData(productList.map((item: any) => ({ ...item, closing_balance: null })));
        setOpeningCashFloat(dynamicFloat);
        message.success(t('dailySession.messages.worksheetCompiled'));
      } else {
        throw new Error("Empty response object structure.");
      }
    } catch (e) {
      message.error(t('dailySession.messages.worksheetLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // --- COMPREHENSIVE LIVE POSITION CALCULATOR SYSTEM ---
  const calculateTotalSalesLive = (): number => {
    return worksheetData.reduce((runningSum, record) => {
      if (record.closing_balance === null || record.closing_balance === undefined) return runningSum;
      const piecesSold = record.opening_balance - record.closing_balance;
      const rowRevenue = piecesSold > 0 ? piecesSold * (record.unit_price || 0) : 0;
      return runningSum + rowRevenue;
    }, 0);
  };

  const calculateNetDrawerCashLive = (): number => {
    const grossSalesRevenue = calculateTotalSalesLive();
    const startingDrawerLiquidity = openingCashFloat;

    const aggregatedExpensesOut = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const aggregatedNewDebtsGiven = creditsIssued.reduce((sum, item) => sum + (item.amount || 0), 0);
    const aggregatedCreditRecovered = creditPayments.reduce((sum, item) => sum + (item.amount || 0), 0);

    const aggregatedDigitalHandoversDelta = digitalBalances.reduce((sum, item) => {
      const matchedAccountMaster = availableAccounts.find(acc => acc.id === item.account_id);
      const virtualYesterdayBaseBalance = matchedAccountMaster ? (matchedAccountMaster.last_closing_balance ?? 0) : 0;
      const liveDeltaShift = item.balance ? (item.balance - virtualYesterdayBaseBalance) : 0;
      return sum + liveDeltaShift;
    }, 0);

    const aggregatedManualSlips = manualDeposits.reduce((sum, item) => sum + (item.amount || 0), 0);
    const physicalCashOut = cashToAdmin + cashForChange;

    return (
      startingDrawerLiquidity
      + grossSalesRevenue 
      - aggregatedExpensesOut 
      - aggregatedNewDebtsGiven 
      + aggregatedCreditRecovered 
      - aggregatedDigitalHandoversDelta 
      - aggregatedManualSlips
      - physicalCashOut
    );
  };

  const addExpense = () => setExpenses([{ reason: '', amount: 0 }, ...expenses]);
  const addCreditIssued = () => setCreditsIssued([{ customer_id: '', amount: 0 }, ...creditsIssued]);
  const addCreditPayment = () => setCreditPayments([{ customer_id: '', amount: 0 }, ...creditPayments]);
  const addDigital = () => setDigitalBalances([{ account_id: '', balance: 0 }, ...digitalBalances]);
  const addDeposit = () => setManualDeposits([{ amount: 0, bank: '', account_name: '' }, ...manualDeposits]);

  const removeExpense = (index: number) => setExpenses(expenses.filter((_, i) => i !== index));
  const removeCreditIssued = (index: number) => setCreditsIssued(creditsIssued.filter((_, i) => i !== index));
  const removeCreditPayment = (index: number) => setCreditPayments(creditPayments.filter((_, i) => i !== index));

  // --- FILTERED DEBT CUSTOMERS POOL ---
  const getFilteredDebtLedgerData = () => {
    if (!debtLedgerSearchQuery.trim()) return availableCustomers;
    return availableCustomers.filter(customer => 
      customer.customer_name?.toLowerCase().includes(debtLedgerSearchQuery.toLowerCase())
    );
  };

  // --- 5. DATA TRANSMISSION ---
  const submitAll = async () => {
    if (worksheetData.length === 0) return message.error(t('dailySession.messages.noActiveSession'));
    if (worksheetData.some(item => item.closing_balance === null)) {
      return message.error(t('dailySession.messages.countsRequired'));
    }

    setLoading(true);
    try {
      const payload = {
        branch: selectedBranch ?? undefined,
        trading_date: selectedDate.format('YYYY-MM-DD'),
        digital_balances: digitalBalances.filter(d => d.account_id !== ''),
        manual_deposits: manualDeposits.filter(m => m.amount > 0),
        physical_cash_handed_to_admin: cashToAdmin,
        cash_retained_for_change: cashForChange,
        products: worksheetData,
        expenses: expenses.filter(e => e.reason !== ''),
        credits: creditsIssued.filter(c => c.customer_id !== ''),
        credit_payments: creditPayments.filter(p => p.customer_id !== '') 
      };
      
      const res = await salesService.submitDailySession(payload);
      message.success(t('dailySession.messages.submitSuccess'));

      const sessionId = res.data?.session_id;
      if (sessionId) {
        const detailRes = await salesService.getDailySessionDetail(sessionId);
        setPrintSession(detailRes.data);
        setShowSessionModal(true);
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      message.error(t('dailySession.messages.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSessionModal = () => {
    setShowSessionModal(false);
    window.location.reload();
  };

  const netCashValue = calculateNetDrawerCashLive();
  const isNetNegative = netCashValue < 0;

  // --- FIXED: Explicitly typed as any[] to resolve signature assignment layout errors ---
  const baseDebtLedgerColumns: any[] = [
    { title: t('dailySession.debtsLedger.columns.customerName'), dataIndex: 'customer_name', key: 'name', render: (val: string) => <Text strong>{val}</Text> },
    { title: t('dailySession.debtsLedger.columns.outstandingDebt', { unit: t('common:units.etb') }), dataIndex: 'total_balance', key: 'balance', render: (v: number) => <Text type={v > 0 ? "danger" : "success"} code>{Number(v).toFixed(2)} {t('common:units.etb')}</Text> },
    { title: t('dailySession.debtsLedger.columns.lastUpdate'), dataIndex: 'last_updated', key: 'updated', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') }
  ];

  if (isAdmin) {
    baseDebtLedgerColumns.push({
      title: t('dailySession.debtsLedger.columns.adminOptions'),
      key: 'actions_panel_override',
      align: 'center',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          ghost
          icon={<EditOutlined />}
          onClick={() => openDirectBalanceAdjustment(record)}
          size="middle"
        >
          {t('dailySession.debtsLedger.adjustBalance')}
        </Button>
      )
    });
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ADVANCE SUB-NAVIGATION MENUS BOX */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Button 
          type={activeSubView === 'worksheet' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('worksheet')}
          icon={<CalculatorOutlined />}
          style={activeSubView === 'worksheet' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          {t('dailySession.subNav.worksheet')}
        </Button>
        <Button
          type={activeSubView === 'debts' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('debts')}
          icon={<UserOutlined />}
          style={activeSubView === 'debts' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          {t('dailySession.subNav.debts')}
        </Button>
        {/* <Button 
          type={activeSubView === 'credits' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('credits')}
          icon={<ContactsOutlined />}
          style={activeSubView === 'credits' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          Advance: Credits Balance
        </Button> */}
      </div>

      {/* VIEW RENDER CONDITIONS BLOCK */}
      {activeSubView === 'debts' && (
        <Card title={t('dailySession.debtsLedger.cardTitle')}>
          <Alert message={t('dailySession.debtsLedger.alertMessage')} type="info" showIcon style={{marginBottom: 20}} />

          <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('dailySession.debtsLedger.searchPlaceholder')}
              allowClear
              size="large"
              value={debtLedgerSearchQuery}
              onChange={(e) => setDebtLedgerSearchQuery(e.target.value)}
            />
          </div>

          <Table
            dataSource={getFilteredDebtLedgerData()}
            rowKey="id"
            columns={baseDebtLedgerColumns}
            scroll={{ x: 'max-content' }}
          />

          <Modal
            title={<span><EditOutlined style={{ marginRight: 8, color: '#714B67' }} /> {t('dailySession.debtsLedger.editModal.title')}</span>}
            open={isEditModalOpen}
            onOk={handleExecuteBalanceAdjustment}
            confirmLoading={updatingBalance}
            onCancel={() => setIsEditModalOpen(false)}
            okText={t('dailySession.debtsLedger.editModal.okText')}
            okButtonProps={{ style: { background: '#714B67', borderColor: '#714B67' } }}
            destroyOnClose
          >
            {selectedDebtorRecord && (
              <div style={{ padding: '10px 0' }}>
                <Alert
                  message={t('dailySession.debtsLedger.editModal.warningTitle')}
                  description={t('dailySession.debtsLedger.editModal.warningDesc')}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
                <Form layout="vertical">
                  <Form.Item label={t('dailySession.debtsLedger.editModal.customerLabel')}>
                    <Input value={selectedDebtorRecord.customer_name} disabled size="large" />
                  </Form.Item>
                  <Form.Item label={t('dailySession.debtsLedger.editModal.newBalanceLabel', { unit: t('common:units.etb') })} required>
                    <InputNumber
                      style={{ width: '100%' }}
                      size="large"
                      min={0}
                      value={adjustedBalanceValue}
                      onChange={(v) => setAdjustedBalanceValue(v === null ? 0 : Number(v))}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}
          </Modal>
        </Card>
      )}

      {activeSubView === 'credits' && (
        <Card title={t('dailySession.creditsView.cardTitle')}>
          <Alert message={t('dailySession.creditsView.alertMessage')} type="success" showIcon style={{marginBottom: 20}} />
          <Empty description={t('dailySession.creditsView.emptyDescription')} />
        </Card>
      )}

      {activeSubView === 'worksheet' && (
        <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '10px' }}>
            <Title level={2} style={{ color: '#714B67', margin: 0 }}><AuditOutlined /> {t('dailySession.title')}</Title>

            <Space size="middle" style={{ flexWrap: 'wrap' }}>
              <div style={{
                background: '#fcfcfc',
                border: '1px solid #e8e8e8',
                padding: '8px 18px',
                borderRadius: '8px',
                textAlign: 'right'
              }}>
                <Text style={{ color: '#888', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('dailySession.grossSalesLabel')}</Text>
                <Text style={{ color: '#444', fontSize: '16px', fontWeight: 'bold' }}>{calculateTotalSalesLive().toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
              </div>

              <div style={{
                background: isNetNegative ? '#fff1f0' : '#f6ffed',
                border: isNetNegative ? '1px solid #ffa39e' : '1px solid #b7eb8f',
                padding: '10px 24px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                textAlign: 'right',
                transition: 'all 0.3s ease'
              }}>
                <Text style={{ color: isNetNegative ? '#cf1322' : '#389e0d', fontSize: '12px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('dailySession.netCashLabel')}
                </Text>
                <Text style={{ color: isNetNegative ? '#cf1322' : '#389e0d', fontSize: '22px', fontWeight: 'bold' }}>
                  {netCashValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}
                </Text>
              </div>
            </Space>
          </div>
          <Divider />

          <div style={{ background: '#fcfcfc', border: '1px solid #f0f0f0', padding: '25px', borderRadius: '12px', marginBottom: 35 }}>
              <Row gutter={24} align="bottom">
                  <Col span={9}>
                      <Text strong style={{ fontSize: '13px', color: '#888' }}><EnvironmentOutlined /> {t('common:fields.branch')}</Text>
                      {assignedBranches.length > 1 ? (
                          <Select
                            value={selectedBranch}
                            style={{ width: '100%' }}
                            size="large"
                            placeholder={t('dailySession.selectBranchPlaceholder')}
                            onChange={(val) => setSelectedBranch(val)}
                          >
                            {assignedBranches.map(b => (
                              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                            ))}
                          </Select>
                      ) : (
                          <div style={{ padding: '10px 15px', background: '#fff', border: '1px solid #d9d9d9', borderRadius: '8px', fontWeight: 'bold', color: '#714B67' }}>
                              <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                              {assignedBranches[0]?.name || t('dailySession.assignedBranchFallback')}
                          </div>
                      )}
                  </Col>
                  <Col span={7}>
                      <Text strong style={{ fontSize: '13px', color: '#888' }}>{t('common:fields.date')}</Text>
                      <DatePicker value={selectedDate} size="large" onChange={(d) => d && setSelectedDate(d)} style={{ width: '100%' }} />
                  </Col>
                  <Col span={8}>
                      <Button type="primary" icon={<ReloadOutlined />} onClick={loadWorksheet} loading={loading} size="large" block style={{ background: '#714B67', border: 'none', height: '44px' }}>
                          {t('dailySession.generateWorksheetBtn')}
                      </Button>
                  </Col>
              </Row>
          </div>

          <Tabs defaultActiveKey="1" type="card" size="large">
            <Tabs.TabPane tab={<span><ShoppingOutlined /> {t('dailySession.tabs.stockCount')}</span>} key="1">
              <div style={scrollBoxStyle}>
                  <Table
                    dataSource={worksheetData}
                    pagination={false}
                    rowKey="product_id"
                    bordered
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('dailySession.stockCount.emptyText') }}
                    columns={[
                      { title: t('dailySession.stockCount.columns.product'), dataIndex: 'product_name', render: (val) => <Text strong style={{ color: '#714B67' }}>{val}</Text> },
                      { title: t('dailySession.stockCount.columns.openingBalance'), dataIndex: 'opening_balance', render: (v) => <Text code>{v} {t('common:units.pieces')}</Text> },
                      { title: t('dailySession.stockCount.columns.closingCount'), render: (_, rec) => (
                          <InputNumber min={0} max={rec.opening_balance} size="large" value={rec.closing_balance} style={{ width: '100%' }} onChange={(v) => {
                              const newData = [...worksheetData];
                              const idx = newData.findIndex(i => i.product_id === rec.product_id);
                              if (idx !== -1) {
                                newData[idx].closing_balance = v === null ? null : Number(v);
                                setWorksheetData(newData);
                              }
                          }} />
                      )},
                      {
                        title: t('dailySession.stockCount.columns.piecesSold'),
                        key: 'sold_live_delta',
                        align: 'center',
                        render: (_, rec) => {
                          if (rec.closing_balance === null || rec.closing_balance === undefined) {
                            return <Text type="secondary" italic>{t('dailySession.awaitingInput')}</Text>;
                          }
                          const liveDeltaSold = rec.opening_balance - rec.closing_balance;
                          if (liveDeltaSold < 0) {
                            return <Badge count={t('dailySession.stockCount.overflow')} status="error" />;
                          }
                          return (
                            <Space direction="vertical" size={0}>
                              <Text strong style={{ color: liveDeltaSold > 0 ? '#52c41a' : '#999', fontSize: '15px' }}>
                                {liveDeltaSold} {t('common:units.pieces')}
                              </Text>
                              {liveDeltaSold > 0 && (
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  +{(liveDeltaSold * (rec.unit_price || 0)).toFixed(2)} {t('common:units.etb')}
                                </Text>
                              )}
                            </Space>
                          );
                        }
                      }
                  ]}/>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><WalletOutlined /> {t('dailySession.tabs.expenses')}</span>} key="2">
              <Button icon={<PlusOutlined />} onClick={addExpense} block size="large" style={{ marginBottom: 15 }}>{t('dailySession.expenses.addLine')}</Button>
              <div style={scrollBoxStyle}>
                  {expenses.length === 0 ? <Empty description={t('dailySession.expenses.emptyText')} /> : expenses.map((exp, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}><Input placeholder={t('common:fields.reason')} size="large" value={exp.reason} onChange={e => {
                              const n = [...expenses]; n[idx].reason = e.target.value; setExpenses(n);
                          }}/></Col>
                          <Col span={8}><InputNumber placeholder={t('common:fields.amount')} size="large" style={{width:'100%'}} value={exp.amount} onChange={v => {
                              const n = [...expenses]; n[idx].amount = v === null ? 0 : Number(v); setExpenses(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeExpense(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><UserAddOutlined /> {t('dailySession.tabs.newDebts')}</span>} key="3">
              <Button icon={<PlusOutlined />} onClick={addCreditIssued} block size="large" style={{ marginBottom: 15 }}>{t('dailySession.newDebts.addLine')}</Button>
              <div style={scrollBoxStyle}>
                  {creditsIssued.length === 0 ? <Empty description={t('dailySession.newDebts.emptyText')} /> : creditsIssued.map((crd, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}>
                              <Select
                                  showSearch
                                  placeholder={t('dailySession.newDebts.selectCustomerPlaceholder')}
                                  size="large"
                                  style={{ width: '100%' }}
                                  filterOption={false}
                                  onSearch={fetchCustomerPool}
                                  value={crd.customer_id || undefined}
                                  onChange={(val) => {
                                      const n = [...creditsIssued]; n[idx].customer_id = val; setCreditsIssued(n);
                                  }}
                                  dropdownRender={menu => (
                                    <div>
                                      {menu}
                                      <Divider style={{ margin: '4px 0' }} />
                                      <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                                        <Input
                                          style={{ flex: 'auto' }}
                                          size="middle"
                                          placeholder={t('dailySession.newDebts.newCustomerNamePlaceholder')}
                                          value={newCustomerName}
                                          onChange={e => setNewCustomerName(e.target.value)}
                                        />
                                        <Button
                                          type="link"
                                          icon={<PlusOutlined />}
                                          loading={creatingCustomer}
                                          onClick={handleInlineCustomerCreate}
                                        >
                                          {t('common:actions.create')}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                              >
                                  {availableCustomers.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.customer_name} {t('dailySession.newDebts.balanceSuffix', { amount: Number(c.total_balance).toFixed(0), unit: t('common:units.etb') })}</Select.Option>
                                  ))}
                              </Select>
                          </Col>
                          <Col span={8}><InputNumber placeholder={t('common:fields.amount')} size="large" style={{width:'100%'}} value={crd.amount} onChange={v => {
                              const n = [...creditsIssued]; n[idx].amount = v === null ? 0 : Number(v); setCreditsIssued(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeCreditIssued(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><DollarOutlined /> {t('dailySession.tabs.creditRecovery')}</span>} key="4">
              <Button icon={<PlusOutlined />} onClick={addCreditPayment} block size="large" style={{ marginBottom: 15, borderColor: '#52c41a', color: '#52c41a' }}>{t('dailySession.creditRecovery.addLine')}</Button>
              <div style={scrollBoxStyle}>
                  {creditPayments.length === 0 ? <Empty description={t('dailySession.creditRecovery.emptyText')} /> : creditPayments.map((pay, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}>
                              <Select
                                  showSearch
                                  placeholder={t('dailySession.creditRecovery.selectCustomerPlaceholder')}
                                  size="large"
                                  style={{ width: '100%' }}
                                  filterOption={false}
                                  onSearch={fetchCustomerPool}
                                  value={pay.customer_id || undefined}
                                  onChange={(val) => {
                                      const n = [...creditPayments]; n[idx].customer_id = val; setCreditPayments(n);
                                  }}
                              >
                                  {availableCustomers.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.customer_name} {t('dailySession.creditRecovery.owesSuffix', { amount: Number(c.total_balance).toFixed(0), unit: t('common:units.etb') })}</Select.Option>
                                  ))}
                              </Select>
                          </Col>
                          <Col span={8}><InputNumber placeholder={t('dailySession.creditRecovery.amountPaidPlaceholder')} size="large" style={{width:'100%'}} value={pay.amount} onChange={v => {
                              const n = [...creditPayments]; n[idx].amount = v === null ? 0 : Number(v); setCreditPayments(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeCreditPayment(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><BankOutlined /> {t('dailySession.tabs.finalHandover')}</span>} key="5">
              <div style={scrollBoxStyle}>
                  <Row gutter={[20, 20]}>
                    <Col span={24}>
                        <Card title={<Space><MobileOutlined /> {t('dailySession.finalHandover.digitalBalancesTitle')}</Space>} headStyle={{ background: '#f0f5ff' }}>
                            <Button icon={<PlusOutlined />} onClick={addDigital} style={{ marginBottom: 15 }} block>{t('dailySession.finalHandover.addDigitalEntry')}</Button>
                            {digitalBalances.map((d, idx) => {
                                const matchedAccountMaster = availableAccounts.find(acc => acc.id === d.account_id);
                                const yesterdayBaseBalance = matchedAccountMaster ? (matchedAccountMaster.last_closing_balance ?? 0) : 0;
                                const adjustmentNotes = matchedAccountMaster ? (matchedAccountMaster.adjustment_reasons || 'None') : 'None';
                                const liveWalletShiftDelta = d.balance ? (d.balance - yesterdayBaseBalance) : 0;

                                return (
                                    <div key={idx} style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px dashed #f0f0f0' }}>
                                        <Row gutter={12} align="middle">
                                            <Col span={9}>
                                                <Select
                                                    placeholder={t('dailySession.finalHandover.selectWalletPlaceholder')}
                                                    style={{ width: '100%' }}
                                                    size="large" 
                                                    value={d.account_id || undefined}
                                                    onChange={(val) => { 
                                                        const n = [...digitalBalances]; 
                                                        n[idx].account_id = val; 
                                                        setDigitalBalances(n); 
                                                    }}
                                                >
                                                    {availableAccounts.map(acc => (
                                                      <Select.Option key={acc.id} value={acc.id}>{acc.name}</Select.Option>
                                                    ))}
                                                </Select>
                                            </Col>
                                            <Col span={8}>
                                                <InputNumber
                                                  placeholder={t('dailySession.finalHandover.currentBalancePlaceholder')}
                                                  size="large"
                                                  style={{ width: '100%' }} 
                                                  value={d.balance || undefined} 
                                                  onChange={v => { 
                                                      const n = [...digitalBalances]; 
                                                      n[idx].balance = v === null ? 0 : Number(v); 
                                                      setDigitalBalances(n); 
                                                  }}
                                                />
                                            </Col>
                                            
                                            <Col span={5} style={{ textAlign: 'center' }}>
                                                {d.account_id && d.balance ? (
                                                  <Space direction="vertical" size={0}>
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>{t('dailySession.finalHandover.expectedBase', { amount: yesterdayBaseBalance.toLocaleString(), unit: t('common:units.etb') })}</Text>
                                                    <Text strong style={{
                                                      color: liveWalletShiftDelta >= 0 ? '#52c41a' : '#f5222d',
                                                      fontSize: '14px'
                                                    }}>
                                                      {liveWalletShiftDelta >= 0 ? '+' : ''}{liveWalletShiftDelta.toLocaleString(undefined, {minimumFractionDigits: 2})} {t('common:units.etb')}
                                                    </Text>
                                                  </Space>
                                                ) : (
                                                  <Text type="secondary" italic style={{ fontSize: '12px' }}>{t('dailySession.awaitingInput')}</Text>
                                                )}
                                            </Col>
                                            
                                            <Col span={2}>
                                                <Button danger icon={<DeleteOutlined />} size="large" onClick={() => setDigitalBalances(digitalBalances.filter((_, i) => i !== idx))}/></Col>
                                        </Row>

                                        {d.account_id && adjustmentNotes !== "None" && (
                                          <div style={{ marginTop: '8px', background: '#fffbe6', padding: '6px 14px', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                                            <Text type="warning" style={{ fontSize: '11px' }}>
                                              <CalculatorOutlined style={{ marginRight: 4 }} />
                                              <b>{t('dailySession.finalHandover.adminAdjustmentsLabel')}</b> {adjustmentNotes}
                                            </Text>
                                          </div>
                                        )}
                                    </div>
                                );
                            })}
                        </Card>
                    </Col>

                      <Col span={24}>
                          <Card title={<Space><WalletOutlined /> {t('dailySession.finalHandover.physicalCashTitle')}</Space>} headStyle={{ background: '#f6ffed' }}>
                              {openingCashFloat > 0 && (
                                <div style={{ marginBottom: '15px' }}>
                                  <Alert
                                    message={
                                      <Text strong style={{ color: '#389e0d' }}>
                                        <RiseOutlined /> {t('dailySession.finalHandover.rollForwardTitle')}
                                      </Text>
                                    }
                                    description={t('dailySession.finalHandover.rollForwardDesc', { amount: openingCashFloat.toLocaleString('en-US', { minimumFractionDigits: 2 }), unit: t('common:units.etb') })}
                                    type="success"
                                    showIcon
                                  />
                               </div>
                              )}
                              <Row gutter={20}>
                                  <Col span={12}>
                                      <Text strong>{t('dailySession.finalHandover.cashToAdminLabel')}</Text>
                                      <InputNumber
                                        style={{width:'100%', marginTop: 8}}
                                        size="large"
                                        value={cashToAdmin || undefined}
                                        onChange={v => setCashToAdmin(v === null ? 0 : Number(v))}
                                      />
                                  </Col>
                                  <Col span={12}>
                                      <Text strong>{t('dailySession.finalHandover.cashForChangeLabel')}</Text>
                                      <InputNumber
                                        style={{width:'100%', marginTop: 8}}
                                        size="large"
                                        value={cashForChange || undefined}
                                        onChange={v => setCashForChange(v === null ? 0 : Number(v))}
                                      />
                                  </Col>
                              </Row>
                          </Card>
                      </Col>

                      <Col span={24}>
                          <Card title={<Space><PlusOutlined /> {t('dailySession.finalHandover.manualDepositsTitle')}</Space>} headStyle={{ background: '#fff7e6' }}>
                              <Button icon={<PlusOutlined />} onClick={addDeposit} style={{ marginBottom: 15 }} block>{t('dailySession.finalHandover.addDepositBtn')}</Button>
                              {manualDeposits.map((m, idx) => (
                                  <Row key={idx} gutter={10} style={{ marginBottom: 10 }}>
                                      <Col span={6}><InputNumber placeholder={t('dailySession.finalHandover.slipAmountPlaceholder')} size="large" style={{width:'100%'}} value={m.amount} onChange={v => { const n = [...manualDeposits]; n[idx].amount = v === null ? 0 : Number(v); setManualDeposits(n); }}/></Col>
                                      <Col span={8}><Input placeholder={t('dailySession.finalHandover.bankNamePlaceholder')} size="large" value={m.bank} onChange={e => { const n = [...manualDeposits]; n[idx].bank = e.target.value; setManualDeposits(n); }}/></Col>
                                      <Col span={8}><Input placeholder={t('dailySession.finalHandover.beneficiaryNamePlaceholder')} size="large" value={m.account_name} onChange={e => { const n = [...manualDeposits]; n[idx].account_name = e.target.value; setManualDeposits(n); }}/></Col>
                                      <Col span={2}><Button danger icon={<DeleteOutlined />} size="large" onClick={() => setManualDeposits(manualDeposits.filter((_, i) => i !== idx))}/></Col>
                                  </Row>
                              ))}
                          </Card>
                      </Col>
                  </Row>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30, marginBottom: 10 }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<CheckCircleOutlined />}
                      style={{
                        height: '48px',
                        padding: '0 32px',
                        background: '#714B67',
                        border: 'none',
                        fontSize: '16px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 10px rgba(113, 75, 103, 0.2)'
                      }}
                      onClick={submitAll}
                      loading={loading}
                    >
                      {t('dailySession.finalHandover.finalizeBtn')}
                    </Button>
                  </div>
              
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      )}

      <Modal
        title={t('dailySession.sessionModal.title')}
        open={showSessionModal}
        onCancel={handleCloseSessionModal}
        width={900}
        footer={[
          <Button key="done" type="primary" onClick={handleCloseSessionModal} style={{ background: '#714B67', borderColor: '#714B67' }}>
            {t('dailySession.sessionModal.doneBtn')}
          </Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={() => handlePrintSession()}>
            {t('dailySession.sessionModal.printBtn')}
          </Button>
        ]}
      >
        {printSession && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #eee' }}>
            <DailySessionReport ref={sessionPrintRef} session={printSession} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DailySessionWorksheet;